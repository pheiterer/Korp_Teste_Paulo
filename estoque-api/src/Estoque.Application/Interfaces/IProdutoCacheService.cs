namespace Estoque.Application.Interfaces;

public interface IProdutoCacheService
{
    Task SetProdutoCacheAsync(string codigo, string descricao, int saldo, CancellationToken cancellationToken = default);
    Task UpdateSaldoCacheAsync(string codigo, int novoSaldo, CancellationToken cancellationToken = default);
}
