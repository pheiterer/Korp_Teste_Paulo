using Estoque.Application.Contracts;
using Estoque.Application.Interfaces;
using Estoque.Domain.Entities;
using Estoque.Domain.Interfaces;
using Estoque.Infrastructure.Consumers;
using Estoque.Infrastructure.Persistence;
using FluentAssertions;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;

namespace Estoque.Tests.Unit.Consumers;

public class NotaFiscalEmitidaConsumerTests
{
    private readonly Mock<IProdutoRepository> _produtoRepositoryMock;
    private readonly Mock<IIdempotencyService> _idempotencyServiceMock;
    private readonly Mock<IDistributedLockService> _distributedLockServiceMock;
    private readonly Mock<IProdutoCacheService> _cacheServiceMock;
    private readonly Mock<ILogger<NotaFiscalEmitidaConsumer>> _loggerMock;
    private readonly Mock<ConsumeContext<NotaFiscalEmitidaEvent>> _consumeContextMock;
    private readonly EstoqueDbContext _context;
    private readonly NotaFiscalEmitidaConsumer _sut;

    public NotaFiscalEmitidaConsumerTests()
    {
        _produtoRepositoryMock = new Mock<IProdutoRepository>();
        _idempotencyServiceMock = new Mock<IIdempotencyService>();
        _distributedLockServiceMock = new Mock<IDistributedLockService>();
        _cacheServiceMock = new Mock<IProdutoCacheService>();
        _loggerMock = new Mock<ILogger<NotaFiscalEmitidaConsumer>>();
        _consumeContextMock = new Mock<ConsumeContext<NotaFiscalEmitidaEvent>>();

        var options = new DbContextOptionsBuilder<EstoqueDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        _context = new EstoqueDbContext(options);

        _sut = new NotaFiscalEmitidaConsumer(
            _produtoRepositoryMock.Object,
            _context,
            _idempotencyServiceMock.Object,
            _distributedLockServiceMock.Object,
            _cacheServiceMock.Object,
            _loggerMock.Object
        );
    }

    [Fact]
    public async Task Consume_ComMensagemValida_DeveDebitarSaldoERegistrarIdempotencia()
    {
        // Arrange
        var notaFiscalId = Guid.NewGuid();
        var evento = new NotaFiscalEmitidaEvent(
            notaFiscalId,
            "NF-001",
            new List<NotaFiscalItemEvent> { new("PROD01", 5) },
            DateTime.UtcNow
        );

        var produto = new Produto("PROD01", "Produto Teste", 20);

        _consumeContextMock.Setup(c => c.Message).Returns(evento);
        _consumeContextMock.Setup(c => c.CancellationToken).Returns(CancellationToken.None);

        _idempotencyServiceMock
            .Setup(i => i.RequestExistsAsync(notaFiscalId.ToString(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var lockMock = new Mock<IDisposable>();
        _distributedLockServiceMock
            .Setup(d => d.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(lockMock.Object);

        _produtoRepositoryMock
            .Setup(r => r.GetByCodigoAsync("PROD01", It.IsAny<CancellationToken>()))
            .ReturnsAsync(produto);

        // Act
        await _sut.Consume(_consumeContextMock.Object);

        // Assert
        produto.Saldo.Should().Be(15);
        _produtoRepositoryMock.Verify(r => r.Update(produto), Times.Once);
        _produtoRepositoryMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        _idempotencyServiceMock.Verify(i => i.SaveRequestAsync(notaFiscalId.ToString(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Consume_ComMensagemJaProcessada_DeveIgnorarSemDebitar()
    {
        // Arrange
        var notaFiscalId = Guid.NewGuid();
        var evento = new NotaFiscalEmitidaEvent(
            notaFiscalId,
            "NF-001",
            new List<NotaFiscalItemEvent> { new("PROD01", 5) },
            DateTime.UtcNow
        );

        _consumeContextMock.Setup(c => c.Message).Returns(evento);
        _consumeContextMock.Setup(c => c.CancellationToken).Returns(CancellationToken.None);

        _idempotencyServiceMock
            .Setup(i => i.RequestExistsAsync(notaFiscalId.ToString(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true); // Já processado

        // Act
        await _sut.Consume(_consumeContextMock.Object);

        // Assert
        _produtoRepositoryMock.Verify(r => r.GetByCodigoAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _produtoRepositoryMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Consume_ComSaldoInsuficiente_DevePublicarAbatimentoEstoqueFalhouEvent()
    {
        // Arrange
        var notaFiscalId = Guid.NewGuid();
        var evento = new NotaFiscalEmitidaEvent(
            notaFiscalId,
            "NF-002",
            new List<NotaFiscalItemEvent> { new("PROD02", 50) },
            DateTime.UtcNow
        );

        var produto = new Produto("PROD02", "Produto Com Saldo Baixo", 10);

        _consumeContextMock.Setup(c => c.Message).Returns(evento);
        _consumeContextMock.Setup(c => c.CancellationToken).Returns(CancellationToken.None);

        _idempotencyServiceMock
            .Setup(i => i.RequestExistsAsync(notaFiscalId.ToString(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var lockMock = new Mock<IDisposable>();
        _distributedLockServiceMock
            .Setup(d => d.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(lockMock.Object);

        _produtoRepositoryMock
            .Setup(r => r.GetByCodigoAsync("PROD02", It.IsAny<CancellationToken>()))
            .ReturnsAsync(produto);

        // Act
        await _sut.Consume(_consumeContextMock.Object);

        // Assert
        produto.Saldo.Should().Be(10); // Não deve ter alterado
        _consumeContextMock.Verify(c => c.Publish(
            It.Is<AbatimentoEstoqueFalhouEvent>(e => e.NotaFiscalId == notaFiscalId && e.Motivo.Contains("Saldo insuficiente")),
            It.IsAny<CancellationToken>()
        ), Times.Once);
    }
}
