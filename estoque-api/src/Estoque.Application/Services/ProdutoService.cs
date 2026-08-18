using Estoque.Application.DTOs;
using Estoque.Application.Interfaces;
using Estoque.Domain.Entities;
using Estoque.Domain.Exceptions;
using Estoque.Domain.Interfaces;
using FluentValidation;

namespace Estoque.Application.Services;

public class ProdutoService : IProdutoService
{
    private readonly IProdutoRepository _produtoRepository;
    private readonly IValidator<CreateProdutoRequest> _validator;
    private readonly IProdutoCacheService _cacheService;

    public ProdutoService(
        IProdutoRepository produtoRepository,
        IValidator<CreateProdutoRequest> validator,
        IProdutoCacheService cacheService = null!)
    {
        _produtoRepository = produtoRepository ?? throw new ArgumentNullException(nameof(produtoRepository));
        _validator = validator ?? throw new ArgumentNullException(nameof(validator));
        _cacheService = cacheService;
    }

    public async Task<ProdutoResponse> CriarAsync(CreateProdutoRequest request, CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var existeCodigo = await _produtoRepository.ExistsCodigoAsync(request.Codigo, cancellationToken);
        if (existeCodigo)
        {
            throw new DomainException($"Já existe um produto cadastrado com o código '{request.Codigo.Trim().ToUpperInvariant()}'.");
        }

        var produto = new Produto(request.Codigo, request.Descricao, request.SaldoInicial);

        await _produtoRepository.AddAsync(produto, cancellationToken);
        await _produtoRepository.SaveChangesAsync(cancellationToken);

        if (_cacheService != null)
        {
            await _cacheService.SetProdutoCacheAsync(produto.Codigo, produto.Descricao, produto.Saldo, cancellationToken);
        }

        return MapToResponse(produto);
    }

    public async Task<IEnumerable<ProdutoResponse>> ObterTodosAsync(string? termoBusca = null, CancellationToken cancellationToken = default)
    {
        var produtos = await _produtoRepository.GetAllAsync(cancellationToken);

        var query = produtos.AsQueryable();

        if (!string.IsNullOrWhiteSpace(termoBusca))
        {
            var termo = termoBusca.Trim().ToUpperInvariant();
            query = query.Where(p =>
                p.Codigo.ToUpperInvariant().Contains(termo) ||
                p.Descricao.ToUpperInvariant().Contains(termo));
        }

        return query
            .OrderBy(p => p.Codigo)
            .Select(p => MapToResponse(p))
            .ToList();
    }

    public async Task<ProdutoResponse?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var produto = await _produtoRepository.GetByIdAsync(id, cancellationToken);
        return produto is null ? null : MapToResponse(produto);
    }

    public async Task<ProdutoResponse?> ObterPorCodigoAsync(string codigo, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(codigo))
        {
            return null;
        }

        var produto = await _produtoRepository.GetByCodigoAsync(codigo, cancellationToken);
        return produto is null ? null : MapToResponse(produto);
    }

    private static ProdutoResponse MapToResponse(Produto produto)
    {
        return new ProdutoResponse(
            produto.Id,
            produto.Codigo,
            produto.Descricao,
            produto.Saldo
        );
    }
}
