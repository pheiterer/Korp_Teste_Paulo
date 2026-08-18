package database

import (
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	"faturamento-api/internal/domain"

	"gorm.io/driver/sqlserver"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// ConnectDB inicializa a conexao com o SQL Server utilizando GORM e executa o AutoMigrate.
func ConnectDB() (*gorm.DB, error) {
	if DB != nil {
		sqlDB, err := DB.DB()
		if err == nil && sqlDB.Ping() == nil {
			return DB, nil
		}
	}

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

	// 1. Primeira tentativa de conexao com o banco especifico faturamentodb
	db, err := gorm.Open(sqlserver.Open(connStr), gormConfig)
	if err != nil {
		slog.Warn("Nao foi possivel conectar ao database faturamentodb. Tentando conectar no database 'master' para criar 'faturamentodb'...", slog.String("error", err.Error()))

		// 2. Se falhar, conecta ao 'master' para criar o database faturamentodb automaticamente
		masterConnStr := strings.Replace(connStr, "database=faturamentodb", "database=master", 1)
		masterDB, masterErr := gorm.Open(sqlserver.Open(masterConnStr), gormConfig)
		if masterErr != nil {
			slog.Error("Falha ao abrir conexao com database master do SQL Server", slog.String("error", masterErr.Error()))
			return nil, fmt.Errorf("falha ao conectar no SQL Server master: %w", masterErr)
		}

		slog.Info("Criando database 'faturamentodb' caso nao exista...")
		createErr := masterDB.Exec("IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'faturamentodb') CREATE DATABASE [faturamentodb];").Error
		sqlMasterDB, _ := masterDB.DB()
		if sqlMasterDB != nil {
			_ = sqlMasterDB.Close()
		}

		if createErr != nil {
			slog.Error("Falha ao executar DDL de criacao do banco faturamentodb", slog.String("error", createErr.Error()))
			return nil, fmt.Errorf("falha ao criar database faturamentodb: %w", createErr)
		}

		// 3. Reconecta ao faturamentodb recem-criado
		slog.Info("Reconectando ao database 'faturamentodb' recem-criado...")
		db, err = gorm.Open(sqlserver.Open(connStr), gormConfig)
		if err != nil {
			slog.Error("Falha ao reconectar ao database faturamentodb", slog.String("error", err.Error()))
			return nil, fmt.Errorf("falha ao reconectar no faturamentodb: %w", err)
		}
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
