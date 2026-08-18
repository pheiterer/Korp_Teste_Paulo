using Estoque.Application.Interfaces;
using Estoque.Domain.Interfaces;
using Estoque.Infrastructure.Consumers;
using Estoque.Infrastructure.Persistence;
using Estoque.Infrastructure.Repositories;
using Estoque.Infrastructure.Services;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;

namespace Estoque.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // 1. Banco de Dados PostgreSQL (EF Core)
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' não encontrada nas configurações.");

        services.AddDbContext<EstoqueDbContext>(options =>
            options.UseNpgsql(connectionString, b =>
                b.MigrationsAssembly(typeof(EstoqueDbContext).Assembly.FullName)));

        services.AddScoped<IProdutoRepository, ProdutoRepository>();

        // 2. Redis (Cache, Idempotência e Distributed Lock)
        var redisConnectionString = configuration.GetConnectionString("Redis")
            ?? configuration["Redis:ConnectionString"]
            ?? "localhost:6379";

        services.AddSingleton<IConnectionMultiplexer>(sp =>
        {
            var options = ConfigurationOptions.Parse(redisConnectionString);
            options.AbortOnConnectFail = false;
            return ConnectionMultiplexer.Connect(options);
        });

        services.AddSingleton<IIdempotencyService, RedisIdempotencyService>();
        services.AddSingleton<IDistributedLockService, RedisLockService>();

        // 3. MassTransit & RabbitMQ (Mensageria Assíncrona)
        services.AddMassTransit(x =>
        {
            x.AddConsumer<NotaFiscalEmitidaConsumer>();

            x.UsingRabbitMq((context, cfg) =>
            {
                var rabbitHost = configuration["RabbitMQ:Host"] ?? "rabbitmq";
                var rabbitUser = configuration["RabbitMQ:Username"] ?? "guest";
                var rabbitPass = configuration["RabbitMQ:Password"] ?? "guest";

                cfg.Host(rabbitHost, "/", h =>
                {
                    h.Username(rabbitUser);
                    h.Password(rabbitPass);
                });

                cfg.ReceiveEndpoint("nota-fiscal-emitida-estoque-queue", e =>
                {
                    e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(2)));
                    e.ConfigureConsumer<NotaFiscalEmitidaConsumer>(context);
                });
            });
        });

        return services;
    }
}
