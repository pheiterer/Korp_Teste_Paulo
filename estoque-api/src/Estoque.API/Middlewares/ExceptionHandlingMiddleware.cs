using System.Net;
using System.Text.Json;
using Estoque.Domain.Exceptions;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;

namespace Estoque.API.Middlewares;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next ?? throw new ArgumentNullException(nameof(next));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/problem+json";

        switch (exception)
        {
            case ValidationException validationEx:
                _logger.LogWarning(exception, "Falha de validação da requisição.");
                context.Response.StatusCode = (int)HttpStatusCode.BadRequest;

                var errorsDict = validationEx.Errors
                    .GroupBy(e => e.PropertyName)
                    .ToDictionary(
                        g => g.Key,
                        g => g.Select(e => e.ErrorMessage).ToArray()
                    );

                var validationProblem = new ValidationProblemDetails(errorsDict)
                {
                    Status = (int)HttpStatusCode.BadRequest,
                    Title = "Erro de Validação",
                    Detail = "Um ou mais erros de validação ocorreram.",
                    Instance = context.Request.Path
                };

                return context.Response.WriteAsync(JsonSerializer.Serialize(validationProblem));

            case DomainException domainEx:
                _logger.LogWarning(exception, "Exceção de regra de negócio de domínio: {Message}", domainEx.Message);
                context.Response.StatusCode = (int)HttpStatusCode.BadRequest;

                var domainProblem = new ProblemDetails
                {
                    Status = (int)HttpStatusCode.BadRequest,
                    Title = "Violação de Regra de Negócio",
                    Detail = domainEx.Message,
                    Instance = context.Request.Path
                };

                return context.Response.WriteAsync(JsonSerializer.Serialize(domainProblem));

            case KeyNotFoundException notFoundEx:
                _logger.LogWarning(exception, "Recurso não encontrado: {Message}", notFoundEx.Message);
                context.Response.StatusCode = (int)HttpStatusCode.NotFound;

                var notFoundProblem = new ProblemDetails
                {
                    Status = (int)HttpStatusCode.NotFound,
                    Title = "Recurso Não Encontrado",
                    Detail = notFoundEx.Message,
                    Instance = context.Request.Path
                };

                return context.Response.WriteAsync(JsonSerializer.Serialize(notFoundProblem));

            default:
                _logger.LogError(exception, "Erro interno não tratado no servidor.");
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

                var internalProblem = new ProblemDetails
                {
                    Status = (int)HttpStatusCode.InternalServerError,
                    Title = "Erro Interno do Servidor",
                    Detail = "Ocorreu um erro interno inesperado. Por favor, tente novamente mais tarde.",
                    Instance = context.Request.Path
                };

                return context.Response.WriteAsync(JsonSerializer.Serialize(internalProblem));
        }
    }
}
