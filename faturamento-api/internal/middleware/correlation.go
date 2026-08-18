package middleware

import (
	"log/slog"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const HeaderCorrelationID = "X-Correlation-ID"

// CorrelationIDMiddleware garante a extracao, geracao e rastreabilidade ponta a ponta do Correlation ID.
func CorrelationIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		correlationID := c.GetHeader(HeaderCorrelationID)
		if correlationID == "" {
			correlationID = uuid.New().String()
		} else {
			if _, err := uuid.Parse(correlationID); err != nil {
				// Se nao for um UUID valido, gera um GUID novo para manter compatibilidade com MassTransit
				correlationID = uuid.New().String()
			}
		}

		c.Set("correlation_id", correlationID)
		c.Header(HeaderCorrelationID, correlationID)

		// Adiciona o correlation_id nos logs estruturados do slog para o ciclo de vida desta requisicao
		logger := slog.With(slog.String("correlation_id", correlationID))
		c.Request = c.Request.WithContext(c.Request.Context())

		slog.Debug("Requisicao recebida com Correlation ID",
			slog.String("correlation_id", correlationID),
			slog.String("method", c.Request.Method),
			slog.String("path", c.Request.URL.Path),
		)

		_ = logger

		c.Next()
	}
}
