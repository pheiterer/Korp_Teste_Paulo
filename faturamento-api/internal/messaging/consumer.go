package messaging

import (
	"context"
	"encoding/json"
	"log/slog"
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

type NotaFiscalAbatidaMessage struct {
	NotaFiscalID string `json:"notaFiscalId"`
}

type AbatimentoEstoqueFalhouMessage struct {
	NotaFiscalID string `json:"notaFiscalId"`
	Motivo       string `json:"motivo"`
}

type GenericMassTransitEnvelope struct {
	Message json.RawMessage `json:"message"`
}

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
			var env GenericMassTransitEnvelope
			if err := json.Unmarshal(d.Body, &env); err == nil {
				var msg NotaFiscalAbatidaMessage
				if err := json.Unmarshal(env.Message, &msg); err == nil && msg.NotaFiscalID != "" {
					slog.Info("Recebida confirmacao de estoque abatido (NotaFiscalAbatidaEvent)", slog.String("uuid", msg.NotaFiscalID))
					c.updateStatusByUUID(ctx, msg.NotaFiscalID, domain.StatusFechada)
				}
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
			var env GenericMassTransitEnvelope
			if err := json.Unmarshal(d.Body, &env); err == nil {
				var msg AbatimentoEstoqueFalhouMessage
				if err := json.Unmarshal(env.Message, &msg); err == nil && msg.NotaFiscalID != "" {
					slog.Warn("Recebida FALHA de abatimento no estoque (AbatimentoEstoqueFalhouEvent) - Executando Saga Compensatoria",
						slog.String("uuid", msg.NotaFiscalID),
						slog.String("motivo", msg.Motivo),
					)
					c.updateStatusByUUID(ctx, msg.NotaFiscalID, domain.StatusCancelada)
				}
			}
		}
	}
}

func (c *ConsumerService) updateStatusByUUID(ctx context.Context, uuidStr string, status string) {
	if c.repo == nil {
		return
	}
	nota, err := c.repo.FindByUUID(ctx, uuidStr)
	if err != nil || nota == nil {
		slog.Error("Nota fiscal nao encontrada para atualizar status via evento", slog.String("uuid", uuidStr))
		return
	}

	if err := c.repo.UpdateStatus(ctx, nota.ID, status); err != nil {
		slog.Error("Erro ao atualizar status da nota fiscal via evento", slog.String("uuid", uuidStr), slog.String("status", status), slog.String("error", err.Error()))
	} else {
		slog.Info("Status da nota fiscal atualizado via mensageria assincrona", slog.String("uuid", uuidStr), slog.String("status", status))
	}
}
