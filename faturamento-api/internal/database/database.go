package database

import (
	"fmt"
	"log/slog"
	"os"
	"time"

	"faturamento-api/internal/domain"

	"gorm.io/driver/sqlserver"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// ConnectDB inicializa a conexao com o SQL Server utilizando GORM e executa o AutoMigrate.
func ConnectDB() (*gorm.DB, error) {
	connStr := os.Getenv("ConnectionStrings__SqlServer")
	if connStr == "" {
		connStr = os.Getenv("DB_CONNECTION_STRING")
	}
	if connStr == "" {
		connStr = "sqlserver://sa:YourPassword123!@localhost:1433?database=faturamentodb&encrypt=disable"
	}

	slog.Info("Conectando ao SQL Server via GORM...", slog.String("dsn", maskDSN(connStr)))

	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	}

	db, err := gorm.Open(sqlserver.Open(connStr), gormConfig)
	if err != nil {
		slog.Error("Falha ao abrir conexao com SQL Server", slog.String("error", err.Error()))
		return nil, fmt.Errorf("falha ao conectar no banco de dados: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		slog.Error("Falha ao obter instancia sql.DB do GORM", slog.String("error", err.Error()))
		return nil, err
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	slog.Info("Executando AutoMigrate para entidades de Nota Fiscal...")
	if err := db.AutoMigrate(&domain.NotaFiscal{}, &domain.NotaFiscalItem{}); err != nil {
		slog.Error("Falha ao executar AutoMigrate", slog.String("error", err.Error()))
		return nil, fmt.Errorf("falha no AutoMigrate: %w", err)
	}

	slog.Info("Conexao com SQL Server e AutoMigrate concluidos com sucesso!")
	DB = db
	return db, nil
}

// maskDSN oculta dados sensiveis na string de conexao para exibicao em logs.
func maskDSN(dsn string) string {
	if len(dsn) > 20 {
		return dsn[:15] + "***..."
	}
	return dsn
}
