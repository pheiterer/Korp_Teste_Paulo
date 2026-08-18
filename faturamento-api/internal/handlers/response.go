package handlers

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
)

// APIResponse padroniza todas as respostas HTTP da API de Faturamento.
type APIResponse struct {
	Success bool           `json:"success"`
	Data    any            `json:"data,omitempty"`
	Error   *ErrorResponse `json:"error,omitempty"`
}

// ErrorResponse representa o detalhamento estruturado de erros.
type ErrorResponse struct {
	Code    string   `json:"code"`
	Message string   `json:"message"`
	Details []string `json:"details,omitempty"`
}

// SendSuccess envia uma resposta JSON padronizada de sucesso.
func SendSuccess(c *gin.Context, statusCode int, data any) {
	c.JSON(statusCode, APIResponse{
		Success: true,
		Data:    data,
	})
}

// SendError envia uma resposta JSON padronizada para tratamento explicito de erro (if err != nil).
func SendError(c *gin.Context, statusCode int, code string, message string, details ...string) {
	slog.Error("Requisicao finalizada com erro",
		slog.String("path", c.Request.URL.Path),
		slog.String("method", c.Request.Method),
		slog.Int("status", statusCode),
		slog.String("code", code),
		slog.String("message", message),
	)

	c.JSON(statusCode, APIResponse{
		Success: false,
		Error: &ErrorResponse{
			Code:    code,
			Message: message,
			Details: details,
		},
	})
}

// HandleError (helper funcional para o padrao idiomatico do Go `if err != nil`).
func HandleError(c *gin.Context, err error, statusCode int, code string, customMessage string) bool {
	if err != nil {
		msg := customMessage
		if msg == "" {
			msg = err.Error()
		}
		SendError(c, statusCode, code, msg)
		return true
	}
	return false
}

// GlobalErrorHandler returns a Gin middleware for panic recovery with slog integration.
func GlobalErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				slog.Error("Panic recuperado no servidor HTTP",
					slog.Any("panic", r),
					slog.String("path", c.Request.URL.Path),
				)
				SendError(c, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "Ocorreu um erro interno no servidor")
				c.Abort()
			}
		}()
		c.Next()
	}
}
