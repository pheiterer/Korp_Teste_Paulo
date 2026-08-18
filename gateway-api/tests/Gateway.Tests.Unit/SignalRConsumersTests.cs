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

public class SignalRConsumersTests
{
    private readonly Mock<IHubContext<NotificationHub>> _hubContextMock;
    private readonly Mock<IHubClients> _hubClientsMock;
    private readonly Mock<ISingleClientProxy> _clientProxyMock;

    public SignalRConsumersTests()
    {
        _hubContextMock = new Mock<IHubContext<NotificationHub>>();
        _hubClientsMock = new Mock<IHubClients>();
        _clientProxyMock = new Mock<ISingleClientProxy>();

        _hubClientsMock.Setup(c => c.All).Returns(_clientProxyMock.Object);
        _hubContextMock.Setup(h => h.Clients).Returns(_hubClientsMock.Object);
    }

    [Fact]
    public async Task AbatimentoEstoqueFalhouConsumer_DevePublicarEventoNoSignalR_QuandoConsumirFalha()
    {
        // Arrange
        var loggerMock = new Mock<ILogger<AbatimentoEstoqueFalhouConsumer>>();
        var consumer = new AbatimentoEstoqueFalhouConsumer(_hubContextMock.Object, loggerMock.Object);

        var notaFiscalId = Guid.NewGuid();
        var eventoFalha = new AbatimentoEstoqueFalhouEvent(notaFiscalId, "Saldo insuficiente para o produto 'PROD-001'.", DateTime.UtcNow);

        var consumeContextMock = new Mock<ConsumeContext<AbatimentoEstoqueFalhouEvent>>();
        consumeContextMock.Setup(c => c.Message).Returns(eventoFalha);
        consumeContextMock.Setup(c => c.CorrelationId).Returns(Guid.NewGuid());
        consumeContextMock.Setup(c => c.CancellationToken).Returns(CancellationToken.None);

        // Act
        await consumer.Consume(consumeContextMock.Object);

        // Assert
        _hubClientsMock.Verify(c => c.All, Times.AtLeastOnce);
    }

    [Fact]
    public async Task NotaFiscalAbatidaConsumer_DevePublicarEventoNoSignalR_QuandoConsumirSucesso()
    {
        // Arrange
        var loggerMock = new Mock<ILogger<NotaFiscalAbatidaConsumer>>();
        var consumer = new NotaFiscalAbatidaConsumer(_hubContextMock.Object, loggerMock.Object);

        var notaFiscalId = Guid.NewGuid();
        var eventoSucesso = new NotaFiscalAbatidaEvent(notaFiscalId, DateTime.UtcNow);

        var consumeContextMock = new Mock<ConsumeContext<NotaFiscalAbatidaEvent>>();
        consumeContextMock.Setup(c => c.Message).Returns(eventoSucesso);
        consumeContextMock.Setup(c => c.CorrelationId).Returns(Guid.NewGuid());
        consumeContextMock.Setup(c => c.CancellationToken).Returns(CancellationToken.None);

        // Act
        await consumer.Consume(consumeContextMock.Object);

        // Assert
        _hubClientsMock.Verify(c => c.All, Times.AtLeastOnce);
    }
}
