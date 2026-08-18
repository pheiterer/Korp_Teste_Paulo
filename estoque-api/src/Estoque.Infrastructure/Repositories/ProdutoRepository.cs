using Estoque.Domain.Entities;
using Estoque.Domain.Interfaces;
using Estoque.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Estoque.Infrastructure.Repositories;

public class ProdutoRepository : IProdutoRepository
{
    private readonly EstoqueDbContext _context;

    public ProdutoRepository(EstoqueDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }

    public async Task<Produto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Produtos
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
    }

    public async Task<Produto?> GetByCodigoAsync(string codigo, CancellationToken cancellationToken = default)
    {
        var codigoNormalized = codigo.Trim().ToUpperInvariant();
        return await _context.Produtos
            .FirstOrDefaultAsync(p => p.Codigo == codigoNormalized, cancellationToken);
    }

    public async Task<IEnumerable<Produto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Produtos
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Produto produto, CancellationToken cancellationToken = default)
    {
        await _context.Produtos.AddAsync(produto, cancellationToken);
    }

    public void Update(Produto produto)
    {
        _context.Produtos.Update(produto);
    }

    public void Remove(Produto produto)
    {
        _context.Produtos.Remove(produto);
    }

    public async Task<bool> ExistsCodigoAsync(string codigo, CancellationToken cancellationToken = default)
    {
        var codigoNormalized = codigo.Trim().ToUpperInvariant();
        return await _context.Produtos
            .AnyAsync(p => p.Codigo == codigoNormalized, cancellationToken);
    }

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }
}
