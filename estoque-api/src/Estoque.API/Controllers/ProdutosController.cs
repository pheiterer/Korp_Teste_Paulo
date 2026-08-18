using Estoque.Application.DTOs;
using Estoque.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Estoque.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class ProdutosController : ControllerBase
{
    private readonly IProdutoService _produtoService;

    public ProdutosController(IProdutoService produtoService)
    {
        _produtoService = produtoService ?? throw new ArgumentNullException(nameof(produtoService));
    }

    /// <summary>
    /// Cadastra um novo produto no estoque.
    /// </summary>
    /// <param name="request">Dados do produto para cadastro.</param>
    /// <param name="cancellationToken">Token de cancelamento.</param>
    /// <returns>O produto cadastrado.</returns>
    [HttpPost]
    [ProducesResponseType(typeof(ProdutoResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ProdutoResponse>> Criar([FromBody] CreateProdutoRequest request, CancellationToken cancellationToken)
    {
        var produto = await _produtoService.CriarAsync(request, cancellationToken);
        return CreatedAtAction(nameof(ObterPorId), new { id = produto.Id }, produto);
    }

    /// <summary>
    /// Lista todos os produtos com suporte opcional a busca por código ou descrição.
    /// </summary>
    /// <param name="busca">Termo de busca opcional.</param>
    /// <param name="cancellationToken">Token de cancelamento.</param>
    /// <returns>Lista de produtos cadastrados.</returns>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<ProdutoResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ProdutoResponse>>> ObterTodos([FromQuery] string? busca, CancellationToken cancellationToken)
    {
        var produtos = await _produtoService.ObterTodosAsync(busca, cancellationToken);
        return Ok(produtos);
    }

    /// <summary>
    /// Obtém um produto pelo seu identificador único (ID).
    /// </summary>
    /// <param name="id">Identificador único do produto.</param>
    /// <param name="cancellationToken">Token de cancelamento.</param>
    /// <returns>O produto encontrado.</returns>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ProdutoResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProdutoResponse>> ObterPorId(Guid id, CancellationToken cancellationToken)
    {
        var produto = await _produtoService.ObterPorIdAsync(id, cancellationToken);
        if (produto is null)
        {
            return NotFound(new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = "Produto Não Encontrado",
                Detail = $"Nenhum produto foi encontrado com o ID '{id}'.",
                Instance = HttpContext.Request.Path
            });
        }

        return Ok(produto);
    }

    /// <summary>
    /// Obtém um produto pelo seu código único.
    /// </summary>
    /// <param name="codigo">Código do produto.</param>
    /// <param name="cancellationToken">Token de cancelamento.</param>
    /// <returns>O produto encontrado.</returns>
    [HttpGet("codigo/{codigo}")]
    [ProducesResponseType(typeof(ProdutoResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProdutoResponse>> ObterPorCodigo(string codigo, CancellationToken cancellationToken)
    {
        var produto = await _produtoService.ObterPorCodigoAsync(codigo, cancellationToken);
        if (produto is null)
        {
            return NotFound(new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = "Produto Não Encontrado",
                Detail = $"Nenhum produto foi encontrado com o código '{codigo}'.",
                Instance = HttpContext.Request.Path
            });
        }

        return Ok(produto);
    }
}
