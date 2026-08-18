using FluentAssertions;
using Gateway.Api.Middleware;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Gateway.Tests.Unit;

public class CorrelationIdMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_DeveGerarNovoCorrelationId_QuandoCabecalhoNaoEstiverPresente()
    {
        // Arrange
        var context = new DefaultHttpContext();
        var nextMock = new Mock<RequestDelegate>();
        nextMock.Setup(n => n(It.IsAny<HttpContext>())).Returns(Task.CompletedTask);
        var loggerMock = new Mock<ILogger<CorrelationIdMiddleware>>();

        var middleware = new CorrelationIdMiddleware(nextMock.Object, loggerMock.Object);

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Request.Headers.ContainsKey("X-Correlation-ID").Should().BeTrue();
        context.Request.Headers["X-Correlation-ID"].ToString().Should().NotBeNullOrEmpty();
        nextMock.Verify(n => n(context), Times.Once);
    }

    [Fact]
    public async Task InvokeAsync_DevePreservarCorrelationId_QuandoCabecalhoJaEstiverPresente()
    {
        // Arrange
        var correlationIdExistente = "corr-12345-test";
        var context = new DefaultHttpContext();
        context.Request.Headers["X-Correlation-ID"] = correlationIdExistente;

        var nextMock = new Mock<RequestDelegate>();
        nextMock.Setup(n => n(It.IsAny<HttpContext>())).Returns(Task.CompletedTask);
        var loggerMock = new Mock<ILogger<CorrelationIdMiddleware>>();

        var middleware = new CorrelationIdMiddleware(nextMock.Object, loggerMock.Object);

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Request.Headers["X-Correlation-ID"].ToString().Should().Be(correlationIdExistente);
        nextMock.Verify(n => n(context), Times.Once);
    }
}
