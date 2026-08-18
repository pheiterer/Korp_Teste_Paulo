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

	_ "faturamento-api/docs"
	"faturamento-api/internal/cache"
	"faturamento-api/internal/database"
	"faturamento-api/internal/handlers"
	"faturamento-api/internal/messaging"
	"faturamento-api/internal/middleware"
	"faturamento-api/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// @title API de Faturamento (Microsservico Go)
// @version 1.0
// @description API RESTful para emissao, gerenciamento de Notas Fiscais e integracao com SQL Server.
// @termsOfService http://swagger.io/terms/

// @contact.name Suporte Korp
// @contact.url https://github.com/pheiterer/Korp_Teste_Paulo

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host localhost:8082
// @BasePath /
// @schemes http https

func main() {
	// 1. Configuração do Logger Estruturado Nativo (log/slog)
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	slog.Info("Inicializando o Microsservico de Faturamento (Go)...")

	// 2. Conexao com o SQL Server (GORM & AutoMigrate)
	db, err := database.ConnectDB()
	if err != nil {
		slog.Warn("Banco de dados SQL Server nao disponivel no startup local. Continuando inicializacao do servidor HTTP...", slog.String("error", err.Error()))
	}

	// 3. Inicializacao do Repositorio, Servico de Mensageria e Cache Redis
	notaRepo := repository.NewNotaFiscalRepository(db)
	rabbitMQ := messaging.NewRabbitMQService()
	redisCache := cache.NewRedisCacheService()
	notaHandler := handlers.NewNotaFiscalHandler(notaRepo, rabbitMQ, redisCache)
	healthHandler := handlers.NewHealthHandler(db, redisCache, rabbitMQ)

	// Inicializa consumidor de confirmacao e falha assincrona no RabbitMQ
	consumerService := messaging.NewConsumerService(rabbitMQ.ConnURL(), notaRepo)
	consumerService.StartConsuming(context.Background())

	// 4. Modo do Gin baseado em variavel de ambiente
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 5. Inicializacao do Roteador Gin
	router := gin.New()

	// Middlewares globais
	router.Use(gin.Logger())
	router.Use(middleware.CorrelationIDMiddleware())
	router.Use(handlers.GlobalErrorHandler())

	// 6. Mapeamento da Rota Interativa do Swagger UI
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// 7. Mapeamento de Rotas Base
	router.GET("/health", healthHandler.HealthCheckHandler)
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	apiV1 := router.Group("/api/v1")
	{
		apiV1.GET("/ping", func(c *gin.Context) {
			handlers.SendSuccess(c, http.StatusOK, gin.H{
				"message": "pong",
				"time":    time.Now(),
			})
		})

		// Rotas de Notas Fiscais (Issue 9)
		apiV1.POST("/notas-fiscais", notaHandler.CreateNotaFiscalHandler)
		apiV1.POST("/notas-fiscais/:id/imprimir", notaHandler.ImprimirNotaFiscalHandler)
		apiV1.GET("/notas-fiscais", notaHandler.ListNotasFiscaisHandler)
		apiV1.GET("/notas-fiscais/:id", notaHandler.GetNotaFiscalByIDHandler)
	}

	// 7. Port Config
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

	// 8. Subida do Servidor HTTP com Graceful Shutdown
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
