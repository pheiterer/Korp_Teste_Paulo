using Estoque.Application;
using Estoque.API.Middlewares;
using Estoque.Infrastructure;
using Estoque.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
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

// Middleware Global de Tratamento de Erros e Logs
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseSerilogRequestLogging();


if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthorization();
app.MapControllers();


app.Run();

