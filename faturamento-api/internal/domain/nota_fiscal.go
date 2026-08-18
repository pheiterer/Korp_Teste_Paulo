package domain

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

// Definicao de status padrao para Nota Fiscal
const (
	StatusAberta          = "Aberta"
	StatusEmProcessamento = "EmProcessamento"
	StatusFechada         = "Fechada"
	StatusErro            = "Erro"
	StatusCancelada       = "Cancelada"
)

// Erros de Dominio
var (
	ErrNotaSemItens         = errors.New("a nota fiscal deve conter pelo menos um item")
	ErrNotaNaoAberta        = errors.New("apenas notas fiscais com status 'Aberta' podem ser impressas/finalizadas")
	ErrQuantidadeInvalida   = errors.New("a quantidade do item deve ser maior que zero")
	ErrPrecoInvalido        = errors.New("o preco unitario do item nao pode ser negativo")
	ErrProdutoIdObrigatorio = errors.New("o codigo/ID do produto eh obrigatorio")
)

// NotaFiscal representa a entidade principal de Faturamento no SQL Server.
type NotaFiscal struct {
	ID               uint             `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	UUID             string           `gorm:"type:varchar(36);not null;index;column:uuid" json:"uuid"`
	NumeroSequencial int64            `gorm:"type:bigint;not null;index;column:numero_sequencial" json:"numero_sequencial"`
	Status           string           `gorm:"type:varchar(20);not null;default:'Aberta';column:status" json:"status"`
	ValorTotal       float64          `gorm:"type:decimal(18,2);not null;default:0.00;column:valor_total" json:"valor_total"`
	Itens            []NotaFiscalItem `gorm:"foreignKey:NotaFiscalID;constraint:OnDelete:CASCADE;" json:"itens,omitempty"`
	CreatedAt        time.Time        `gorm:"type:datetime2;not null;default:CURRENT_TIMESTAMP;column:created_at" json:"created_at"`
	UpdatedAt        time.Time        `gorm:"type:datetime2;not null;default:CURRENT_TIMESTAMP;column:updated_at" json:"updated_at"`
}

// NotaFiscalItem representa os itens associados a uma Nota Fiscal.
type NotaFiscalItem struct {
	ID            uint      `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	NotaFiscalID  uint      `gorm:"type:bigint;not null;index;column:nota_fiscal_id" json:"nota_fiscal_id"`
	ProdutoID     int64     `gorm:"type:bigint;not null;column:produto_id" json:"produto_id"`
	CodigoProduto string    `gorm:"type:varchar(50);not null;column:codigo_produto" json:"codigo_produto"`
	Quantidade    int       `gorm:"type:int;not null;column:quantidade" json:"quantidade"`
	PrecoUnitario float64   `gorm:"type:decimal(18,2);not null;default:0.00;column:preco_unitario" json:"preco_unitario"`
	Subtotal      float64   `gorm:"type:decimal(18,2);not null;default:0.00;column:subtotal" json:"subtotal"`
	CreatedAt     time.Time `gorm:"type:datetime2;not null;default:CURRENT_TIMESTAMP;column:created_at" json:"created_at"`
}

// TableName especifica o nome da tabela no SQL Server.
func (NotaFiscal) TableName() string {
	return "notas_fiscais"
}

// TableName especifica o nome da tabela no SQL Server.
func (NotaFiscalItem) TableName() string {
	return "nota_fiscal_itens"
}

// NewNotaFiscal instancia uma nova Nota Fiscal com status 'Aberta'.
func NewNotaFiscal(numeroSequencial int64, itens []NotaFiscalItem) (*NotaFiscal, error) {
	if len(itens) == 0 {
		return nil, ErrNotaSemItens
	}

	nota := &NotaFiscal{
		UUID:             uuid.New().String(),
		NumeroSequencial: numeroSequencial,
		Status:           StatusAberta,
		Itens:            itens,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	if err := nota.ValidateAndCalculate(); err != nil {
		return nil, err
	}

	return nota, nil
}

// ValidateAndCalculate valida as regras de negocio dos itens e calcula o valor total.
func (n *NotaFiscal) ValidateAndCalculate() error {
	if len(n.Itens) == 0 {
		return ErrNotaSemItens
	}

	if n.UUID == "" {
		n.UUID = uuid.New().String()
	}

	var total float64
	for i := range n.Itens {
		item := &n.Itens[i]
		if item.ProdutoID <= 0 && item.CodigoProduto == "" {
			return ErrProdutoIdObrigatorio
		}
		if item.Quantidade <= 0 {
			return ErrQuantidadeInvalida
		}
		if item.PrecoUnitario < 0 {
			return ErrPrecoInvalido
		}
		item.Subtotal = float64(item.Quantidade) * item.PrecoUnitario
		total += item.Subtotal
	}

	n.ValorTotal = total
	return nil
}

// CanBePrinted verifica se a Nota Fiscal esta apta para ser impressa/fechada.
func (n *NotaFiscal) CanBePrinted() error {
	if n.Status != StatusAberta {
		return ErrNotaNaoAberta
	}
	if len(n.Itens) == 0 {
		return ErrNotaSemItens
	}
	return nil
}

// IniciarProcessamento altera o status para 'EmProcessamento'.
func (n *NotaFiscal) IniciarProcessamento() error {
	if err := n.CanBePrinted(); err != nil {
		return err
	}
	n.Status = StatusEmProcessamento
	n.UpdatedAt = time.Now()
	return nil
}

// Fechar altera o status da Nota Fiscal para 'Fechada'.
func (n *NotaFiscal) Fechar() error {
	n.Status = StatusFechada
	n.UpdatedAt = time.Now()
	return nil
}

// Cancelar altera o status da Nota Fiscal para 'Cancelada'.
func (n *NotaFiscal) Cancelar() {
	n.Status = StatusCancelada
	n.UpdatedAt = time.Now()
}
