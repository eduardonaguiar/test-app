using ExamRunner.Api.Contracts.Errors;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace ExamRunner.Api.Handlers;

public sealed class ValidationExceptionHandler(
    IProblemDetailsService problemDetailsService,
    ILogger<ValidationExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not ValidationException validationException)
        {
            return false;
        }

        logger.LogWarning(validationException, "Request validation failed.");

        var problemDetails = new ProblemDetails
        {
            Title = "Validation failed",
            Detail = "One or more validation errors occurred.",
            Status = StatusCodes.Status400BadRequest,
            Type = $"https://httpstatuses.com/{StatusCodes.Status400BadRequest}"
        };

        problemDetails.Extensions["code"] = ApiErrorCodes.ValidationFailed;
        problemDetails.Extensions["errors"] = validationException.Errors
            .Select(error => new
            {
                path = error.PropertyName,
                message = error.ErrorMessage
            })
            .ToArray();

        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = problemDetails,
            Exception = exception
        });
    }
}
