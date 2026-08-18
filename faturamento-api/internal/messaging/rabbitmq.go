package messaging

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"time"

	"faturamento-api/internal/domain"

	"github.com/google/uuid"
	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	ExchangeNotaFiscalEmitida = "Estoque.Application.Contracts:NotaFiscalEmitidaEvent"
	QueueNotaFiscalEmitida    = "nota-fiscal-emitida-estoque-queue"
)

// MassTransitEnvelope estrutura o envelope de mensagem compativel com o MassTransit (.NET).
type MassTransitEnvelope struct {
	MessageID      string                   `json:"messageId"`
	CorrelationID  string                   `json:"correlationId,omitempty"`
	ConversationID string                   `json:"conversationId,omitempty"`
	MessageType    []string                 `json:"messageType"`
	Message        NotaFiscalEmitidaPayload `json:"message"`
	SentTime       string                   `json:"sentTime"`
}

// NotaFiscalEmitidaPayload representa o payload interno da mensagem consumida pelo C#.
type NotaFiscalEmitidaPayload struct {
	NotaFiscalID string                  `json:"notaFiscalId"`
	Numero       string                  `json:"numero"`
	Itens        []NotaFiscalItemPayload `json:"itens"`
	DataEmissao  string                  `json:"dataEmissao"`
}

// NotaFiscalItemPayload representa cada item no evento de emissao.
type NotaFiscalItemPayload struct {
	CodigoProduto string `json:"codigoProduto"`
	Quantidade    int    `json:"quantidade"`
}

// RabbitMQService gerencia a conexao e publicacao de eventos no RabbitMQ.
type RabbitMQService struct {
	connURL string
}

// NewRabbitMQService cria uma nova instancia do servico de mensageria.
func NewRabbitMQService() *RabbitMQService {
	host := os.Getenv("RABBITMQ_HOST")
	if host == "" {
		host = os.Getenv("RabbitMQ__Host")
	}
	if host == "" {
		host = "localhost"
	}

	port := os.Getenv("RABBITMQ_PORT")
	if port == "" {
		port = os.Getenv("RabbitMQ__Port")
	}
	if port == "" {
		port = "5672"
	}

	user := os.Getenv("RABBITMQ_USER")
	if user == "" {
		user = os.Getenv("RabbitMQ__Username")
	}
	if user == "" {
		user = "guest"
	}

	pass := os.Getenv("RABBITMQ_PASS")
	if pass == "" {
		pass = os.Getenv("RabbitMQ__Password")
	}
	if pass == "" {
		pass = "guest"
	}

	connURL := fmt.Sprintf("amqp://%s:%s@%s:%s/", user, pass, host, port)
	slog.Info("RabbitMQ client configurado", slog.String("host", host), slog.String("port", port))
	return &RabbitMQService{connURL: connURL}
}

func (r *RabbitMQService) ConnURL() string {
	return r.connURL
}

// PublishNotaFiscalEmitida publica o evento de nota fiscal emitida no RabbitMQ.
func (r *RabbitMQService) PublishNotaFiscalEmitida(ctx context.Context, nota *domain.NotaFiscal, correlationID string) error {
	conn, err := amqp.Dial(r.connURL)
	if err != nil {
		slog.Error("Falha ao conectar ao RabbitMQ", slog.String("error", err.Error()), slog.String("url", r.connURL))
		return fmt.Errorf("falha na conexao RabbitMQ: %w", err)
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		slog.Error("Falha ao abrir canal no RabbitMQ", slog.String("error", err.Error()))
		return fmt.Errorf("falha ao abrir canal RabbitMQ: %w", err)
	}
	defer ch.Close()

	// Declara a exchange fanout para compatibilidade com o MassTransit
	err = ch.ExchangeDeclare(
		ExchangeNotaFiscalEmitida, // name
		"fanout",                  // type
		true,                      // durable
		false,                     // auto-deleted
		false,                     // internal
		false,                     // no-wait
		nil,                       // arguments
	)
	if err != nil {
		slog.Warn("Nao foi possivel declarar exchange no RabbitMQ (pode ja existir)", slog.String("error", err.Error()))
	}

	// Declara e faz bind da fila para garantir entrega imediata
	queue, err := ch.QueueDeclare(
		QueueNotaFiscalEmitida, // name
		true,                   // durable
		false,                  // delete when unused
		false,                  // exclusive
		false,                  // no-wait
		nil,                    // arguments
	)
	if err == nil {
		_ = ch.QueueBind(queue.Name, "", ExchangeNotaFiscalEmitida, false, nil)
	}

	// Converte itens da nota fiscal para o payload do evento
	itemPayloads := make([]NotaFiscalItemPayload, len(nota.Itens))
	for i, item := range nota.Itens {
		codigo := item.CodigoProduto
		if codigo == "" {
			codigo = fmt.Sprintf("%d", item.ProdutoID)
		}
		itemPayloads[i] = NotaFiscalItemPayload{
			CodigoProduto: codigo,
			Quantidade:    item.Quantidade,
		}
	}

	messageID := uuid.New().String()
	validCorrelationID := nota.UUID
	if correlationID != "" {
		if _, parseErr := uuid.Parse(correlationID); parseErr == nil {
			validCorrelationID = correlationID
		}
	}

	envelope := MassTransitEnvelope{
		MessageID:      messageID,
		CorrelationID:  validCorrelationID,
		ConversationID: validCorrelationID,
		MessageType: []string{
			"urn:message:Estoque.Application.Contracts:NotaFiscalEmitidaEvent",
		},
		Message: NotaFiscalEmitidaPayload{
			NotaFiscalID: nota.UUID,
			Numero:       strconv.FormatInt(nota.NumeroSequencial, 10),
			Itens:        itemPayloads,
			DataEmissao:  nota.UpdatedAt.Format(time.RFC3339Nano),
		},
		SentTime: time.Now().UTC().Format(time.RFC3339Nano),
	}

	body, err := json.Marshal(envelope)
	if err != nil {
		return fmt.Errorf("falha ao serializar mensagem JSON MassTransit: %w", err)
	}

	// Publica a mensagem na Exchange e diretamente na Fila para garantia duplamente tratada
	pub := amqp.Publishing{
		ContentType:   "application/vnd.masstransit+json",
		DeliveryMode:  amqp.Persistent,
		MessageId:     messageID,
		CorrelationId: correlationID,
		Body:          body,
	}

	// Tentativa 1: publicar na exchange do MassTransit
	err = ch.PublishWithContext(
		ctx,
		ExchangeNotaFiscalEmitida, // exchange
		"",                        // routing key
		false,                     // mandatory
		false,                     // immediate
		pub,
	)

	if err != nil {
		slog.Warn("Falha ao publicar na exchange, tentando publicar diretamente na fila", slog.String("error", err.Error()))
		// Tentativa 2: fallback para publicar diretamente na fila
		err = ch.PublishWithContext(
			ctx,
			"",                     // default exchange
			QueueNotaFiscalEmitida, // routing key = queue name
			false,
			false,
			pub,
		)
		if err != nil {
			slog.Error("Falha ao publicar evento NotaFiscalEmitidaEvent no RabbitMQ", slog.String("error", err.Error()))
			return fmt.Errorf("falha ao publicar no RabbitMQ: %w", err)
		}
	}

	slog.Info("Evento NotaFiscalEmitidaEvent publicado com sucesso no RabbitMQ",
		slog.String("nota_fiscal_uuid", nota.UUID),
		slog.Int64("numero_sequencial", nota.NumeroSequencial),
		slog.String("correlation_id", correlationID),
	)

	return nil
}
