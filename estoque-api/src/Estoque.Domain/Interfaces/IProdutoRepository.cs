using Estoque.Domain.Entities;

namespace Estoque.Domain.Interfaces;

public interface IProdutoRepository
{
    Task<Produto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Produto?> GetByCodigoAsync(string codigo, CancellationToken cancellationToken = default);
    Task<IEnumerable<Produto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task AddAsync(Produto produto, CancellationToken cancellationToken = default);
    void Update(Produto produto);
    void Remove(Produto produto);
    Task<bool> ExistsCodigoAsync(string codigo, CancellationToken cancellationToken = default);
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
