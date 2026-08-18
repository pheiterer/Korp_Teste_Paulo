package domain_test

import (
	"testing"

	"faturamento-api/internal/domain"

	"github.com/stretchr/testify/assert"
)

func TestNewNotaFiscal_Sucesso(t *testing.T) {
	itens := []domain.NotaFiscalItem{
		{
			ProdutoID:     101,
			Quantidade:    2,
			PrecoUnitario: 50.0,
		},
		{
			ProdutoID:     102,
			Quantidade:    1,
			PrecoUnitario: 30.0,
		},
	}

	nota, err := domain.NewNotaFiscal(1, itens)

	assert.NoError(t, err)
	assert.NotNil(t, nota)
	assert.Equal(t, int64(1), nota.NumeroSequencial)
	assert.Equal(t, domain.StatusAberta, nota.Status)
	assert.Equal(t, 130.0, nota.ValorTotal)
	assert.Len(t, nota.Itens, 2)
	assert.Equal(t, 100.0, nota.Itens[0].Subtotal)
	assert.Equal(t, 30.0, nota.Itens[1].Subtotal)
}

func TestNewNotaFiscal_SemItens(t *testing.T) {
	nota, err := domain.NewNotaFiscal(1, []domain.NotaFiscalItem{})

	assert.ErrorIs(t, err, domain.ErrNotaSemItens)
	assert.Nil(t, nota)
}

func TestNewNotaFiscal_QuantidadeInvalida(t *testing.T) {
	itens := []domain.NotaFiscalItem{
		{
			ProdutoID:     101,
			Quantidade:    0,
			PrecoUnitario: 50.0,
		},
	}

	nota, err := domain.NewNotaFiscal(1, itens)

	assert.ErrorIs(t, err, domain.ErrQuantidadeInvalida)
	assert.Nil(t, nota)
}

func TestNewNotaFiscal_PrecoInvalido(t *testing.T) {
	itens := []domain.NotaFiscalItem{
		{
			ProdutoID:     101,
			Quantidade:    1,
			PrecoUnitario: -10.0,
		},
	}

	nota, err := domain.NewNotaFiscal(1, itens)

	assert.ErrorIs(t, err, domain.ErrPrecoInvalido)
	assert.Nil(t, nota)
}

func TestNotaFiscal_FecharSucesso(t *testing.T) {
	itens := []domain.NotaFiscalItem{
		{
			ProdutoID:     1,
			Quantidade:    1,
			PrecoUnitario: 100.0,
		},
	}

	nota, err := domain.NewNotaFiscal(1, itens)
	assert.NoError(t, err)

	err = nota.Fechar()
	assert.NoError(t, err)
	assert.Equal(t, domain.StatusFechada, nota.Status)
}

func TestNotaFiscal_FecharJaFechada(t *testing.T) {
	itens := []domain.NotaFiscalItem{
		{
			ProdutoID:     1,
			Quantidade:    1,
			PrecoUnitario: 100.0,
		},
	}

	nota, err := domain.NewNotaFiscal(1, itens)
	assert.NoError(t, err)
	_ = nota.Fechar()

	// Tentativa de fechar novamente deve falhar
	err = nota.Fechar()
	assert.ErrorIs(t, err, domain.ErrNotaNaoAberta)
}
