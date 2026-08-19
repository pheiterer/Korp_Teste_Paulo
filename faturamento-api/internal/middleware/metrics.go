package middleware

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	httpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_received_total",
			Help: "Numero total de requisicoes HTTP recebidas pelo servico de faturamento.",
		},
		[]string{"code", "method", "endpoint"},
	)

	httpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "Duracao das requisicoes HTTP em segundos.",
			Buckets: []float64{0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
		},
		[]string{"code", "method", "endpoint"},
	)
)

// PrometheusMetricsMiddleware coleta metricas de latencia e status HTTP de cada requisicao
func PrometheusMetricsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		duration := time.Since(start).Seconds()

		statusCode := strconv.Itoa(c.Writer.Status())
		endpoint := c.FullPath()
		if endpoint == "" {
			endpoint = c.Request.URL.Path
		}

		httpRequestsTotal.WithLabelValues(statusCode, c.Request.Method, endpoint).Inc()
		httpRequestDuration.WithLabelValues(statusCode, c.Request.Method, endpoint).Observe(duration)
	}
}
