using System.Diagnostics;
using Serilog.Context;

namespace Gateway.Api.Middleware;

public class CorrelationIdMiddleware
{
    private const string CorrelationIdHeader = "X-Correlation-ID";
    private readonly RequestDelegate _next;
    private readonly ILogger<CorrelationIdMiddleware> _logger;

    public CorrelationIdMiddleware(RequestDelegate next, ILogger<CorrelationIdMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        string correlationId;

        if (context.Request.Headers.TryGetValue(CorrelationIdHeader, out var existingCorrelationId) && !string.IsNullOrWhiteSpace(existingCorrelationId))
        {
            correlationId = existingCorrelationId.ToString();
        }
        else
        {
            correlationId = Guid.NewGuid().ToString();
            context.Request.Headers[CorrelationIdHeader] = correlationId;
        }

        context.Response.OnStarting(() =>
        {
            if (!context.Response.Headers.ContainsKey(CorrelationIdHeader))
            {
                context.Response.Headers.Append(CorrelationIdHeader, correlationId);
            }
            return Task.CompletedTask;
        });

        using (LogContext.PushProperty("CorrelationId", correlationId))
        {
            _logger.LogInformation("Gateway interceptou requisição '{Method} {Path}' com CorrelationId '{CorrelationId}'.",
                context.Request.Method, context.Request.Path, correlationId);

            await _next(context);
        }
    }
}
