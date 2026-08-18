package handlers_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	_ "faturamento-api/docs"
	"faturamento-api/internal/handlers"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func SetupSwaggerTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(handlers.GlobalErrorHandler())
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	return r
}

func TestSwaggerEndpoint_IndexHtml(t *testing.T) {
	router := SetupSwaggerTestRouter()

	req, _ := http.NewRequest(http.MethodGet, "/swagger/index.html", nil)
	req.RequestURI = "/swagger/index.html" // Requerido pelo gin-swagger em testes httptest
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "Swagger UI")
}

func TestSwaggerEndpoint_DocJson(t *testing.T) {
	router := SetupSwaggerTestRouter()

	req, _ := http.NewRequest(http.MethodGet, "/swagger/doc.json", nil)
	req.RequestURI = "/swagger/doc.json" // Requerido pelo gin-swagger em testes httptest
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "API de Faturamento")
}
