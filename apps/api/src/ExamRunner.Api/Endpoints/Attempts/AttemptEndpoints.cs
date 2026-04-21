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

        app.MapPut("/attempts/{attemptId:guid}/answers/{questionId:guid}", SaveAnswer)
            .WithName("SaveAttemptAnswer")
            .WithTags("Attempts")
            .WithSummary("Salva a resposta de uma questão")
            .Produces<AttemptExecutionStateResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status500InternalServerError);

        app.MapPost("/attempts/{attemptId:guid}/reconnect", ReconnectAttempt)
            .WithName("ReconnectAttempt")
            .WithTags("Attempts")
            .WithSummary("Retoma uma tentativa aplicando a política de reconexão")
            .Produces<AttemptExecutionStateResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status500InternalServerError);

        app.MapPost("/attempts/{attemptId:guid}/submit", SubmitAttempt)
            .WithName("SubmitAttempt")
            .WithTags("Attempts")
            .WithSummary("Submete a tentativa")
            .Produces<AttemptResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status500InternalServerError);

        app.MapGet("/attempts/{attemptId:guid}/result", GetAttemptResult)
            .WithName("GetAttemptResult")
            .WithTags("Attempts")
            .WithSummary("Obtém o resultado completo de uma tentativa submetida")
            .Produces<AttemptResultResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status500InternalServerError);

        app.MapGet("/history", GetHistory)
            .WithName("GetHistory")
            .WithTags("History")
            .WithSummary("Lista o histórico de tentativas finalizadas")
            .Produces<AttemptHistoryResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status500InternalServerError);

        app.MapGet("/performance", GetPerformanceDashboard)
            .WithName("GetPerformanceDashboard")
            .WithTags("Performance")
            .WithSummary("Consolida o desempenho histórico para dashboard de estudo")
            .Produces<PerformanceDashboardResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status500InternalServerError);

        return app;
    }

    private static async Task<Ok<PerformanceDashboardResponse>> GetPerformanceDashboard(
        IAttemptService attemptService,
        CancellationToken cancellationToken)
    {
        var dashboard = await attemptService.GetPerformanceDashboardAsync(cancellationToken);

        var response = new PerformanceDashboardResponse(
            new PerformanceDashboardSummaryResponse(
                dashboard.Summary.TotalAttempts,
                dashboard.Summary.TotalQuestions,
                dashboard.Summary.TotalCorrect,
                dashboard.Summary.TotalIncorrect,
                dashboard.Summary.GlobalAccuracyRate,
                dashboard.Summary.AverageAttemptPercentage,
                dashboard.Summary.LastAttemptPercentage,
                dashboard.Summary.BestAttemptPercentage),
            dashboard.AttemptTrend
                .Select(point => new AttemptTrendPointResponse(
                    point.AttemptId,
                    point.Label,
                    point.ExecutedAtUtc,
                    point.Percentage))
                .ToArray(),
            dashboard.TopicPerformance
                .Select(topic => new TopicPerformanceResponse(
                    topic.Topic,
                    topic.TotalQuestions,
                    topic.TotalCorrect,
                    topic.TotalIncorrect,
                    topic.AccuracyRate))
                .ToArray());

        return TypedResults.Ok(response);
    }

    private static async Task<Ok<AttemptHistoryResponse>> GetHistory(
        IAttemptService attemptService,
        CancellationToken cancellationToken)
    {
        var snapshots = await attemptService.GetHistoryAsync(cancellationToken);
        var response = new AttemptHistoryResponse(
            snapshots
                .Select(snapshot => new AttemptHistoryItemResponse(
                    snapshot.AttemptId,
                    snapshot.ExamId,
                    snapshot.ExamTitle,
                    snapshot.AttemptedAtUtc,
                    snapshot.Score,
                    snapshot.Percentage,
                    snapshot.TimeSpentSeconds,
                    snapshot.Status))
                .ToArray());

        return TypedResults.Ok(response);
    }

    private static async Task<Results<Ok<AttemptResultResponse>, NotFound<ProblemDetails>, Conflict<ProblemDetails>>> GetAttemptResult(
        Guid attemptId,
        IAttemptService attemptService,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await attemptService.GetResultAsync(attemptId, cancellationToken);

            if (result is null)
            {
                var notFound = new ProblemDetails
                {
                    Title = "Attempt not found",
                    Detail = $"Attempt with id '{attemptId}' was not found.",
                    Status = StatusCodes.Status404NotFound,
                    Type = $"https://httpstatuses.com/{StatusCodes.Status404NotFound}"
                };
                notFound.Extensions["code"] = ApiErrorCodes.NotFound;
                return TypedResults.NotFound(notFound);
            }

            return TypedResults.Ok(MapAttemptResultResponse(result));
        }
        catch (InvalidOperationException ex)
        {
            var conflict = new ProblemDetails
            {
                Title = "Result not available",
                Detail = ex.Message,
                Status = StatusCodes.Status409Conflict,
                Type = $"https://httpstatuses.com/{StatusCodes.Status409Conflict}"
            };
            conflict.Extensions["code"] = ApiErrorCodes.Conflict;
            return TypedResults.Conflict(conflict);
        }
    }

    private static async Task<Results<Ok<AttemptExecutionStateResponse>, NotFound<ProblemDetails>, Conflict<ProblemDetails>>> ReconnectAttempt(
        Guid attemptId,
        IAttemptService attemptService,
        CancellationToken cancellationToken)
    {
        try
        {
            var snapshot = await attemptService.ReconnectAsync(attemptId, cancellationToken);

            if (snapshot is null)
            {
                var notFound = new ProblemDetails
                {
                    Title = "Attempt not found",
                    Detail = $"Attempt with id '{attemptId}' was not found.",
                    Status = StatusCodes.Status404NotFound,
                    Type = $"https://httpstatuses.com/{StatusCodes.Status404NotFound}"
                };
                notFound.Extensions["code"] = ApiErrorCodes.NotFound;
                return TypedResults.NotFound(notFound);
            }

            return TypedResults.Ok(MapExecutionStateResponse(snapshot));
        }
        catch (InvalidOperationException ex)
        {
            var conflict = new ProblemDetails
            {
                Title = "Attempt cannot be reconnected",
                Detail = ex.Message,
                Status = StatusCodes.Status409Conflict,
                Type = $"https://httpstatuses.com/{StatusCodes.Status409Conflict}"
            };
            conflict.Extensions["code"] = ApiErrorCodes.Conflict;
            return TypedResults.Conflict(conflict);
        }
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
            var response = MapAttemptResponse(snapshot);

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

        return TypedResults.Ok(MapExecutionStateResponse(snapshot));
    }

    private static async Task<Results<Ok<AttemptExecutionStateResponse>, NotFound<ProblemDetails>, BadRequest<ProblemDetails>, Conflict<ProblemDetails>>> SaveAnswer(
        Guid attemptId,
        Guid questionId,
        SaveAttemptAnswerRequest request,
        IAttemptService attemptService,
        CancellationToken cancellationToken)
    {
        if (attemptId == Guid.Empty)
        {
            var badRequest = new ProblemDetails
            {
                Title = "Invalid answer route parameters",
                Detail = "attemptId must be a non-empty GUID.",
                Status = StatusCodes.Status400BadRequest,
                Type = $"https://httpstatuses.com/{StatusCodes.Status400BadRequest}"
            };
            badRequest.Extensions["code"] = ApiErrorCodes.ValidationFailed;
            return TypedResults.BadRequest(badRequest);
        }

        if (questionId == Guid.Empty)
        {
            var badRequest = new ProblemDetails
            {
                Title = "Invalid answer route parameters",
                Detail = "questionId must be a non-empty GUID.",
                Status = StatusCodes.Status400BadRequest,
                Type = $"https://httpstatuses.com/{StatusCodes.Status400BadRequest}"
            };
            badRequest.Extensions["code"] = ApiErrorCodes.ValidationFailed;
            return TypedResults.BadRequest(badRequest);
        }

        try
        {
            var snapshot = await attemptService.SaveAnswerAsync(
                new SaveAttemptAnswerCommand(attemptId, questionId, request.SelectedOptionId),
                cancellationToken);

            if (snapshot is null)
            {
                var notFound = new ProblemDetails
                {
                    Title = "Attempt not found",
                    Detail = $"Attempt with id '{attemptId}' was not found.",
                    Status = StatusCodes.Status404NotFound,
                    Type = $"https://httpstatuses.com/{StatusCodes.Status404NotFound}"
                };
                notFound.Extensions["code"] = ApiErrorCodes.NotFound;
                return TypedResults.NotFound(notFound);
            }

            return TypedResults.Ok(MapExecutionStateResponse(snapshot));
        }
        catch (ArgumentException ex)
        {
            var badRequest = new ProblemDetails
            {
                Title = "Invalid answer payload",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
                Type = $"https://httpstatuses.com/{StatusCodes.Status400BadRequest}"
            };
            badRequest.Extensions["code"] = ApiErrorCodes.ValidationFailed;
            return TypedResults.BadRequest(badRequest);
        }
        catch (InvalidOperationException ex)
        {
            var conflict = new ProblemDetails
            {
                Title = "Attempt cannot be changed",
                Detail = ex.Message,
                Status = StatusCodes.Status409Conflict,
                Type = $"https://httpstatuses.com/{StatusCodes.Status409Conflict}"
            };
            conflict.Extensions["code"] = ApiErrorCodes.Conflict;
            return TypedResults.Conflict(conflict);
        }
    }

    private static async Task<Results<Ok<AttemptResponse>, NotFound<ProblemDetails>, Conflict<ProblemDetails>>> SubmitAttempt(
        Guid attemptId,
        IAttemptService attemptService,
        CancellationToken cancellationToken)
    {
        try
        {
            var snapshot = await attemptService.SubmitAsync(attemptId, cancellationToken);

            if (snapshot is null)
            {
                var notFound = new ProblemDetails
                {
                    Title = "Attempt not found",
                    Detail = $"Attempt with id '{attemptId}' was not found.",
                    Status = StatusCodes.Status404NotFound,
                    Type = $"https://httpstatuses.com/{StatusCodes.Status404NotFound}"
                };
                notFound.Extensions["code"] = ApiErrorCodes.NotFound;
                return TypedResults.NotFound(notFound);
            }

            return TypedResults.Ok(MapAttemptResponse(snapshot));
        }
        catch (InvalidOperationException ex)
        {
            var conflict = new ProblemDetails
            {
                Title = "Attempt cannot be submitted",
                Detail = ex.Message,
                Status = StatusCodes.Status409Conflict,
                Type = $"https://httpstatuses.com/{StatusCodes.Status409Conflict}"
            };
            conflict.Extensions["code"] = ApiErrorCodes.Conflict;
            return TypedResults.Conflict(conflict);
        }
    }

    private static AttemptResponse MapAttemptResponse(AttemptSnapshot snapshot) =>
        new(
            snapshot.AttemptId,
            snapshot.ExamId,
            snapshot.Status,
            snapshot.StartedAtUtc,
            snapshot.DeadlineAtUtc,
            snapshot.LastSeenAtUtc,
            snapshot.SubmittedAtUtc);

    private static AttemptExecutionStateResponse MapExecutionStateResponse(AttemptExecutionStateSnapshot snapshot) =>
        new(
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

    private static AttemptResultResponse MapAttemptResultResponse(AttemptResultSnapshot snapshot) =>
        new(
            snapshot.AttemptId,
            snapshot.ExamId,
            snapshot.Score,
            snapshot.Percentage,
            snapshot.Passed,
            snapshot.Outcome,
            snapshot.TotalQuestions,
            snapshot.CorrectAnswers,
            snapshot.IncorrectAnswers,
            snapshot.UnansweredQuestions,
            snapshot.SubmittedAtUtc,
            snapshot.EvaluatedAtUtc,
            snapshot.QuestionReviews
                .Select(review => new AttemptResultQuestionReviewResponse(
                    review.QuestionId,
                    review.SectionId,
                    review.SectionTitle,
                    review.QuestionCode,
                    review.Prompt,
                    review.Topic,
                    review.Difficulty,
                    review.UserSelectedOptionId,
                    review.UserSelectedOptionCode,
                    review.UserSelectedOptionText,
                    review.CorrectOptionId,
                    review.CorrectOptionCode,
                    review.CorrectOptionText,
                    review.IsCorrect,
                    review.ExplanationSummary,
                    review.ExplanationDetails))
                .ToArray(),
            snapshot.TopicAnalysis
                .Select(topic => new AttemptResultTopicAnalysisResponse(
                    topic.Topic,
                    topic.TotalQuestions,
                    topic.CorrectAnswers,
                    topic.IncorrectAnswers,
                    topic.UnansweredQuestions,
                    topic.ScorePercentage))
                .ToArray());
}
