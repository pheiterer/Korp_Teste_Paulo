package messaging

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strconv"
	"time"

	"faturamento-api/internal/domain"
	"faturamento-api/internal/repository"

	"github.com/google/uuid"
	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	ExchangeNotaFiscalAbatida      = "Estoque.Application.Contracts:NotaFiscalAbatidaEvent"
	ExchangeAbatimentoEstoqueFalhou = "Estoque.Application.Contracts:AbatimentoEstoqueFalhouEvent"

	QueueFaturamentoStatusConfirmado = "faturamento-status-confirmado-queue"
	QueueFaturamentoStatusFalhou     = "faturamento-status-falhou-queue"
	QueueNotaFiscalEmitidaError      = "nota-fiscal-emitida-estoque-queue_error"
)

type ConsumerService struct {
	connURL string
	repo    repository.NotaFiscalRepository
}

func NewConsumerService(connURL string, repo repository.NotaFiscalRepository) *ConsumerService {
	return &ConsumerService{
		connURL: connURL,
		repo:    repo,
	}
}

func (c *ConsumerService) StartConsuming(ctx context.Context) {
	go c.listenConfirmation(ctx)
	go c.listenFailure(ctx)
	go c.listenDeadLetter(ctx)
}

func (c *ConsumerService) listenConfirmation(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
			if err := c.consumeConfirmationQueue(ctx); err != nil {
				slog.Warn("Reconectando consumidor de confirmacao do Faturamento...", slog.String("error", err.Error()))
				time.Sleep(3 * time.Second)
			}
		}
	}
}

func (c *ConsumerService) consumeConfirmationQueue(ctx context.Context) error {
	conn, err := amqp.Dial(c.connURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		return err
	}
	defer ch.Close()

	_ = ch.ExchangeDeclare(ExchangeNotaFiscalAbatida, "fanout", true, false, false, false, nil)
	q, err := ch.QueueDeclare(QueueFaturamentoStatusConfirmado, true, false, false, false, nil)
	if err != nil {
		return err
	}
	_ = ch.QueueBind(q.Name, "", ExchangeNotaFiscalAbatida, false, nil)

	msgs, err := ch.Consume(q.Name, "faturamento-confirm-consumer", true, false, false, false, nil)
	if err != nil {
		return err
	}

	for {
		select {
		case <-ctx.Done():
			return nil
		case d, ok := <-msgs:
			if !ok {
				return nil
			}
			idStr, motivo, corrID, sentTime := extractPayload(d.Body, d.Headers)
			if corrID == "" && d.CorrelationId != "" {
				corrID = d.CorrelationId
			}
			if sentTime.IsZero() && !d.Timestamp.IsZero() {
				sentTime = d.Timestamp
			}
			if idStr != "" {
				slog.Info("Recebida confirmacao de estoque abatido (NotaFiscalAbatidaEvent)", slog.String("id_or_uuid", idStr))
				c.updateStatusByIDOrUUID(ctx, idStr, domain.StatusFechada, motivo, corrID, sentTime)
			}
		}
	}
}

func (c *ConsumerService) listenFailure(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
			if err := c.consumeFailureQueue(ctx); err != nil {
				slog.Warn("Reconectando consumidor de falha do Faturamento...", slog.String("error", err.Error()))
				time.Sleep(3 * time.Second)
			}
		}
	}
}

func (c *ConsumerService) consumeFailureQueue(ctx context.Context) error {
	conn, err := amqp.Dial(c.connURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		return err
	}
	defer ch.Close()

	_ = ch.ExchangeDeclare(ExchangeAbatimentoEstoqueFalhou, "fanout", true, false, false, false, nil)
	q, err := ch.QueueDeclare(QueueFaturamentoStatusFalhou, true, false, false, false, nil)
	if err != nil {
		return err
	}
	_ = ch.QueueBind(q.Name, "", ExchangeAbatimentoEstoqueFalhou, false, nil)

	msgs, err := ch.Consume(q.Name, "faturamento-failure-consumer", true, false, false, false, nil)
	if err != nil {
		return err
	}

	for {
		select {
		case <-ctx.Done():
			return nil
		case d, ok := <-msgs:
			if !ok {
				return nil
			}
			idStr, motivo, corrID, sentTime := extractPayload(d.Body, d.Headers)
			if corrID == "" && d.CorrelationId != "" {
				corrID = d.CorrelationId
			}
			if sentTime.IsZero() && !d.Timestamp.IsZero() {
				sentTime = d.Timestamp
			}
			if idStr != "" {
				slog.Warn("Recebida FALHA de abatimento no estoque (AbatimentoEstoqueFalhouEvent) - Executando Saga Compensatoria",
					slog.String("id_or_uuid", idStr),
					slog.String("motivo", motivo),
				)
				c.updateStatusByIDOrUUID(ctx, idStr, domain.StatusCancelada, motivo, corrID, sentTime)
			}
		}
	}
}

func (c *ConsumerService) listenDeadLetter(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
			if err := c.consumeDeadLetterQueue(ctx); err != nil {
				slog.Warn("Reconectando consumidor de Dead Letter / Error queue do Faturamento...", slog.String("error", err.Error()))
				time.Sleep(3 * time.Second)
			}
		}
	}
}

func (c *ConsumerService) consumeDeadLetterQueue(ctx context.Context) error {
	conn, err := amqp.Dial(c.connURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		return err
	}
	defer ch.Close()

	q, err := ch.QueueDeclare(QueueNotaFiscalEmitidaError, true, false, false, false, nil)
	if err != nil {
		return err
	}

	msgs, err := ch.Consume(q.Name, "faturamento-deadletter-consumer", true, false, false, false, nil)
	if err != nil {
		return err
	}

	for {
		select {
		case <-ctx.Done():
			return nil
		case d, ok := <-msgs:
			if !ok {
				return nil
			}
			idStr, motivo, corrID, sentTime := extractPayload(d.Body, d.Headers)
			if corrID == "" && d.CorrelationId != "" {
				corrID = d.CorrelationId
			}
			if sentTime.IsZero() && !d.Timestamp.IsZero() {
				sentTime = d.Timestamp
			}
			if motivo == "" {
				if exMsg, ok := d.Headers["MT-Exception-Message"]; ok {
					motivo = fmt.Sprintf("Dead Letter Queue (Fault): %v", exMsg)
				} else {
					motivo = "Dead Letter Queue: Mensagem movida para fila de erro pelo broker"
				}
			}
			if idStr != "" {
				slog.Error("Recebida mensagem da Dead Letter Queue (nota-fiscal-emitida-estoque-queue_error)",
					slog.String("id_or_uuid", idStr),
					slog.String("motivo", motivo),
				)
				c.updateStatusByIDOrUUID(ctx, idStr, domain.StatusCancelada, motivo, corrID, sentTime)
				c.publishCompensatoryFailureEvent(ctx, idStr, motivo, corrID)
			}
		}
	}
}

func (c *ConsumerService) publishCompensatoryFailureEvent(ctx context.Context, idStr string, motivo string, corrID string) {
	conn, err := amqp.Dial(c.connURL)
	if err != nil {
		return
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		return
	}
	defer ch.Close()

	_ = ch.ExchangeDeclare(ExchangeAbatimentoEstoqueFalhou, "fanout", true, false, false, false, nil)

	body, _ := json.Marshal(map[string]interface{}{
		"messageId":      uuid.New().String(),
		"correlationId":  corrID,
		"conversationId": corrID,
		"messageType": []string{
			"urn:message:Estoque.Application.Contracts:AbatimentoEstoqueFalhouEvent",
		},
		"message": map[string]interface{}{
			"notaFiscalId": idStr,
			"motivo":       motivo,
			"dataFalha":    time.Now().UTC().Format(time.RFC3339Nano),
		},
		"sentTime": time.Now().UTC().Format(time.RFC3339Nano),
	})

	_ = ch.PublishWithContext(ctx, ExchangeAbatimentoEstoqueFalhou, "", false, false, amqp.Publishing{
		ContentType:   "application/vnd.masstransit+json",
		DeliveryMode:  amqp.Persistent,
		CorrelationId: corrID,
		Timestamp:     time.Now().UTC(),
		Body:          body,
	})
}

func (c *ConsumerService) updateStatusByIDOrUUID(ctx context.Context, idOrUUID string, status string, motivo string, correlationID string, sentTime time.Time) {
	if c.repo == nil {
		return
	}
	var nota *domain.NotaFiscal
	var err error

	// 1. Tenta buscar por UUID
	nota, err = c.repo.FindByUUID(ctx, idOrUUID)
	if (err != nil || nota == nil) {
		// 2. Tenta buscar por ID numérico
		if idUint, parseErr := strconv.ParseUint(idOrUUID, 10, 64); parseErr == nil {
			nota, err = c.repo.FindByID(ctx, uint(idUint))
		}
	}

	if err != nil || nota == nil {
		slog.Error("Nota fiscal nao encontrada para atualizar status via evento", slog.String("id_or_uuid", idOrUUID))
		return
	}

	if correlationID == "" {
		correlationID = nota.UUID
	}

	// Cálculo Stateless da Duração Total Ponta a Ponta
	var duracaoMs float64
	if !sentTime.IsZero() {
		duracaoMs = float64(time.Since(sentTime).Microseconds()) / 1000.0
	} else if !nota.UpdatedAt.IsZero() {
		duracaoMs = float64(time.Since(nota.UpdatedAt).Microseconds()) / 1000.0
	}

	if duracaoMs <= 0 {
		duracaoMs = 1.0
	}

	if motivo == "" {
		if status == domain.StatusFechada {
			motivo = "Abatimento de estoque realizado com sucesso"
		} else {
			motivo = "Transacao compensatoria (Saldo Insuficiente ou Erro)"
		}
	}

	if err := c.repo.UpdateStatus(ctx, nota.ID, status); err != nil {
		slog.Error("Erro ao atualizar status da nota fiscal via evento", slog.String("id_or_uuid", idOrUUID), slog.String("status", status), slog.String("error", err.Error()))
	} else {
		slog.Info("Status da nota fiscal atualizado via mensageria assincrona", slog.String("id_or_uuid", idOrUUID), slog.String("status", status))
	}

	// Registra log estruturado especial EVENTO_SAGA_FINALIZADA para a tabela de Auditoria no Grafana
	slog.Info("EVENTO_SAGA_FINALIZADA",
		slog.String("event", "EVENTO_SAGA_FINALIZADA"),
		slog.String("correlation_id", correlationID),
		slog.String("nota_fiscal_id", fmt.Sprintf("#%d", nota.ID)),
		slog.String("nota_uuid", nota.UUID),
		slog.String("status", status),
		slog.Float64("duracao_ms", duracaoMs),
		slog.String("motivo", motivo),
	)
}

func parseTimeStr(str string) time.Time {
	if str == "" {
		return time.Time{}
	}
	formats := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02T15:04:05.999999999Z07:00",
		"2006-01-02T15:04:05.999999999",
		"2006-01-02T15:04:05Z07:00",
		"2006-01-02T15:04:05",
		"2006-01-02 15:04:05",
	}
	for _, f := range formats {
		if t, err := time.Parse(f, str); err == nil && !t.IsZero() {
			return t
		}
	}
	return time.Time{}
}

func extractPayload(body []byte, headers amqp.Table) (idStr string, motivo string, correlationID string, sentTime time.Time) {
	// 1. Tenta extrair de envelope MassTransit com campo "message"
	var env struct {
		CorrelationID string                 `json:"correlationId"`
		SentTime      string                 `json:"sentTime"`
		Message       map[string]interface{} `json:"message"`
	}
	if err := json.Unmarshal(body, &env); err == nil {
		if env.CorrelationID != "" {
			correlationID = env.CorrelationID
		}
		if env.SentTime != "" {
			sentTime = parseTimeStr(env.SentTime)
		}
		if env.Message != nil {
			idStr = extractFromMap(env.Message, "notaFiscalId", "NotaFiscalId", "id", "Id", "uuid", "UUID")
			motivo = extractFromMap(env.Message, "motivo", "Motivo", "reason", "Reason")
			if corr := extractFromMap(env.Message, "correlationId", "CorrelationId"); corr != "" && correlationID == "" {
				correlationID = corr
			}
			if sentTime.IsZero() {
				if tStr := extractFromMap(env.Message, "sentTime", "SentTime", "dataEmissao", "DataEmissao", "dataAbatimento", "DataAbatimento", "dataFalha", "DataFalha"); tStr != "" {
					sentTime = parseTimeStr(tStr)
				}
			}
			if idStr != "" {
				return idStr, motivo, correlationID, sentTime
			}
		}
	}

	// 2. Tenta extrair diretamente da raiz do JSON
	var rawMap map[string]interface{}
	if err := json.Unmarshal(body, &rawMap); err == nil {
		idStr = extractFromMap(rawMap, "notaFiscalId", "NotaFiscalId", "id", "Id", "uuid", "UUID")
		motivo = extractFromMap(rawMap, "motivo", "Motivo", "reason", "Reason")
		if corr := extractFromMap(rawMap, "correlationId", "CorrelationId"); corr != "" && correlationID == "" {
			correlationID = corr
		}
		if sentTime.IsZero() {
			if tStr := extractFromMap(rawMap, "sentTime", "SentTime", "dataEmissao", "DataEmissao", "dataAbatimento", "DataAbatimento", "dataFalha", "DataFalha"); tStr != "" {
				sentTime = parseTimeStr(tStr)
			}
		}
	}

	// 3. Fallback para Headers AMQP
	if sentTime.IsZero() && headers != nil {
		if val, ok := headers["SentTime"]; ok {
			sentTime = parseTimeStr(fmt.Sprintf("%v", val))
		}
	}

	return idStr, motivo, correlationID, sentTime
}

func extractFromMap(m map[string]interface{}, keys ...string) string {
	for _, k := range keys {
		if v, ok := m[k]; ok && v != nil {
			str := fmt.Sprintf("%v", v)
			if str != "" && str != "<nil>" {
				return str
			}
		}
	}
	return ""
}
