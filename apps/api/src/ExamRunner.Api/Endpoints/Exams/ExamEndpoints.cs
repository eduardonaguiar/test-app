using System.Text.Json;
using ExamRunner.Api.Contracts.Errors;
using ExamRunner.Api.Contracts.Exams;
using ExamRunner.Infrastructure.Authoring;
using ExamRunner.Infrastructure.Import;
using ExamRunner.Infrastructure.Repositories;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace ExamRunner.Api.Endpoints.Exams;

public static class ExamEndpoints
{
    public static IEndpointRouteBuilder MapExamEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/exams/import", ImportExam)
            .WithName("ImportExam")
            .WithTags("Exams")
            .WithSummary("Importa uma prova em JSON validando contra o schema oficial")
            .Accepts<JsonElement>("application/json")
            .Produces<ImportExamResponse>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status500InternalServerError);

        app.MapGet("/exams", ListExams)
            .WithName("ListExams")
            .WithTags("Exams")
            .WithSummary("Lista exames importados disponíveis")
            .Produces<ListExamsResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status500InternalServerError);

        app.MapGet("/exams/authoring", ListAuthoringTests)
            .WithName("ListAuthoringTests")
            .WithTags("Exams")
            .WithSummary("Lista testes para fluxo de autoria e manutenção")
            .Produces<ListAuthoringTestsResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status500InternalServerError);

        app.MapGet("/exams/{examId:guid}", GetExamById)
            .WithName("GetExamById")
            .WithTags("Exams")
            .WithSummary("Retorna detalhes de um exame")
            .Produces<ExamDetailResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status500InternalServerError);

        app.MapPost("/authoring/exams/{examId:guid}/publish", PublishExam)
            .WithName("PublishExam")
            .WithTags("Exams")
            .WithSummary("Publica uma prova após revalidação editorial no backend")
            .Produces<PublishExamResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status500InternalServerError);

        return app;
    }

    private static async Task<Results<Created<ImportExamResponse>, BadRequest<ProblemDetails>>> ImportExam(
        JsonElement payload,
        IExamImportService importService,
        CancellationToken cancellationToken)
    {
        try
        {
            var rawJson = payload.GetRawText();
            var result = await importService.ImportAsync(rawJson, cancellationToken);

            var response = new ImportExamResponse(result.ExamId, result.Title, result.SectionCount, result.QuestionCount);
            return TypedResults.Created($"/api/exams/{result.ExamId}", response);
        }
        catch (ExamImportException ex)
        {
            var problem = new ProblemDetails
            {
                Title = "Exam import failed",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
                Type = $"https://httpstatuses.com/{StatusCodes.Status400BadRequest}"
            };

            problem.Extensions["code"] = ex.ErrorCode;
            problem.Extensions["errors"] = ex.Errors
                .Select(error => new
                {
                    path = error.Path,
                    message = error.Message
                })
                .ToArray();

            return TypedResults.BadRequest(problem);
        }
    }

    private static async Task<Ok<ListExamsResponse>> ListExams(
        IExamReadRepository repository,
        CancellationToken cancellationToken)
    {
        var exams = await repository.ListAsync(cancellationToken);

        var items = exams
            .Select(exam => new ExamSummaryResponse(
                ExamId: exam.ExamId,
                Title: exam.Title,
                Description: exam.Description,
                DurationMinutes: exam.DurationMinutes,
                PassingScorePercentage: exam.PassingScorePercentage,
                SchemaVersion: exam.SchemaVersion,
                ReconnectEnabled: exam.ReconnectEnabled,
                SectionCount: exam.SectionCount,
                QuestionCount: exam.QuestionCount))
            .ToArray();

        return TypedResults.Ok(new ListExamsResponse(items));
    }

    private static async Task<Ok<ListAuthoringTestsResponse>> ListAuthoringTests(
        IExamReadRepository repository,
        CancellationToken cancellationToken)
    {
        var tests = await repository.ListAuthoringAsync(cancellationToken);

        var items = tests
            .Select(test => new AuthoringTestSummaryResponse(
                ExamId: test.ExamId,
                Title: test.Title,
                Description: test.Description,
                Status: test.Status,
                QuestionCount: test.QuestionCount,
                SectionCount: test.SectionCount,
                UpdatedAt: test.UpdatedAtUtc))
            .ToArray();

        return TypedResults.Ok(new ListAuthoringTestsResponse(items));
    }

    private static async Task<Results<Ok<ExamDetailResponse>, NotFound<ProblemDetails>>> GetExamById(
        Guid examId,
        IExamReadRepository repository,
        CancellationToken cancellationToken)
    {
        var exam = await repository.GetByIdAsync(examId, cancellationToken);

        if (exam is null)
        {
            var problem = new ProblemDetails
            {
                Title = "Exam not found",
                Detail = $"No exam found with id '{examId}'.",
                Status = StatusCodes.Status404NotFound,
                Type = $"https://httpstatuses.com/{StatusCodes.Status404NotFound}"
            };
            problem.Extensions["code"] = ApiErrorCodes.NotFound;

            return TypedResults.NotFound(problem);
        }

        var response = new ExamDetailResponse(
            ExamId: exam.Id,
            Title: exam.Title,
            Description: exam.Description,
            Status: exam.EditorialStatus,
            DurationMinutes: exam.DurationMinutes,
            PassingScorePercentage: exam.PassingScorePercentage,
            SchemaVersion: exam.SchemaVersion,
            SectionCount: exam.Sections.Count,
            QuestionCount: exam.Sections.Sum(section => section.Questions.Count),
            ReconnectPolicy: new ReconnectPolicyResponse(
                Enabled: exam.ReconnectEnabled,
                MaxReconnectAttempts: exam.MaxReconnectAttempts,
                GracePeriodSeconds: exam.ReconnectGracePeriodSeconds,
                TerminateIfExceeded: exam.ReconnectTerminateIfExceeded),
            Sections: exam.Sections
                .OrderBy(section => section.DisplayOrder)
                .Select(section => new ExamSectionDetailResponse(
                    SectionId: section.SectionCode,
                    Title: section.Title,
                    DisplayOrder: section.DisplayOrder,
                    QuestionCount: section.Questions.Count,
                    Questions: section.Questions
                        .OrderBy(question => question.DisplayOrder)
                        .Select(question => new ExamQuestionPreviewResponse(
                            QuestionId: question.QuestionCode,
                            Prompt: question.Prompt,
                            Topic: question.Topic,
                            Difficulty: question.Difficulty,
                            Weight: question.Weight,
                            Options: question.Options
                                .OrderBy(option => option.DisplayOrder)
                                .Select(option => new ExamQuestionOptionPreviewResponse(
                                    OptionId: option.OptionCode,
                                    Text: option.Text,
                                    DisplayOrder: option.DisplayOrder))
                                .ToArray()))
                        .ToArray()))
                .ToArray());

        return TypedResults.Ok(response);
    }

    private static async Task<Results<Ok<PublishExamResponse>, NotFound<ProblemDetails>, Conflict<ProblemDetails>>> PublishExam(
        Guid examId,
        IExamPublicationService publicationService,
        CancellationToken cancellationToken)
    {
        var (result, failure) = await publicationService.PublishAsync(examId, cancellationToken);

        if (failure is not null)
        {
            if (failure.Code == "EXAM_NOT_FOUND")
            {
                var notFoundProblem = new ProblemDetails
                {
                    Title = "Exam not found",
                    Detail = failure.Message,
                    Status = StatusCodes.Status404NotFound,
                    Type = $"https://httpstatuses.com/{StatusCodes.Status404NotFound}"
                };
                notFoundProblem.Extensions["code"] = ApiErrorCodes.NotFound;

                return TypedResults.NotFound(notFoundProblem);
            }

            var conflictProblem = new ProblemDetails
            {
                Title = "Exam cannot be published",
                Detail = failure.Message,
                Status = StatusCodes.Status409Conflict,
                Type = $"https://httpstatuses.com/{StatusCodes.Status409Conflict}"
            };
            conflictProblem.Extensions["code"] = failure.Code;
            conflictProblem.Extensions["errors"] = failure.Validation.BlockingErrors
                .Select(issue => new { path = issue.Path, message = issue.Message, severity = issue.Severity, code = issue.Code })
                .ToArray();
            conflictProblem.Extensions["warningCount"] = failure.Validation.Summary.WarningCount;

            return TypedResults.Conflict(conflictProblem);
        }

        var response = new PublishExamResponse(
            ExamId: result!.ExamId,
            Status: result.Status,
            PublishedAt: result.PublishedAtUtc,
            Validation: MapValidation(result.Validation));

        return TypedResults.Ok(response);
    }

    private static EditorialValidationResultResponse MapValidation(EditorialValidationResult validation) =>
        new(
            IsPublishable: validation.IsPublishable,
            BlockingErrors: validation.BlockingErrors
                .Select(issue => new EditorialValidationIssueResponse(issue.Code, issue.Severity, issue.Scope, issue.Message, issue.Path, issue.EntityId))
                .ToArray(),
            Warnings: validation.Warnings
                .Select(issue => new EditorialValidationIssueResponse(issue.Code, issue.Severity, issue.Scope, issue.Message, issue.Path, issue.EntityId))
                .ToArray(),
            Summary: new EditorialValidationSummaryResponse(
                validation.Summary.BlockingErrorCount,
                validation.Summary.WarningCount,
                validation.Summary.SectionCount,
                validation.Summary.QuestionCount,
                validation.Summary.ValidQuestionCount));
}
