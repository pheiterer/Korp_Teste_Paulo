package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"faturamento-api/internal/handlers"

	"github.com/gin-gonic/gin"
)

func main() {
	// 1. Configuração do Logger Estruturado Nativo (log/slog)
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	slog.Info("Inicializando o Microsservico de Faturamento (Go)...")

	// 2. Modo do Gin baseado em variavel de ambiente
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 3. Inicializacao do Roteador Gin
	router := gin.New()

	// Middlewares globais
	router.Use(gin.Logger())
	router.Use(handlers.GlobalErrorHandler())

	// 4. Mapeamento de Rotas Base
	router.GET("/health", handlers.HealthCheckHandler)

	apiV1 := router.Group("/api/v1")
	{
		apiV1.GET("/ping", func(c *gin.Context) {
			handlers.SendSuccess(c, http.StatusOK, gin.H{
				"message": "pong",
				"time":    time.Now(),
			})
		})
	}

	// 5. Port Config
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// 6. Subida do Servidor HTTP com Graceful Shutdown
	go func() {
		slog.Info("Servidor de Faturamento iniciado com sucesso", slog.String("port", port))
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("Falha critica ao iniciar o servidor HTTP", slog.String("error", err.Error()))
			os.Exit(1)
		}
	}()

	// Aguarda sinal de interrupção (SIGINT, SIGTERM)
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("Encerrando o Servidor de Faturamento de forma graciosa...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("Forcado encerramento do servidor", slog.String("error", err.Error()))
	}

	slog.Info("Servidor de Faturamento finalizado.")
}
