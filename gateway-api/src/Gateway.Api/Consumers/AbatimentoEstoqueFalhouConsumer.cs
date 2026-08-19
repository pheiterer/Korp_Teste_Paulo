using Estoque.Application.Contracts;
using Gateway.Api.Hubs;
using MassTransit;
using Microsoft.AspNetCore.SignalR;
using Serilog.Context;

namespace Gateway.Api.Consumers;

public class AbatimentoEstoqueFalhouConsumer : IConsumer<AbatimentoEstoqueFalhouEvent>
{
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly ILogger<AbatimentoEstoqueFalhouConsumer> _logger;

    public AbatimentoEstoqueFalhouConsumer(
        IHubContext<NotificationHub> hubContext,
        ILogger<AbatimentoEstoqueFalhouConsumer> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<AbatimentoEstoqueFalhouEvent> context)
    {
        var message = context.Message;
        var correlationId = context.CorrelationId?.ToString() ?? Guid.NewGuid().ToString();

        using (Serilog.Context.LogContext.PushProperty("CorrelationId", correlationId))
        {
            _logger.LogWarning("Consumido evento AbatimentoEstoqueFalhouEvent para Nota Fiscal '{NotaFiscalId}'. Motivo: {Motivo}",
                message.NotaFiscalId, message.Motivo);

            var notificationPayload = new
            {
                notaFiscalId = message.NotaFiscalId,
                motivo = message.Motivo,
                dataFalha = message.DataFalha,
                status = "Cancelada",
                tipo = "ErroEstoque",
                correlationId
            };

            // Envia mensagem via WebSockets (SignalR) para todos os clientes conectados
            await _hubContext.Clients.All.SendAsync("ReceberFalhaEstoque", notificationPayload, context.CancellationToken);

            _logger.LogInformation("Notificação de falha de estoque enviada via SignalR Hub para Nota Fiscal '{NotaFiscalId}'.", message.NotaFiscalId);
        }
    }
}
