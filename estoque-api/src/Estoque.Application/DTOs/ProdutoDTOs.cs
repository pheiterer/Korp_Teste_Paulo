namespace Estoque.Application.DTOs;

public record CreateProdutoRequest(string Codigo, string Descricao, int SaldoInicial = 0);

public record ProdutoResponse(Guid Id, string Codigo, string Descricao, int Saldo);
