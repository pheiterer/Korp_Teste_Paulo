package handlers

import (
	"log/slog"
	"net/http"
	"time"

	"faturamento-api/internal/cache"
	"faturamento-api/internal/messaging"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ComponentHealth struct {
	Status string `json:"status"`
	Error  string `json:"error,omitempty"`
}

type ComponentHealthResponse struct {
	Status     string                     `json:"status"`
	Service    string                     `json:"service"`
	Timestamp  time.Time                  `json:"timestamp"`
	Components map[string]ComponentHealth `json:"components"`
}

type HealthHandler struct {
	db       *gorm.DB
	redis    *cache.RedisCacheService
	rabbitMQ *messaging.RabbitMQService
}

func NewHealthHandler(db *gorm.DB, redis *cache.RedisCacheService, rabbitMQ *messaging.RabbitMQService) *HealthHandler {
	return &HealthHandler{
		db:       db,
		redis:    redis,
		rabbitMQ: rabbitMQ,
	}
}

// HealthCheckHandler verifica o status de conexao dos componentes de infraestrutura (SQL Server, Redis, RabbitMQ).
// @Summary Health Check da API
// @Description Realiza a verificacao de saude da API de Faturamento e de suas dependencias de infraestrutura.
// @Tags Health
// @Produce json
// @Success 200 {object} ComponentHealthResponse
// @Failure 503 {object} ComponentHealthResponse
// @Router /health [get]
func (h *HealthHandler) HealthCheckHandler(c *gin.Context) {
	ctx := c.Request.Context()
	slog.Info("Health check endpoint chamado", slog.String("remote_addr", c.ClientIP()))

	components := make(map[string]ComponentHealth)
	allHealthy := true

	// 1. Verificacao do SQL Server
	if h.db != nil {
		sqlDB, err := h.db.DB()
		if err != nil || sqlDB.PingContext(ctx) != nil {
			errStr := "sem conexao com o banco"
			if err != nil {
				errStr = err.Error()
			}
			components["sqlserver"] = ComponentHealth{Status: "DOWN", Error: errStr}
			allHealthy = false
		} else {
			components["sqlserver"] = ComponentHealth{Status: "UP"}
		}
	} else {
		components["sqlserver"] = ComponentHealth{Status: "DOWN", Error: "database not initialized"}
		allHealthy = false
	}

	// 2. Verificacao do Redis
	if h.redis != nil && h.redis.IsConnected(ctx) {
		components["redis"] = ComponentHealth{Status: "UP"}
	} else {
		components["redis"] = ComponentHealth{Status: "DOWN", Error: "redis unreachable"}
		allHealthy = false
	}

	// 3. Verificacao do RabbitMQ
	if h.rabbitMQ != nil && h.rabbitMQ.IsConnected(ctx) {
		components["rabbitmq"] = ComponentHealth{Status: "UP"}
	} else {
		components["rabbitmq"] = ComponentHealth{Status: "DOWN", Error: "rabbitmq unreachable"}
		allHealthy = false
	}

	overallStatus := "healthy"
	httpStatus := http.StatusOK
	if !allHealthy {
		overallStatus = "unhealthy"
		httpStatus = http.StatusServiceUnavailable
	}

	c.JSON(httpStatus, ComponentHealthResponse{
		Status:     overallStatus,
		Service:    "faturamento-api",
		Timestamp:  time.Now().UTC(),
		Components: components,
	})
}
