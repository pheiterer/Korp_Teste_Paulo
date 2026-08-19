using Microsoft.AspNetCore.SignalR;
using Serilog.Context;

namespace Gateway.Api.Hubs;

public class NotificationHub : Hub
{
    private readonly ILogger<NotificationHub> _logger;

    public NotificationHub(ILogger<NotificationHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var connectionId = Context.ConnectionId;
        _logger.LogInformation("Cliente SignalR conectado com ConnectionId '{ConnectionId}'.", connectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var connectionId = Context.ConnectionId;
        _logger.LogInformation(exception, "Cliente SignalR desconectado com ConnectionId '{ConnectionId}'.", connectionId);
        await base.OnDisconnectedAsync(exception);
    }
}
