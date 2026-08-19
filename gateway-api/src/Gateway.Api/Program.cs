using Gateway.Api.Consumers;
using Gateway.Api.Hubs;
using Gateway.Api.Middleware;
using MassTransit;
using Prometheus;
using Serilog;
using Yarp.ReverseProxy.Transforms;

var builder = WebApplication.CreateBuilder(args);

// 1. Configurar Serilog para logs estruturados com suporte a CorrelationId
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] [{CorrelationId}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

builder.Host.UseSerilog();

// 2. Configurar SignalR para comunicação em tempo real via WebSockets
builder.Services.AddSignalR();

// 3. Configurar MassTransit com RabbitMQ para escutar eventos de falha e sucesso de estoque
builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<AbatimentoEstoqueFalhouConsumer>();
    x.AddConsumer<NotaFiscalAbatidaConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        var host = builder.Configuration["RabbitMQ:Host"] ?? "localhost";
        var username = builder.Configuration["RabbitMQ:Username"] ?? "guest";
        var password = builder.Configuration["RabbitMQ:Password"] ?? "guest";

        cfg.Host(host, "/", h =>
        {
            h.Username(username);
            h.Password(password);
        });

        cfg.ConfigureEndpoints(context);
    });
});

// 4. Adicionar suporte ao YARP Reverse Proxy com transformadores de cabeçalho
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"))
    .AddTransforms(transformBuilderContext =>
    {
        transformBuilderContext.AddRequestTransform(async transformContext =>
        {
            if (transformContext.HttpContext.Request.Headers.TryGetValue("X-Correlation-ID", out var correlationId) && !string.IsNullOrEmpty(correlationId))
            {
                transformContext.ProxyRequest.Headers.Remove("X-Correlation-ID");
                transformContext.ProxyRequest.Headers.Add("X-Correlation-ID", correlationId.ToString());
            }
            await Task.CompletedTask;
        });
    });

// 5. Adicionar Health Checks
builder.Services.AddHealthChecks();

// 6. Configurar CORS (suporte a SignalR com credentials e WebSockets no Angular)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// 7. Pipeline de Middlewares HTTP & WebSockets
app.UseRouting();
app.UseCors("AllowAll");
app.UseWebSockets();

// Prometheus Http Metrics
app.UseHttpMetrics();

// Correlation ID Middleware
app.UseMiddleware<CorrelationIdMiddleware>();

// Health Checks & Metrics Endpoints
app.MapHealthChecks("/health");
app.MapMetrics("/metrics");

// SignalR Hub Endpoint
app.MapHub<NotificationHub>("/hubs/notificacoes");

// Rota raiz para identificação amigável do API Gateway
app.MapGet("/", () => Results.Ok(new
{
    Service = "API Gateway (YARP & SignalR Hub)",
    Status = "Healthy",
    Timestamp = DateTime.UtcNow
}));

// Roteamento downstream via YARP Reverse Proxy
app.MapReverseProxy();

app.Run();
