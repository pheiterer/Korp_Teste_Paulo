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
// @Summary Health Check da API
// @Description Retorna o estado de saude do microsservico de faturamento
// @Tags Health
// @Produce json
// @Success 200 {object} APIResponse{data=HealthResponse}
// @Router /health [get]
func HealthCheckHandler(c *gin.Context) {
	slog.Info("Health check endpoint chamado", slog.String("remote_addr", c.ClientIP()))

	response := HealthResponse{
		Status:    "healthy",
		Service:   "faturamento-api",
		Timestamp: time.Now(),
	}

	SendSuccess(c, http.StatusOK, response)
}
