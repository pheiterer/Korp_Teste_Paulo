package repository

import (
	"context"
	"errors"

	"faturamento-api/internal/database"
	"faturamento-api/internal/domain"

	"gorm.io/gorm"
)

var (
	ErrNotaFiscalNaoEncontrada = errors.New("nota fiscal nao encontrada")
	ErrDatabaseNotConnected    = errors.New("banco de dados SQL Server indisponivel no momento")
)

type NotaFiscalRepository interface {
	Create(ctx context.Context, nota *domain.NotaFiscal) error
	FindByID(ctx context.Context, id uint) (*domain.NotaFiscal, error)
	FindByUUID(ctx context.Context, uuidStr string) (*domain.NotaFiscal, error)
	FindAll(ctx context.Context) ([]domain.NotaFiscal, error)
	UpdateStatus(ctx context.Context, id uint, status string) error
	GetNextNumeroSequencial(ctx context.Context) (int64, error)
}

type gormNotaFiscalRepository struct {
	db *gorm.DB
}

func NewNotaFiscalRepository(db *gorm.DB) NotaFiscalRepository {
	return &gormNotaFiscalRepository{db: db}
}

func (r *gormNotaFiscalRepository) getDB() (*gorm.DB, error) {
	if r.db != nil {
		return r.db, nil
	}
	if database.DB != nil {
		r.db = database.DB
		return database.DB, nil
	}
	// Tenta reconectar dinamicamente se a conexao inicial nao foi concluida
	db, err := database.ConnectDB()
	if err != nil || db == nil {
		return nil, ErrDatabaseNotConnected
	}
	r.db = db
	return db, nil
}

func (r *gormNotaFiscalRepository) Create(ctx context.Context, nota *domain.NotaFiscal) error {
	db, err := r.getDB()
	if err != nil {
		return err
	}
	return db.WithContext(ctx).Create(nota).Error
}

func (r *gormNotaFiscalRepository) FindByID(ctx context.Context, id uint) (*domain.NotaFiscal, error) {
	db, err := r.getDB()
	if err != nil {
		return nil, err
	}
	var nota domain.NotaFiscal
	err = db.WithContext(ctx).Preload("Itens").First(&nota, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotaFiscalNaoEncontrada
		}
		return nil, err
	}
	return &nota, nil
}

func (r *gormNotaFiscalRepository) FindByUUID(ctx context.Context, uuidStr string) (*domain.NotaFiscal, error) {
	db, err := r.getDB()
	if err != nil {
		return nil, err
	}
	var nota domain.NotaFiscal
	err = db.WithContext(ctx).Preload("Itens").Where("uuid = ?", uuidStr).First(&nota).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotaFiscalNaoEncontrada
		}
		return nil, err
	}
	return &nota, nil
}

func (r *gormNotaFiscalRepository) FindAll(ctx context.Context) ([]domain.NotaFiscal, error) {
	db, err := r.getDB()
	if err != nil {
		return nil, err
	}
	var notas []domain.NotaFiscal
	err = db.WithContext(ctx).Preload("Itens").Order("id DESC").Find(&notas).Error
	if err != nil {
		return nil, err
	}
	return notas, nil
}

func (r *gormNotaFiscalRepository) UpdateStatus(ctx context.Context, id uint, status string) error {
	db, err := r.getDB()
	if err != nil {
		return err
	}
	result := db.WithContext(ctx).Model(&domain.NotaFiscal{}).Where("id = ?", id).Update("status", status)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotaFiscalNaoEncontrada
	}
	return nil
}

func (r *gormNotaFiscalRepository) GetNextNumeroSequencial(ctx context.Context) (int64, error) {
	db, err := r.getDB()
	if err != nil {
		return 1, nil
	}
	var maxSeq int64
	err = db.WithContext(ctx).Model(&domain.NotaFiscal{}).Select("COALESCE(MAX(numero_sequencial), 0)").Scan(&maxSeq).Error
	if err != nil || maxSeq <= 0 {
		return 1, nil
	}
	return maxSeq + 1, nil
}
