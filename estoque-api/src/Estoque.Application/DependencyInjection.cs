using Estoque.Application.Interfaces;
using Estoque.Application.Services;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace Estoque.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(AssemblyReference.Assembly);
        services.AddScoped<IProdutoService, ProdutoService>();

        return services;
    }
}
