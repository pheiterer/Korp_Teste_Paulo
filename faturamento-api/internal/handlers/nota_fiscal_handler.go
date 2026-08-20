package handlers

import (
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"faturamento-api/internal/cache"
	"faturamento-api/internal/domain"
	"faturamento-api/internal/messaging"
	"faturamento-api/internal/repository"

	"github.com/gin-gonic/gin"
)

type NotaFiscalHandler struct {
	repo     repository.NotaFiscalRepository
	rabbitMQ *messaging.RabbitMQService
	redis    *cache.RedisCacheService
}

func NewNotaFiscalHandler(repo repository.NotaFiscalRepository, rabbitMQ *messaging.RabbitMQService, redis *cache.RedisCacheService) *NotaFiscalHandler {
	return &NotaFiscalHandler{
		repo:     repo,
		rabbitMQ: rabbitMQ,
		redis:    redis,
	}
}

type CreateNotaFiscalRequest struct {
	NumeroSequencial int64                        `json:"numero_sequencial"`
	Itens            []CreateNotaFiscalItemRequest `json:"itens" binding:"required,min=1"`
}

type CreateNotaFiscalItemRequest struct {
	ProdutoID     int64   `json:"produto_id"`
	ProdutoIDAlt  int64   `json:"produtoId"`
	CodigoProduto string  `json:"codigo_produto"`
	CodigoAlt     string  `json:"codigoProduto"`
	Quantidade    int     `json:"quantidade" binding:"required,gt=0"`
	PrecoUnitario float64 `json:"preco_unitario"`
	PrecoAlt      float64 `json:"precoUnitario"`
}

// CreateNotaFiscalHandler lida com a criacao de uma nova Nota Fiscal com status inicial 'Aberta'.
// @Summary Criar Nota Fiscal
// @Description Cria uma nova Nota Fiscal no banco de dados com status 'Aberta'.
// @Tags Notas Fiscais
// @Accept json
// @Produce json
// @Param request body CreateNotaFiscalRequest true "Payload de Criacao da Nota Fiscal"
// @Success 201 {object} APIResponse
// @Failure 400 {object} APIResponse
// @Failure 500 {object} APIResponse
// @Router /api/v1/notas-fiscais [post]
func (h *NotaFiscalHandler) CreateNotaFiscalHandler(c *gin.Context) {
	var req CreateNotaFiscalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		SendError(c, http.StatusBadRequest, "INVALID_PAYLOAD", "Dados de requisicao invalidos", err.Error())
		return
	}

	// 1. Pre-validacao instantanea no Redis Cache
	if h.redis != nil && h.redis.IsConnected(c.Request.Context()) {
		var cacheErros []string
		for _, itemReq := range req.Itens {
			codigo := itemReq.CodigoProduto
			if codigo == "" {
				codigo = itemReq.CodigoAlt
			}
			prodID := itemReq.ProdutoID
			if prodID <= 0 {
				prodID = itemReq.ProdutoIDAlt
			}
			if codigo == "" && prodID > 0 {
				codigo = strconv.FormatInt(prodID, 10)
			}
			if codigo != "" {
				_, err := h.redis.GetProduto(c.Request.Context(), codigo)
				if errors.Is(err, cache.ErrProdutoNaoEncontradoNoCache) {
					cacheErros = append(cacheErros, "Produto '"+codigo+"' nao encontrado no cache de estoque (Redis)")
				}
			}
		}
		if len(cacheErros) > 0 {
			SendError(c, http.StatusBadRequest, "PRODUTO_NAO_ENCONTRADO_NO_CACHE", "Falha de validacao no cache: "+strings.Join(cacheErros, "; "))
			return
		}
	}

	if req.NumeroSequencial <= 0 {
		seq, err := h.repo.GetNextNumeroSequencial(c.Request.Context())
		if err != nil {
			req.NumeroSequencial = 1
		} else {
			req.NumeroSequencial = seq
		}
	}

	domainItens := make([]domain.NotaFiscalItem, len(req.Itens))
	for i, itemReq := range req.Itens {
		codigo := itemReq.CodigoProduto
		if codigo == "" {
			codigo = itemReq.CodigoAlt
		}
		prodID := itemReq.ProdutoID
		if prodID <= 0 {
			prodID = itemReq.ProdutoIDAlt
		}
		if codigo == "" && prodID > 0 {
			codigo = strconv.FormatInt(prodID, 10)
		}
		preco := itemReq.PrecoUnitario
		if preco == 0 && itemReq.PrecoAlt > 0 {
			preco = itemReq.PrecoAlt
		}
		domainItens[i] = domain.NotaFiscalItem{
			ProdutoID:     prodID,
			CodigoProduto: codigo,
			Quantidade:    itemReq.Quantidade,
			PrecoUnitario: preco,
		}
	}

	nota, err := domain.NewNotaFiscal(req.NumeroSequencial, domainItens)
	if err != nil {
		SendError(c, http.StatusBadRequest, "BUSINESS_RULE_VIOLATION", err.Error())
		return
	}

	if err := h.repo.Create(c.Request.Context(), nota); err != nil {
		SendError(c, http.StatusInternalServerError, "DB_ERROR", "Erro ao salvar nota fiscal no banco de dados", err.Error())
		return
	}

	slog.Info("Nota fiscal criada com sucesso",
		slog.String("uuid", nota.UUID),
		slog.Int64("numero_sequencial", nota.NumeroSequencial),
		slog.String("status", nota.Status),
		slog.Float64("valor_total", nota.ValorTotal),
	)

	SendSuccess(c, http.StatusCreated, nota)
}

// ImprimirNotaFiscalHandler valida o status 'Aberta', altera para 'Fechada' e publica o evento no RabbitMQ.
// @Summary Imprimir Nota Fiscal
// @Description Altera o status da Nota Fiscal para 'Fechada' e dispara o evento assincrono NotaFiscalEmitidaEvent para o RabbitMQ.
// @Tags Notas Fiscais
// @Produce json
// @Param id path string true "ID ou UUID da Nota Fiscal"
// @Success 200 {object} APIResponse
// @Failure 400 {object} APIResponse
// @Failure 404 {object} APIResponse
// @Failure 500 {object} APIResponse
// @Router /api/v1/notas-fiscais/{id}/imprimir [post]
func (h *NotaFiscalHandler) ImprimirNotaFiscalHandler(c *gin.Context) {
	idParam := c.Param("id")
	if idParam == "" {
		SendError(c, http.StatusBadRequest, "INVALID_ID", "ID da nota fiscal eh obrigatorio")
		return
	}

	ctx := c.Request.Context()
	var nota *domain.NotaFiscal
	var err error

	// Tenta buscar por ID numerico ou UUID string
	if idUint, parseErr := strconv.ParseUint(idParam, 10, 64); parseErr == nil {
		nota, err = h.repo.FindByID(ctx, uint(idUint))
	} else {
		nota, err = h.repo.FindByUUID(ctx, idParam)
	}

	if err != nil {
		if errors.Is(err, repository.ErrNotaFiscalNaoEncontrada) {
			SendError(c, http.StatusNotFound, "NOT_FOUND", "Nota fiscal nao encontrada")
			return
		}
		SendError(c, http.StatusInternalServerError, "DB_ERROR", "Erro ao consultar nota fiscal no banco", err.Error())
		return
	}

	// 1. Valida se a nota esta com status 'Aberta' antes de alterar para 'EmProcessamento'
	if err := nota.CanBePrinted(); err != nil {
		SendError(c, http.StatusBadRequest, "STATUS_INVALIDO", err.Error())
		return
	}

	// 2. Transicao de estado no dominio para 'EmProcessamento'
	if err := nota.IniciarProcessamento(); err != nil {
		SendError(c, http.StatusBadRequest, "STATUS_INVALIDO", err.Error())
		return
	}

	// 3. Atualiza o status no banco de dados
	if err := h.repo.UpdateStatus(ctx, nota.ID, domain.StatusEmProcessamento); err != nil {
		SendError(c, http.StatusInternalServerError, "DB_ERROR", "Erro ao atualizar status da nota fiscal", err.Error())
		return
	}

	// 4. Publica o evento NotaFiscalEmitidaEvent no RabbitMQ
	correlationID := c.GetHeader("X-Correlation-ID")
	if correlationID == "" {
		correlationID = nota.UUID
	}

	if h.rabbitMQ != nil {
		if pubErr := h.rabbitMQ.PublishNotaFiscalEmitida(ctx, nota, correlationID); pubErr != nil {
			SendError(c, http.StatusInternalServerError, "RABBITMQ_ERROR", "Falha ao enviar mensagem ao RabbitMQ", pubErr.Error())
			return
		}
	}

	SendSuccess(c, http.StatusOK, gin.H{
		"message":     "Nota fiscal enviada para processamento com sucesso",
		"nota_fiscal": nota,
	})
}

// ListNotasFiscaisHandler retorna as notas fiscais cadastradas com suporte a paginação e filtro de status.
// @Summary Listar Notas Fiscais com Paginação e Filtros
// @Description Retorna a lista de notas fiscais paginada com seus respectivos itens (query params: page, limit, status).
// @Tags Notas Fiscais
// @Produce json
// @Param page query int false "Número da página (padrão: 1)"
// @Param limit query int false "Quantidade de itens por página (padrão: 10, máx: 500)"
// @Param status query string false "Filtro por status (Aberta, EmProcessamento, Fechada, Cancelada)"
// @Success 200 {object} APIResponse
// @Failure 500 {object} APIResponse
// @Router /api/v1/notas-fiscais [get]
func (h *NotaFiscalHandler) ListNotasFiscaisHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	status := strings.TrimSpace(c.Query("status"))

	notas, total, err := h.repo.FindAllPaginated(c.Request.Context(), page, limit, status)
	if err != nil {
		SendError(c, http.StatusInternalServerError, "DB_ERROR", "Erro ao buscar notas fiscais", err.Error())
		return
	}

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 500 {
		limit = 10
	}

	totalPages := 0
	if limit > 0 {
		totalPages = int((total + int64(limit) - 1) / int64(limit))
	}

	response := gin.H{
		"items": notas,
		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": totalPages,
		},
	}

	SendSuccess(c, http.StatusOK, response)
}

// GetNotaFiscalByIDHandler busca uma nota fiscal especifica por ID ou UUID.
// @Summary Buscar Nota Fiscal por ID
// @Description Retorna os detalhes de uma nota fiscal pelo seu ID ou UUID.
// @Tags Notas Fiscais
// @Produce json
// @Param id path string true "ID ou UUID da Nota Fiscal"
// @Success 200 {object} APIResponse
// @Failure 404 {object} APIResponse
// @Failure 500 {object} APIResponse
// @Router /api/v1/notas-fiscais/{id} [get]
func (h *NotaFiscalHandler) GetNotaFiscalByIDHandler(c *gin.Context) {
	idParam := c.Param("id")
	ctx := c.Request.Context()
	var nota *domain.NotaFiscal
	var err error

	if idUint, parseErr := strconv.ParseUint(idParam, 10, 64); parseErr == nil {
		nota, err = h.repo.FindByID(ctx, uint(idUint))
	} else {
		nota, err = h.repo.FindByUUID(ctx, idParam)
	}

	if err != nil {
		if errors.Is(err, repository.ErrNotaFiscalNaoEncontrada) {
			SendError(c, http.StatusNotFound, "NOT_FOUND", "Nota fiscal nao encontrada")
			return
		}
		SendError(c, http.StatusInternalServerError, "DB_ERROR", "Erro ao buscar nota fiscal", err.Error())
		return
	}

	SendSuccess(c, http.StatusOK, nota)
}
