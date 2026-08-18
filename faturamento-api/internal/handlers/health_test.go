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

func SetupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(handlers.GlobalErrorHandler())
	r.GET("/health", handlers.HealthCheckHandler)
	return r
}

func TestHealthCheckHandler(t *testing.T) {
	router := SetupTestRouter()

	req, _ := http.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var res handlers.APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &res)
	assert.NoError(t, err)
	assert.True(t, res.Success)
	assert.Nil(t, res.Error)

	dataMap, ok := res.Data.(map[string]any)
	assert.True(t, ok)
	assert.Equal(t, "healthy", dataMap["status"])
	assert.Equal(t, "faturamento-api", dataMap["service"])
}
