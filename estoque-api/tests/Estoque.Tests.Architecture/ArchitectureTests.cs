using FluentAssertions;
using NetArchTest.Rules;
using Xunit;

namespace Estoque.Tests.Architecture;

public class ArchitectureTests
{
    private const string DomainNamespace = "Estoque.Domain";
    private const string ApplicationNamespace = "Estoque.Application";
    private const string InfrastructureNamespace = "Estoque.Infrastructure";
    private const string ApiNamespace = "Estoque.API";

    [Fact]
    public void Domain_ShouldNot_HaveDependencyOnOtherLayers()
    {
        var assembly = Domain.AssemblyReference.Assembly;

        var otherLayers = new[]
        {
            ApplicationNamespace,
            InfrastructureNamespace,
            ApiNamespace
        };

        var result = Types.InAssembly(assembly)
            .ShouldNot()
            .HaveDependencyOnAny(otherLayers)
            .GetResult();

        result.IsSuccessful.Should().BeTrue("Camada de Domain deve ser completamente independente e não ter dependência de nenhuma outra camada.");
    }

    [Fact]
    public void Application_ShouldNot_HaveDependencyOnInfrastructureOrApi()
    {
        var assembly = Application.AssemblyReference.Assembly;

        var forbiddenLayers = new[]
        {
            InfrastructureNamespace,
            ApiNamespace
        };

        var result = Types.InAssembly(assembly)
            .ShouldNot()
            .HaveDependencyOnAny(forbiddenLayers)
            .GetResult();

        result.IsSuccessful.Should().BeTrue("Camada de Application não deve depender das camadas de Infrastructure ou API.");
    }

    [Fact]
    public void Infrastructure_ShouldNot_HaveDependencyOnApi()
    {
        var assembly = Infrastructure.AssemblyReference.Assembly;

        var result = Types.InAssembly(assembly)
            .ShouldNot()
            .HaveDependencyOn(ApiNamespace)
            .GetResult();

        result.IsSuccessful.Should().BeTrue("Camada de Infrastructure não deve depender da camada de API.");
    }
}
