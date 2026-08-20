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
	FindAllPaginated(ctx context.Context, page, limit int, status string) ([]domain.NotaFiscal, int64, error)
	UpdateStatus(ctx context.Context, id uint, status string) error
	UpdateStatusWithMotivo(ctx context.Context, id uint, status string, motivo string) error
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
	notas, _, err := r.FindAllPaginated(ctx, 1, 100, "")
	return notas, err
}

func (r *gormNotaFiscalRepository) FindAllPaginated(ctx context.Context, page, limit int, status string) ([]domain.NotaFiscal, int64, error) {
	db, err := r.getDB()
	if err != nil {
		return nil, 0, err
	}

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 500 {
		limit = 10
	}

	offset := (page - 1) * limit

	query := db.WithContext(ctx).Model(&domain.NotaFiscal{})
	if status != "" && status != "Todas" {
		query = query.Where("status = ?", status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var notas []domain.NotaFiscal
	err = query.Order("id DESC").Offset(offset).Limit(limit).Preload("Itens").Find(&notas).Error
	if err != nil {
		return nil, 0, err
	}

	return notas, total, nil
}

func (r *gormNotaFiscalRepository) UpdateStatus(ctx context.Context, id uint, status string) error {
	return r.UpdateStatusWithMotivo(ctx, id, status, "")
}

func (r *gormNotaFiscalRepository) UpdateStatusWithMotivo(ctx context.Context, id uint, status string, motivo string) error {
	db, err := r.getDB()
	if err != nil {
		return err
	}
	updates := map[string]interface{}{
		"status": status,
	}
	if motivo != "" {
		updates["motivo_cancelamento"] = motivo
	}
	result := db.WithContext(ctx).Model(&domain.NotaFiscal{}).Where("id = ?", id).Updates(updates)
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
