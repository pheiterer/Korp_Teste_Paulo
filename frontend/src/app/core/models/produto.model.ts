export interface Produto {
  id?: number | string;
  codigo: string;
  descricao: string;
  saldo: number;
}

export interface CreateProdutoRequest {
  codigo: string;
  descricao: string;
  saldo: number;
}
