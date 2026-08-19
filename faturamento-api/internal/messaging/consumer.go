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

	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	ExchangeNotaFiscalAbatida      = "Estoque.Application.Contracts:NotaFiscalAbatidaEvent"
	ExchangeAbatimentoEstoqueFalhou = "Estoque.Application.Contracts:AbatimentoEstoqueFalhouEvent"

	QueueFaturamentoStatusConfirmado = "faturamento-status-confirmado-queue"
	QueueFaturamentoStatusFalhou     = "faturamento-status-falhou-queue"
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
			idStr, _ := extractPayload(d.Body)
			if idStr != "" {
				slog.Info("Recebida confirmacao de estoque abatido (NotaFiscalAbatidaEvent)", slog.String("id_or_uuid", idStr))
				c.updateStatusByIDOrUUID(ctx, idStr, domain.StatusFechada)
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
			idStr, motivo := extractPayload(d.Body)
			if idStr != "" {
				slog.Warn("Recebida FALHA de abatimento no estoque (AbatimentoEstoqueFalhouEvent) - Executando Saga Compensatoria",
					slog.String("id_or_uuid", idStr),
					slog.String("motivo", motivo),
				)
				c.updateStatusByIDOrUUID(ctx, idStr, domain.StatusCancelada)
			}
		}
	}
}

func (c *ConsumerService) updateStatusByIDOrUUID(ctx context.Context, idOrUUID string, status string) {
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

	if err := c.repo.UpdateStatus(ctx, nota.ID, status); err != nil {
		slog.Error("Erro ao atualizar status da nota fiscal via evento", slog.String("id_or_uuid", idOrUUID), slog.String("status", status), slog.String("error", err.Error()))
	} else {
		slog.Info("Status da nota fiscal atualizado via mensageria assincrona", slog.String("id_or_uuid", idOrUUID), slog.String("status", status))
	}
}

func extractPayload(body []byte) (idStr string, motivo string) {
	// 1. Tenta extrair de envelope MassTransit com campo "message"
	var env struct {
		Message map[string]interface{} `json:"message"`
	}
	if err := json.Unmarshal(body, &env); err == nil && env.Message != nil {
		idStr = extractFromMap(env.Message, "notaFiscalId", "NotaFiscalId", "id", "Id", "uuid", "UUID")
		motivo = extractFromMap(env.Message, "motivo", "Motivo", "reason", "Reason")
		if idStr != "" {
			return idStr, motivo
		}
	}

	// 2. Tenta extrair diretamente da raiz do JSON
	var rawMap map[string]interface{}
	if err := json.Unmarshal(body, &rawMap); err == nil {
		idStr = extractFromMap(rawMap, "notaFiscalId", "NotaFiscalId", "id", "Id", "uuid", "UUID")
		motivo = extractFromMap(rawMap, "motivo", "Motivo", "reason", "Reason")
	}
	return idStr, motivo
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
