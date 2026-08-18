using Estoque.Application.Contracts;
using Gateway.Api.Hubs;
using MassTransit;
using Microsoft.AspNetCore.SignalR;
using Serilog.Context;

namespace Gateway.Api.Consumers;

public class NotaFiscalAbatidaConsumer : IConsumer<NotaFiscalAbatidaEvent>
{
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly ILogger<NotaFiscalAbatidaConsumer> _logger;

    public NotaFiscalAbatidaConsumer(
        IHubContext<NotificationHub> hubContext,
        ILogger<NotaFiscalAbatidaConsumer> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<NotaFiscalAbatidaEvent> context)
    {
        var message = context.Message;
        var correlationId = context.CorrelationId?.ToString() ?? Guid.NewGuid().ToString();

        using (Serilog.Context.LogContext.PushProperty("CorrelationId", correlationId))
        {
            _logger.LogInformation("Consumido evento NotaFiscalAbatidaEvent para Nota Fiscal '{NotaFiscalId}'.", message.NotaFiscalId);

            var notificationPayload = new
            {
                notaFiscalId = message.NotaFiscalId,
                dataAbatimento = message.DataAbatimento,
                status = "Fechada",
                tipo = "SucessoEstoque",
                correlationId
            };

            // Envia mensagem via WebSockets (SignalR) para todos os clientes conectados
            await _hubContext.Clients.All.SendAsync("ReceberSucessoEstoque", notificationPayload, context.CancellationToken);
            await _hubContext.Clients.All.SendAsync("ReceiveStockSuccess", notificationPayload, context.CancellationToken);

            _logger.LogInformation("Notificação de sucesso no estoque enviada via SignalR Hub para Nota Fiscal '{NotaFiscalId}'.", message.NotaFiscalId);
        }
    }
}
