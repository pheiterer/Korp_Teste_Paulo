using Estoque.Domain.Interfaces;
using Estoque.Infrastructure.Persistence;
using Estoque.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Estoque.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' não encontrada nas configurações.");

        services.AddDbContext<EstoqueDbContext>(options =>
            options.UseNpgsql(connectionString, b =>
                b.MigrationsAssembly(typeof(EstoqueDbContext).Assembly.FullName)));

        services.AddScoped<IProdutoRepository, ProdutoRepository>();

        return services;
    }
}
