export type NotaFiscalStatus = 'Aberta' | 'EmProcessamento' | 'Fechada' | 'Cancelada';

export interface NotaFiscalItem {
  id?: number | string;
  nota_fiscal_id?: number;
  produto_id?: number;
  codigo_produto?: string;
  codigoProduto?: string;
  descricaoProduto?: string;
  quantidade: number;
  preco_unitario?: number;
  precoUnitario?: number;
  subtotal?: number;
  valorTotal?: number;
  motivo_erro?: string;
  motivoErro?: string;
}

export interface CreateNotaFiscalItemRequest {
  codigo_produto?: string;
  codigoProduto?: string;
  produto_id?: number;
  produtoId?: number;
  quantidade: number;
  preco_unitario?: number;
  precoUnitario?: number;
}

export interface CreateNotaFiscalRequest {
  itens: CreateNotaFiscalItemRequest[];
}

export interface NotaFiscal {
  id: number | string;
  uuid?: string;
  numero_sequencial?: number;
  numeroSequencial?: number;
  status: NotaFiscalStatus;
  motivo_cancelamento?: string;
  motivoCancelamento?: string;
  valor_total?: number;
  valorTotal?: number;
  created_at?: string;
  updated_at?: string;
  dataCriacao?: string;
  itens: NotaFiscalItem[];
}
