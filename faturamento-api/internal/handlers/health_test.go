package handlers_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"faturamento-api/internal/handlers"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func SetupHealthTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	healthHandler := handlers.NewHealthHandler(nil, nil, nil)
	r.GET("/health", healthHandler.HealthCheckHandler)
	return r
}

func TestHealthCheckHandler(t *testing.T) {
	router := SetupHealthTestRouter()

	req, _ := http.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)

	var res handlers.ComponentHealthResponse
	err := json.Unmarshal(w.Body.Bytes(), &res)
	assert.NoError(t, err)
	assert.Equal(t, "unhealthy", res.Status)
	assert.Equal(t, "faturamento-api", res.Service)
}
