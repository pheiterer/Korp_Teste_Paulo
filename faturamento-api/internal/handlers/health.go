package handlers

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// HealthResponse modelo de resposta do Health Check.
type HealthResponse struct {
	Status    string    `json:"status"`
	Service   string    `json:"service"`
	Timestamp time.Time `json:"timestamp"`
}

// HealthCheckHandler responde requisições no endpoint GET /health.
func HealthCheckHandler(c *gin.Context) {
	slog.Info("Health check endpoint chamado", slog.String("remote_addr", c.ClientIP()))

	response := HealthResponse{
		Status:    "healthy",
		Service:   "faturamento-api",
		Timestamp: time.Now(),
	}

	SendSuccess(c, http.StatusOK, response)
}
