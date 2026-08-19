using Estoque.Application.Contracts;
using Gateway.Api.Hubs;
using MassTransit;
using Microsoft.AspNetCore.SignalR;
using Serilog.Context;

namespace Gateway.Api.Consumers;

public class NotaFiscalEmitidaFaultConsumer : IConsumer<Fault<NotaFiscalEmitidaEvent>>
{
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly ILogger<NotaFiscalEmitidaFaultConsumer> _logger;

    public NotaFiscalEmitidaFaultConsumer(
        IHubContext<NotificationHub> hubContext,
        ILogger<NotaFiscalEmitidaFaultConsumer> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<Fault<NotaFiscalEmitidaEvent>> context)
    {
        var fault = context.Message;
        var correlationId = context.CorrelationId?.ToString() ?? Guid.NewGuid().ToString();
        var reason = fault.Exceptions?.FirstOrDefault()?.Message ?? "Falha crítica no processamento da mensagem (Dead Letter / Fault)";
        var notaFiscalId = fault.Message?.NotaFiscalId.ToString() ?? "Desconhecida";

        using (Serilog.Context.LogContext.PushProperty("CorrelationId", correlationId))
        {
            _logger.LogError("Consumido evento Fault<NotaFiscalEmitidaEvent> para Nota Fiscal '{NotaFiscalId}'. Motivo: {Reason}", notaFiscalId, reason);

            var notificationPayload = new
            {
                notaFiscalId,
                status = "Cancelada",
                tipo = "FalhaEstoque",
                motivo = reason,
                correlationId
            };

            // Notifica clientes conectados via SignalR
            await _hubContext.Clients.All.SendAsync("ReceberFalhaEstoque", notificationPayload, context.CancellationToken);
            await _hubContext.Clients.All.SendAsync("AbatimentoEstoqueFalhou", notificationPayload, context.CancellationToken);
        }
    }
}
