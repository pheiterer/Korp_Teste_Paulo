using Estoque.Application;
using Estoque.API.Middlewares;
using Estoque.Infrastructure;
using Estoque.Infrastructure.Persistence;
using HealthChecks.UI.Client;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Prometheus;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Configuração do Serilog
builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext();
});

// Registrar serviços de Infraestrutura e Aplicação
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApplication();

// Configuração dos Health Checks
var pgConnectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' não encontrada.");

var redisConnectionString = builder.Configuration.GetConnectionString("Redis")
    ?? builder.Configuration["Redis:ConnectionString"]
    ?? "localhost:6379";

var rabbitHost = builder.Configuration["RabbitMQ:Host"] ?? "rabbitmq";
var rabbitUser = builder.Configuration["RabbitMQ:Username"] ?? "guest";
var rabbitPass = builder.Configuration["RabbitMQ:Password"] ?? "guest";
var rabbitConnectionString = $"amqp://{rabbitUser}:{rabbitPass}@{rabbitHost}:5672/";

builder.Services.AddHealthChecks()
    .AddNpgSql(pgConnectionString, name: "PostgreSQL", tags: new[] { "db", "data" })
    .AddRedis(redisConnectionString, name: "Redis", tags: new[] { "cache", "data" })
    .AddRabbitMQ(sp => new RabbitMQ.Client.ConnectionFactory { HostName = rabbitHost, UserName = rabbitUser, Password = rabbitPass }.CreateConnectionAsync().GetAwaiter().GetResult(), name: "RabbitMQ", tags: new[] { "messaging" });

// Controllers e Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Aplicar Migrations no Banco de Dados (PostgreSQL) na inicialização
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<EstoqueDbContext>();
    await dbContext.Database.MigrateAsync();
}

// Middlewares Globais (Correlation ID, Tratamento de Erros, Logs e Métricas HTTP)
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseSerilogRequestLogging();
app.UseHttpMetrics();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthorization();

// Mapear Endpoints de Health Checks e Métricas Prometheus
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});
app.MapMetrics();

app.MapControllers();

app.Run();
