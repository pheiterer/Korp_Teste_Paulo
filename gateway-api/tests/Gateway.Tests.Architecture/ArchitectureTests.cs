using FluentAssertions;
using MassTransit;
using NetArchTest.Rules;
using Xunit;

namespace Gateway.Tests.Architecture;

public class ArchitectureTests
{
    private static readonly System.Reflection.Assembly GatewayApiAssembly = 
        typeof(Gateway.Api.Consumers.AbatimentoEstoqueFalhouConsumer).Assembly;

    [Fact]
    public void Consumers_Should_ImplementIConsumerAndHaveConsumerSuffix()
    {
        var result = Types.InAssembly(GatewayApiAssembly)
            .That()
            .ResideInNamespace("Gateway.Api.Consumers")
            .Should()
            .ImplementInterface(typeof(IConsumer))
            .And()
            .HaveNameEndingWith("Consumer")
            .GetResult();

        result.IsSuccessful.Should().BeTrue("Todos os consumidores em Gateway.Api.Consumers devem implementar IConsumer e terminar com o sufixo 'Consumer'.");
    }

    [Fact]
    public void Hubs_Should_InheritFromHubAndHaveHubSuffix()
    {
        var result = Types.InAssembly(GatewayApiAssembly)
            .That()
            .ResideInNamespace("Gateway.Api.Hubs")
            .Should()
            .Inherit(typeof(Microsoft.AspNetCore.SignalR.Hub))
            .And()
            .HaveNameEndingWith("Hub")
            .GetResult();

        result.IsSuccessful.Should().BeTrue("Todos os SignalR Hubs em Gateway.Api.Hubs devem herdar de Microsoft.AspNetCore.SignalR.Hub e terminar com 'Hub'.");
    }

    [Fact]
    public void Middleware_Should_HaveMiddlewareSuffix()
    {
        var result = Types.InAssembly(GatewayApiAssembly)
            .That()
            .ResideInNamespace("Gateway.Api.Middleware")
            .Should()
            .HaveNameEndingWith("Middleware")
            .GetResult();

        result.IsSuccessful.Should().BeTrue("Todos os Middlewares HTTP em Gateway.Api.Middleware devem ter o sufixo 'Middleware'.");
    }

    [Fact]
    public void Gateway_ShouldNot_DependOnDatabaseORMs()
    {
        var forbiddenAssemblies = new[]
        {
            "Microsoft.EntityFrameworkCore",
            "Npgsql",
            "System.Data.SqlClient",
            "MongoDB.Driver"
        };

        var result = Types.InAssembly(GatewayApiAssembly)
            .ShouldNot()
            .HaveDependencyOnAny(forbiddenAssemblies)
            .GetResult();

        result.IsSuccessful.Should().BeTrue("O API Gateway não deve ter dependências diretas de ORMs ou drivers de banco de dados SQL/NoSQL.");
    }

    [Fact]
    public void Contracts_Should_BePublic()
    {
        var result = Types.InAssembly(GatewayApiAssembly)
            .That()
            .ResideInNamespace("Estoque.Application.Contracts")
            .Should()
            .BePublic()
            .GetResult();

        result.IsSuccessful.Should().BeTrue("Todos os contratos de eventos em Estoque.Application.Contracts devem ser públicos.");
    }
}
