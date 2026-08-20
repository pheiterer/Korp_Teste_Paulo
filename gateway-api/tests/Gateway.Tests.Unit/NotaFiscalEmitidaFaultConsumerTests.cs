using Estoque.Application.Contracts;
using FluentAssertions;
using Gateway.Api.Consumers;
using Gateway.Api.Hubs;
using MassTransit;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Gateway.Tests.Unit;

public class NotaFiscalEmitidaFaultConsumerTests
{
    private readonly Mock<IHubContext<NotificationHub>> _hubContextMock;
    private readonly Mock<IHubClients> _hubClientsMock;
    private readonly Mock<ISingleClientProxy> _clientProxyMock;
    private readonly Mock<ILogger<NotaFiscalEmitidaFaultConsumer>> _loggerMock;
    private readonly NotaFiscalEmitidaFaultConsumer _sut;

    public NotaFiscalEmitidaFaultConsumerTests()
    {
        _hubContextMock = new Mock<IHubContext<NotificationHub>>();
        _hubClientsMock = new Mock<IHubClients>();
        _clientProxyMock = new Mock<ISingleClientProxy>();
        _loggerMock = new Mock<ILogger<NotaFiscalEmitidaFaultConsumer>>();

        _hubClientsMock.Setup(c => c.All).Returns(_clientProxyMock.Object);
        _hubContextMock.Setup(h => h.Clients).Returns(_hubClientsMock.Object);

        _sut = new NotaFiscalEmitidaFaultConsumer(_hubContextMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task Consume_ComFaultValido_DeveNotificarSignalR()
    {
        // Arrange
        var notaFiscalId = Guid.NewGuid();
        var eventoOrigem = new NotaFiscalEmitidaEvent(notaFiscalId, "NF-100", new List<NotaFiscalItemEvent>(), DateTime.UtcNow);
        var faultInfoMock = new Mock<ExceptionInfo>();
        faultInfoMock.Setup(e => e.Message).Returns("Erro simulado na fila");

        var faultMock = new Mock<Fault<NotaFiscalEmitidaEvent>>();
        faultMock.Setup(f => f.Message).Returns(eventoOrigem);
        faultMock.Setup(f => f.Exceptions).Returns(new[] { faultInfoMock.Object });

        var consumeContextMock = new Mock<ConsumeContext<Fault<NotaFiscalEmitidaEvent>>>();
        consumeContextMock.Setup(c => c.Message).Returns(faultMock.Object);
        consumeContextMock.Setup(c => c.CorrelationId).Returns(Guid.NewGuid());
        consumeContextMock.Setup(c => c.CancellationToken).Returns(CancellationToken.None);

        // Act
        await _sut.Consume(consumeContextMock.Object);

        // Assert
        _hubClientsMock.Verify(c => c.All, Times.AtLeastOnce);
    }

    [Fact]
    public async Task Consume_ComFaultSemCorrelationIdEMensagemNull_DeveUtilizarValoresDefault()
    {
        // Arrange
        var faultMock = new Mock<Fault<NotaFiscalEmitidaEvent>>();
        faultMock.Setup(f => f.Message).Returns((NotaFiscalEmitidaEvent)null!);
        faultMock.Setup(f => f.Exceptions).Returns(Array.Empty<ExceptionInfo>());

        var consumeContextMock = new Mock<ConsumeContext<Fault<NotaFiscalEmitidaEvent>>>();
        consumeContextMock.Setup(c => c.Message).Returns(faultMock.Object);
        consumeContextMock.Setup(c => c.CorrelationId).Returns((Guid?)null);
        consumeContextMock.Setup(c => c.CancellationToken).Returns(CancellationToken.None);

        // Act
        await _sut.Consume(consumeContextMock.Object);

        // Assert
        _hubClientsMock.Verify(c => c.All, Times.AtLeastOnce);
    }
}
