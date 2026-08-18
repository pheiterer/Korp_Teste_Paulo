package handlers

import (
	"errors"
	"net/http"
	"strconv"

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
	CodigoProduto string  `json:"codigo_produto"`
	Quantidade    int     `json:"quantidade" binding:"required,gt=0"`
	PrecoUnitario float64 `json:"preco_unitario" binding:"required,gte=0"`
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
		for _, itemReq := range req.Itens {
			codigo := itemReq.CodigoProduto
			if codigo == "" && itemReq.ProdutoID > 0 {
				codigo = strconv.FormatInt(itemReq.ProdutoID, 10)
			}
			if codigo != "" {
				_, err := h.redis.GetProduto(c.Request.Context(), codigo)
				if errors.Is(err, cache.ErrProdutoNaoEncontradoNoCache) {
					SendError(c, http.StatusBadRequest, "PRODUTO_NAO_ENCONTRADO_NO_CACHE", "Produto '"+codigo+"' nao encontrado no cache de estoque (Redis)")
					return
				}
			}
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
		if codigo == "" && itemReq.ProdutoID > 0 {
			codigo = strconv.FormatInt(itemReq.ProdutoID, 10)
		}
		domainItens[i] = domain.NotaFiscalItem{
			ProdutoID:     itemReq.ProdutoID,
			CodigoProduto: codigo,
			Quantidade:    itemReq.Quantidade,
			PrecoUnitario: itemReq.PrecoUnitario,
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

// ListNotasFiscaisHandler retorna todas as notas fiscais cadastradas.
// @Summary Listar Notas Fiscais
// @Description Retorna a lista de todas as notas fiscais com seus respectivos itens.
// @Tags Notas Fiscais
// @Produce json
// @Success 200 {object} APIResponse
// @Failure 500 {object} APIResponse
// @Router /api/v1/notas-fiscais [get]
func (h *NotaFiscalHandler) ListNotasFiscaisHandler(c *gin.Context) {
	notas, err := h.repo.FindAll(c.Request.Context())
	if err != nil {
		SendError(c, http.StatusInternalServerError, "DB_ERROR", "Erro ao buscar notas fiscais", err.Error())
		return
	}

	SendSuccess(c, http.StatusOK, notas)
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
