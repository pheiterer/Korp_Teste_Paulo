using FluentAssertions;
using Xunit;

namespace Estoque.Tests.Unit;

public class InitialUnitTest
{
    [Fact]
    public void SolutionSetup_ShouldBeConfiguredCorrectly()
    {
        // Arrange
        bool isSetupValid = true;

        // Act & Assert
        isSetupValid.Should().BeTrue("A estrutura de testes unitários do Serviço de Estoque foi configurada com sucesso.");
    }
}
