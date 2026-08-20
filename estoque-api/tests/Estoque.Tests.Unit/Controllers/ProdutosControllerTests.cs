using Estoque.API.Controllers;
using Estoque.Application.DTOs;
using Estoque.Application.Interfaces;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace Estoque.Tests.Unit.Controllers;

public class ProdutosControllerTests
{
    private readonly Mock<IProdutoService> _produtoServiceMock;
    private readonly ProdutosController _sut;

    public ProdutosControllerTests()
    {
        _produtoServiceMock = new Mock<IProdutoService>();
        _sut = new ProdutosController(_produtoServiceMock.Object)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };
    }

    [Fact]
    public async Task Criar_ComRequisicaoValida_DeveRetornar201Created()
    {
        // Arrange
        var request = new CreateProdutoRequest("PROD01", "Chave Fenda", 10);
        var response = new ProdutoResponse(Guid.NewGuid(), "PROD01", "Chave Fenda", 10);

        _produtoServiceMock
            .Setup(s => s.CriarAsync(request, It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        // Act
        var result = await _sut.Criar(request, CancellationToken.None);

        // Assert
        var createdResult = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        createdResult.StatusCode.Should().Be(201);
        createdResult.Value.Should().Be(response);
    }

    [Fact]
    public async Task ObterTodos_DeveRetornar200OKComLista()
    {
        // Arrange
        var produtos = new List<ProdutoResponse>
        {
            new(Guid.NewGuid(), "PROD01", "Produto 1", 10)
        };

        _produtoServiceMock
            .Setup(s => s.ObterTodosAsync(It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(produtos);

        // Act
        var result = await _sut.ObterTodos(null, CancellationToken.None);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.StatusCode.Should().Be(200);
        okResult.Value.Should().BeEquivalentTo(produtos);
    }

    [Fact]
    public async Task ObterPorId_QuandoExistente_DeveRetornar200OK()
    {
        // Arrange
        var id = Guid.NewGuid();
        var response = new ProdutoResponse(id, "PROD01", "Produto 1", 10);

        _produtoServiceMock
            .Setup(s => s.ObterPorIdAsync(id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        // Act
        var result = await _sut.ObterPorId(id, CancellationToken.None);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.StatusCode.Should().Be(200);
        okResult.Value.Should().Be(response);
    }

    [Fact]
    public async Task ObterPorId_QuandoInexistente_DeveRetornar404NotFound()
    {
        // Arrange
        var id = Guid.NewGuid();

        _produtoServiceMock
            .Setup(s => s.ObterPorIdAsync(id, It.IsAny<CancellationToken>()))
            .ReturnsAsync((ProdutoResponse?)null);

        // Act
        var result = await _sut.ObterPorId(id, CancellationToken.None);

        // Assert
        var notFoundResult = result.Result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFoundResult.StatusCode.Should().Be(404);
    }

    [Fact]
    public async Task ObterPorCodigo_QuandoExistente_DeveRetornar200OK()
    {
        // Arrange
        var codigo = "PROD01";
        var response = new ProdutoResponse(Guid.NewGuid(), codigo, "Produto 1", 10);

        _produtoServiceMock
            .Setup(s => s.ObterPorCodigoAsync(codigo, It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        // Act
        var result = await _sut.ObterPorCodigo(codigo, CancellationToken.None);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.StatusCode.Should().Be(200);
        okResult.Value.Should().Be(response);
    }

    [Fact]
    public async Task ObterPorCodigo_QuandoInexistente_DeveRetornar404NotFound()
    {
        // Arrange
        var codigo = "PROD_INEXISTENTE";

        _produtoServiceMock
            .Setup(s => s.ObterPorCodigoAsync(codigo, It.IsAny<CancellationToken>()))
            .ReturnsAsync((ProdutoResponse?)null);

        // Act
        var result = await _sut.ObterPorCodigo(codigo, CancellationToken.None);

        // Assert
        var notFoundResult = result.Result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFoundResult.StatusCode.Should().Be(404);
    }
}
