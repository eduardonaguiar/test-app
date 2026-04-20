using ExamRunner.Api.Contracts.Attempts;
using ExamRunner.Api.Contracts.Errors;
using ExamRunner.Infrastructure.Attempts;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace ExamRunner.Api.Endpoints.Attempts;

public static class AttemptEndpoints
{
    public static IEndpointRouteBuilder MapAttemptEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/attempts", CreateAttempt)
            .WithName("CreateAttempt")
            .WithTags("Attempts")
            .WithSummary("Inicia uma nova tentativa para um exame")
            .Produces<AttemptResponse>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status500InternalServerError);

        return app;
    }

    private static async Task<Results<Created<AttemptResponse>, NotFound<ProblemDetails>, BadRequest<ProblemDetails>>> CreateAttempt(
        CreateAttemptRequest request,
        IAttemptService attemptService,
        CancellationToken cancellationToken)
    {
        if (request.ExamId == Guid.Empty)
        {
            var badRequest = new ProblemDetails
            {
                Title = "Invalid attempt payload",
                Detail = "examId must be a non-empty GUID.",
                Status = StatusCodes.Status400BadRequest,
                Type = $"https://httpstatuses.com/{StatusCodes.Status400BadRequest}"
            };

            badRequest.Extensions["code"] = ApiErrorCodes.ValidationFailed;
            return TypedResults.BadRequest(badRequest);
        }

        try
        {
            var snapshot = await attemptService.CreateAsync(new CreateAttemptCommand(request.ExamId), cancellationToken);
            var response = new AttemptResponse(
                snapshot.AttemptId,
                snapshot.ExamId,
                snapshot.Status,
                snapshot.StartedAtUtc,
                snapshot.DeadlineAtUtc,
                snapshot.LastSeenAtUtc,
                snapshot.SubmittedAtUtc);

            return TypedResults.Created($"/api/attempts/{response.AttemptId}", response);
        }
        catch (AttemptCreationException ex)
        {
            var problem = new ProblemDetails
            {
                Title = "Exam not found",
                Detail = ex.Message,
                Status = StatusCodes.Status404NotFound,
                Type = $"https://httpstatuses.com/{StatusCodes.Status404NotFound}"
            };

            problem.Extensions["code"] = ApiErrorCodes.NotFound;
            return TypedResults.NotFound(problem);
        }
    }
}
