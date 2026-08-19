export type NotaFiscalStatus = 'Aberta' | 'EmProcessamento' | 'Fechada' | 'Cancelada';

export interface NotaFiscalItem {
  id?: number | string;
  codigoProduto: string;
  descricaoProduto?: string;
  quantidade: number;
  precoUnitario: number;
  valorTotal?: number;
}

export interface CreateNotaFiscalItemRequest {
  codigoProduto: string;
  quantidade: number;
  precoUnitario: number;
}

export interface CreateNotaFiscalRequest {
  itens: CreateNotaFiscalItemRequest[];
}

export interface NotaFiscal {
  id: number | string;
  uuid?: string;
  status: NotaFiscalStatus;
  valorTotal: number;
  dataCriacao?: string;
  itens: NotaFiscalItem[];
}
