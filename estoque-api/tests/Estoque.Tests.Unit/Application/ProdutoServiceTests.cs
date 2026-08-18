using Estoque.Application.DTOs;
using Estoque.Application.Services;
using Estoque.Application.Validators;
using Estoque.Domain.Entities;
using Estoque.Domain.Exceptions;
using Estoque.Domain.Interfaces;
using FluentAssertions;
using FluentValidation;
using Moq;

namespace Estoque.Tests.Unit.Application;

public class ProdutoServiceTests
{
    private readonly Mock<IProdutoRepository> _produtoRepositoryMock;
    private readonly CreateProdutoRequestValidator _validator;
    private readonly ProdutoService _sut; // System Under Test

    public ProdutoServiceTests()
    {
        _produtoRepositoryMock = new Mock<IProdutoRepository>();
        _validator = new CreateProdutoRequestValidator();
        _sut = new ProdutoService(_produtoRepositoryMock.Object, _validator);
    }

    [Fact]
    public async Task CriarAsync_ComDadosValidos_DeveCriarEComitarProduto()
    {
        // Arrange
        var request = new CreateProdutoRequest("PROD001", "Parafuso Sextavado", 100);

        _produtoRepositoryMock
            .Setup(r => r.ExistsCodigoAsync("PROD001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        var result = await _sut.CriarAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().NotBeEmpty();
        result.Codigo.Should().Be("PROD001");
        result.Descricao.Should().Be("Parafuso Sextavado");
        result.Saldo.Should().Be(100);

        _produtoRepositoryMock.Verify(r => r.AddAsync(It.Is<Produto>(p => p.Codigo == "PROD001"), It.IsAny<CancellationToken>()), Times.Once);
        _produtoRepositoryMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData("", "Descricao Valida", 10)]
    [InlineData("PROD01", "", 10)]
    [InlineData("PROD01", "Descricao Valida", -5)]
    public async Task CriarAsync_ComPayloadInvalido_DeveLancarValidationException(string codigo, string descricao, int saldoInicial)
    {
        // Arrange
        var request = new CreateProdutoRequest(codigo, descricao, saldoInicial);

        // Act
        Func<Task> act = async () => await _sut.CriarAsync(request);

        // Assert
        await act.Should().ThrowAsync<ValidationException>();
        _produtoRepositoryMock.Verify(r => r.AddAsync(It.IsAny<Produto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CriarAsync_ComCodigoJaExistente_DeveLancarDomainException()
    {
        // Arrange
        var request = new CreateProdutoRequest("PROD001", "Porca M8", 50);

        _produtoRepositoryMock
            .Setup(r => r.ExistsCodigoAsync("PROD001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        Func<Task> act = async () => await _sut.CriarAsync(request);

        // Assert
        await act.Should().ThrowAsync<DomainException>()
            .WithMessage("*Já existe um produto cadastrado com o código 'PROD001'*");

        _produtoRepositoryMock.Verify(r => r.AddAsync(It.IsAny<Produto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ObterTodosAsync_ComFiltro_DeveFiltrarProdutosViaLINQ()
    {
        // Arrange
        var produtos = new List<Produto>
        {
            new("PROD01", "Chave de Fenda", 10),
            new("PROD02", "Alicate Universal", 5),
            new("FERR01", "Martelo de Borracha", 20)
        };

        _produtoRepositoryMock
            .Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(produtos);

        // Act
        var result = await _sut.ObterTodosAsync("Fenda");

        // Assert
        result.Should().HaveCount(1);
        result.First().Codigo.Should().Be("PROD01");
        result.First().Descricao.Should().Be("Chave de Fenda");
    }

    [Fact]
    public async Task ObterPorIdAsync_QuandoExistente_DeveRetornarProdutoResponse()
    {
        // Arrange
        var produto = new Produto("PROD01", "Furadeira Impacto", 15);
        _produtoRepositoryMock
            .Setup(r => r.GetByIdAsync(produto.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(produto);

        // Act
        var result = await _sut.ObterPorIdAsync(produto.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(produto.Id);
        result.Codigo.Should().Be("PROD01");
    }

    [Fact]
    public async Task ObterPorIdAsync_QuandoInexistente_DeveRetornarNull()
    {
        // Arrange
        var idInexistente = Guid.NewGuid();
        _produtoRepositoryMock
            .Setup(r => r.GetByIdAsync(idInexistente, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Produto?)null);

        // Act
        var result = await _sut.ObterPorIdAsync(idInexistente);

        // Assert
        result.Should().BeNull();
    }
}
