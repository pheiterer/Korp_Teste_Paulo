using Gateway.Api.Middleware;
using Prometheus;
using Serilog;
using Yarp.ReverseProxy.Transforms;

var builder = WebApplication.CreateBuilder(args);

// 1. Configurar Serilog para logs estruturados
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] [{CorrelationId}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

builder.Host.UseSerilog();

// 2. Adicionar suporte ao YARP Reverse Proxy com transformadores de cabeçalho
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"))
    .AddTransforms(transformBuilderContext =>
    {
        // Garante que o CorrelationId do Request HTTP atual seja propagado nos cabeçalhos downstream
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

// 3. Adicionar Health Checks e Métricas Prometheus
builder.Services.AddHealthChecks();

// 4. Configurar CORS (para integração com Frontend Angular no Épico 5)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// 5. Pipeline de Middlewares HTTP
app.UseCors("AllowAll");

// Prometheus Http Metrics
app.UseHttpMetrics();

// Correlation ID Middleware
app.UseMiddleware<CorrelationIdMiddleware>();

// Health Checks & Metrics Endpoints
app.MapHealthChecks("/health");
app.MapMetrics("/metrics");

// Rota raiz para identificação amigável da API Gateway
app.MapGet("/", () => Results.Ok(new
{
    Service = "API Gateway (YARP)",
    Status = "Healthy",
    Timestamp = DateTime.UtcNow
}));

// Roteamento downstream via YARP Reverse Proxy
app.MapReverseProxy();

app.Run();
