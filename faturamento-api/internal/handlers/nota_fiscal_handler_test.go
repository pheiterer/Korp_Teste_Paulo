package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"faturamento-api/internal/domain"
	"faturamento-api/internal/handlers"
	"faturamento-api/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockRepository simula as operacoes de persistencia do repositorio.
type MockRepository struct {
	mock.Mock
}

func (m *MockRepository) Create(ctx context.Context, nota *domain.NotaFiscal) error {
	args := m.Called(ctx, nota)
	if nota.ID == 0 {
		nota.ID = 1
	}
	return args.Error(0)
}

func (m *MockRepository) FindByID(ctx context.Context, id uint) (*domain.NotaFiscal, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.NotaFiscal), args.Error(1)
}

func (m *MockRepository) FindByUUID(ctx context.Context, uuidStr string) (*domain.NotaFiscal, error) {
	args := m.Called(ctx, uuidStr)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.NotaFiscal), args.Error(1)
}

func (m *MockRepository) FindAll(ctx context.Context) ([]domain.NotaFiscal, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]domain.NotaFiscal), args.Error(1)
}

func (m *MockRepository) UpdateStatus(ctx context.Context, id uint, status string) error {
	args := m.Called(ctx, id, status)
	return args.Error(0)
}

func (m *MockRepository) GetNextNumeroSequencial(ctx context.Context) (int64, error) {
	args := m.Called(ctx)
	return args.Get(0).(int64), args.Error(1)
}

func setupTestRouter() (*gin.Engine, *MockRepository) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	mockRepo := new(MockRepository)

	handler := handlers.NewNotaFiscalHandler(mockRepo, nil, nil)

	r.POST("/api/v1/notas-fiscais", handler.CreateNotaFiscalHandler)
	r.POST("/api/v1/notas-fiscais/:id/imprimir", handler.ImprimirNotaFiscalHandler)
	r.GET("/api/v1/notas-fiscais", handler.ListNotasFiscaisHandler)
	r.GET("/api/v1/notas-fiscais/:id", handler.GetNotaFiscalByIDHandler)

	return r, mockRepo
}

func TestCreateNotaFiscalHandler_Sucesso(t *testing.T) {
	router, mockRepo := setupTestRouter()

	mockRepo.On("GetNextNumeroSequencial", mock.Anything).Return(int64(1), nil)
	mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*domain.NotaFiscal")).Return(nil)

	reqBody := handlers.CreateNotaFiscalRequest{
		Itens: []handlers.CreateNotaFiscalItemRequest{
			{
				ProdutoID:     101,
				CodigoProduto: "PROD101",
				Quantidade:    2,
				PrecoUnitario: 50.0,
			},
		},
	}
	jsonBytes, _ := json.Marshal(reqBody)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/notas-fiscais", bytes.NewBuffer(jsonBytes))
	req.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	assert.Contains(t, w.Body.String(), `"success":true`)
	assert.Contains(t, w.Body.String(), `"status":"Aberta"`)
	mockRepo.AssertExpectations(t)
}

func TestCreateNotaFiscalHandler_PayloadInvalido(t *testing.T) {
	router, _ := setupTestRouter()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/notas-fiscais", bytes.NewBufferString("invalid json"))
	req.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), `"code":"INVALID_PAYLOAD"`)
}

func TestCreateNotaFiscalHandler_ErroNoBanco(t *testing.T) {
	router, mockRepo := setupTestRouter()

	mockRepo.On("GetNextNumeroSequencial", mock.Anything).Return(int64(1), nil)
	mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*domain.NotaFiscal")).Return(errors.New("db error"))

	reqBody := handlers.CreateNotaFiscalRequest{
		Itens: []handlers.CreateNotaFiscalItemRequest{
			{
				ProdutoID:     101,
				CodigoProduto: "PROD101",
				Quantidade:    2,
				PrecoUnitario: 50.0,
			},
		},
	}
	jsonBytes, _ := json.Marshal(reqBody)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/notas-fiscais", bytes.NewBuffer(jsonBytes))
	req.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), `"code":"DB_ERROR"`)
	mockRepo.AssertExpectations(t)
}

func TestImprimirNotaFiscalHandler_Sucesso(t *testing.T) {
	router, mockRepo := setupTestRouter()

	notaAberta := &domain.NotaFiscal{
		ID:               1,
		UUID:             "11111111-2222-3333-4444-555555555555",
		NumeroSequencial: 1,
		Status:           domain.StatusAberta,
		ValorTotal:       100.0,
		Itens: []domain.NotaFiscalItem{
			{ID: 1, ProdutoID: 101, CodigoProduto: "PROD101", Quantidade: 2, PrecoUnitario: 50.0, Subtotal: 100.0},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	mockRepo.On("FindByID", mock.Anything, uint(1)).Return(notaAberta, nil)
	mockRepo.On("UpdateStatus", mock.Anything, uint(1), domain.StatusEmProcessamento).Return(nil)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/notas-fiscais/1/imprimir", nil)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"message":"Nota fiscal enviada para processamento com sucesso"`)
	assert.Contains(t, w.Body.String(), `"status":"EmProcessamento"`)
	mockRepo.AssertExpectations(t)
}

func TestImprimirNotaFiscalHandler_FalhaSeJaFechada(t *testing.T) {
	router, mockRepo := setupTestRouter()

	notaFechada := &domain.NotaFiscal{
		ID:               1,
		UUID:             "11111111-2222-3333-4444-555555555555",
		NumeroSequencial: 1,
		Status:           domain.StatusFechada,
		ValorTotal:       100.0,
		Itens: []domain.NotaFiscalItem{
			{ID: 1, ProdutoID: 101, CodigoProduto: "PROD101", Quantidade: 2, PrecoUnitario: 50.0, Subtotal: 100.0},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	mockRepo.On("FindByID", mock.Anything, uint(1)).Return(notaFechada, nil)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/notas-fiscais/1/imprimir", nil)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), `"code":"STATUS_INVALIDO"`)
	assert.Contains(t, w.Body.String(), "apenas notas fiscais com status 'Aberta' podem ser impressas/finalizadas")
	mockRepo.AssertExpectations(t)
}

func TestImprimirNotaFiscalHandler_NaoEncontrada(t *testing.T) {
	router, mockRepo := setupTestRouter()

	mockRepo.On("FindByID", mock.Anything, uint(999)).Return(nil, repository.ErrNotaFiscalNaoEncontrada)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/notas-fiscais/999/imprimir", nil)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Contains(t, w.Body.String(), `"code":"NOT_FOUND"`)
	mockRepo.AssertExpectations(t)
}

func TestGetNotaFiscalByIDHandler_SucessoPorID(t *testing.T) {
	router, mockRepo := setupTestRouter()

	nota := &domain.NotaFiscal{
		ID:               1,
		UUID:             "11111111-2222-3333-4444-555555555555",
		NumeroSequencial: 1,
		Status:           domain.StatusAberta,
		ValorTotal:       100.0,
	}

	mockRepo.On("FindByID", mock.Anything, uint(1)).Return(nota, nil)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/notas-fiscais/1", nil)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"uuid":"11111111-2222-3333-4444-555555555555"`)
	mockRepo.AssertExpectations(t)
}

func TestGetNotaFiscalByIDHandler_SucessoPorUUID(t *testing.T) {
	router, mockRepo := setupTestRouter()

	uuidStr := "11111111-2222-3333-4444-555555555555"
	nota := &domain.NotaFiscal{
		ID:               1,
		UUID:             uuidStr,
		NumeroSequencial: 1,
		Status:           domain.StatusAberta,
		ValorTotal:       100.0,
	}

	mockRepo.On("FindByUUID", mock.Anything, uuidStr).Return(nota, nil)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/notas-fiscais/"+uuidStr, nil)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"uuid":"`+uuidStr+`"`)
	mockRepo.AssertExpectations(t)
}

func TestGetNotaFiscalByIDHandler_NaoEncontrado(t *testing.T) {
	router, mockRepo := setupTestRouter()

	mockRepo.On("FindByID", mock.Anything, uint(999)).Return(nil, repository.ErrNotaFiscalNaoEncontrada)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/notas-fiscais/999", nil)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Contains(t, w.Body.String(), `"code":"NOT_FOUND"`)
	mockRepo.AssertExpectations(t)
}

func TestListNotasFiscaisHandler_Sucesso(t *testing.T) {
	router, mockRepo := setupTestRouter()

	notas := []domain.NotaFiscal{
		{ID: 1, UUID: "uuid-1", Status: domain.StatusAberta},
		{ID: 2, UUID: "uuid-2", Status: domain.StatusFechada},
	}

	mockRepo.On("FindAll", mock.Anything).Return(notas, nil)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/notas-fiscais", nil)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"uuid-1"`)
	assert.Contains(t, w.Body.String(), `"uuid-2"`)
	mockRepo.AssertExpectations(t)
}
