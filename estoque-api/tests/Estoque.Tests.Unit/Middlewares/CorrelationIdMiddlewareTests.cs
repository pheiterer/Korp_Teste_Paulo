using Estoque.API.Middlewares;
using FluentAssertions;
using Microsoft.AspNetCore.Http;

namespace Estoque.Tests.Unit.Middlewares;

public class CorrelationIdMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_SemHeaderXCorrelationID_DeveGerarNovoGuidENoResponseHeader()
    {
        // Arrange
        var context = new DefaultHttpContext();
        var middlewareExecuted = false;

        RequestDelegate next = (innerContext) =>
        {
            middlewareExecuted = true;
            return Task.CompletedTask;
        };

        var middleware = new CorrelationIdMiddleware(next);

        // Act
        await middleware.InvokeAsync(context);
        await context.Response.StartAsync();

        // Assert
        middlewareExecuted.Should().BeTrue();
        context.Response.Headers.Should().ContainKey("X-Correlation-ID");
        var correlationId = context.Response.Headers["X-Correlation-ID"].ToString();
        Guid.TryParse(correlationId, out _).Should().BeTrue();
    }

    [Fact]
    public async Task InvokeAsync_ComHeaderXCorrelationID_DevePreservarMesmoGuidNoResponseHeader()
    {
        // Arrange
        var context = new DefaultHttpContext();
        var existingCorrelationId = Guid.NewGuid().ToString();
        context.Request.Headers["X-Correlation-ID"] = existingCorrelationId;

        var middlewareExecuted = false;
        RequestDelegate next = (innerContext) =>
        {
            middlewareExecuted = true;
            return Task.CompletedTask;
        };

        var middleware = new CorrelationIdMiddleware(next);

        // Act
        await middleware.InvokeAsync(context);
        await context.Response.StartAsync();

        // Assert
        middlewareExecuted.Should().BeTrue();
        context.Response.Headers["X-Correlation-ID"].ToString().Should().Be(existingCorrelationId);
    }
}
