using Estoque.Domain.Entities;
using Estoque.Domain.Exceptions;
using FluentAssertions;
using Xunit;

namespace Estoque.Tests.Unit.Domain;

public class ProdutoTests
{
    [Fact]
    public void CriarProduto_ComDadosValidos_DeveInstanciarComSucesso()
    {
        // Arrange
        var codigo = "PROD-001";
        var descricao = "Produto Teste";
        var saldoInicial = 10;

        // Act
        var produto = new Produto(codigo, descricao, saldoInicial);

        // Assert
        produto.Should().NotBeNull();
        produto.Id.Should().NotBeEmpty();
        produto.Codigo.Should().Be("PROD-001");
        produto.Descricao.Should().Be("Produto Teste");
        produto.Saldo.Should().Be(10);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void CriarProduto_ComCodigoInvalido_DeveLancarDomainException(string? codigoInvalido)
    {
        // Act
        Action act = () => new Produto(codigoInvalido!, "Descrição Valida", 5);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("*código*");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void CriarProduto_ComDescricaoInvalida_DeveLancarDomainException(string? descricaoInvalida)
    {
        // Act
        Action act = () => new Produto("PROD-001", descricaoInvalida!, 5);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("*descrição*");
    }

    [Fact]
    public void CriarProduto_ComSaldoNegativo_DeveLancarDomainException()
    {
        // Act
        Action act = () => new Produto("PROD-001", "Descrição Válida", -1);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("*saldo*");
    }

    [Fact]
    public void AdicionarSaldo_ComQuantidadeValida_DeveIncrementarSaldo()
    {
        // Arrange
        var produto = new Produto("PROD-001", "Produto Teste", 10);

        // Act
        produto.AdicionarSaldo(5);

        // Assert
        produto.Saldo.Should().Be(15);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public void AdicionarSaldo_ComQuantidadeInvalida_DeveLancarDomainException(int quantidade)
    {
        // Arrange
        var produto = new Produto("PROD-001", "Produto Teste", 10);

        // Act
        Action act = () => produto.AdicionarSaldo(quantidade);

        // Assert
        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void DebitarSaldo_ComQuantidadeValida_DeveDecrementarSaldo()
    {
        // Arrange
        var produto = new Produto("PROD-001", "Produto Teste", 10);

        // Act
        produto.DebitarSaldo(4);

        // Assert
        produto.Saldo.Should().Be(6);
    }

    [Fact]
    public void DebitarSaldo_ComQuantidadeMaiorQueSaldo_DeveLancarDomainException()
    {
        // Arrange
        var produto = new Produto("PROD-001", "Produto Teste", 5);

        // Act
        Action act = () => produto.DebitarSaldo(10);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("*Saldo insuficiente*");
    }
}
