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

        app.MapGet("/attempts/{attemptId:guid}", GetAttemptState)
            .WithName("GetAttemptState")
            .WithTags("Attempts")
            .WithSummary("Obtém o estado atual de execução da tentativa")
            .Produces<AttemptExecutionStateResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
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

    private static async Task<Results<Ok<AttemptExecutionStateResponse>, NotFound<ProblemDetails>>> GetAttemptState(
        Guid attemptId,
        IAttemptService attemptService,
        CancellationToken cancellationToken)
    {
        var snapshot = await attemptService.GetExecutionStateAsync(attemptId, cancellationToken);

        if (snapshot is null)
        {
            var problem = new ProblemDetails
            {
                Title = "Attempt not found",
                Detail = $"Attempt with id '{attemptId}' was not found.",
                Status = StatusCodes.Status404NotFound,
                Type = $"https://httpstatuses.com/{StatusCodes.Status404NotFound}"
            };

            problem.Extensions["code"] = ApiErrorCodes.NotFound;
            return TypedResults.NotFound(problem);
        }

        var response = new AttemptExecutionStateResponse(
            snapshot.AttemptId,
            snapshot.ExamId,
            snapshot.Status,
            snapshot.StartedAtUtc,
            snapshot.DeadlineAtUtc,
            snapshot.LastSeenAtUtc,
            snapshot.SubmittedAtUtc,
            snapshot.RemainingSeconds,
            snapshot.AnsweredQuestionCount,
            snapshot.PendingQuestionCount,
            snapshot.Questions
                .Select(question => new AttemptExecutionQuestionResponse(
                    question.QuestionId,
                    question.SectionId,
                    question.SectionTitle,
                    question.QuestionCode,
                    question.Prompt,
                    question.DisplayOrder,
                    question.SelectedOptionId,
                    question.IsAnswered,
                    question.Options
                        .Select(option => new AttemptExecutionQuestionOptionResponse(
                            option.OptionId,
                            option.OptionCode,
                            option.Text,
                            option.DisplayOrder))
                        .ToArray()))
                .ToArray());

        return TypedResults.Ok(response);
    }
}
