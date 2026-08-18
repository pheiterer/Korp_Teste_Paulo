using Estoque.Application.DTOs;

namespace Estoque.Application.Interfaces;

public interface IProdutoService
{
    Task<ProdutoResponse> CriarAsync(CreateProdutoRequest request, CancellationToken cancellationToken = default);
    Task<IEnumerable<ProdutoResponse>> ObterTodosAsync(string? termoBusca = null, CancellationToken cancellationToken = default);
    Task<ProdutoResponse?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ProdutoResponse?> ObterPorCodigoAsync(string codigo, CancellationToken cancellationToken = default);
}
