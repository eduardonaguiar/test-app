using ExamRunner.Api.Contracts.Errors;
using ExamRunner.Api.Contracts.Exams;
using ExamRunner.Infrastructure.Repositories;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace ExamRunner.Api.Endpoints.Exams;

public static class ExamEndpoints
{
    public static IEndpointRouteBuilder MapExamEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/exams", ListExams)
            .WithName("ListExams")
            .WithTags("Exams")
            .WithSummary("Lista exames importados disponíveis")
            .Produces<ListExamsResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status500InternalServerError);

        app.MapGet("/exams/{examId:guid}", GetExamById)
            .WithName("GetExamById")
            .WithTags("Exams")
            .WithSummary("Retorna detalhes de um exame")
            .Produces<ExamDetailResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status500InternalServerError);

        return app;
    }

    private static async Task<Ok<ListExamsResponse>> ListExams(
        IExamReadRepository repository,
        CancellationToken cancellationToken)
    {
        var exams = await repository.ListAsync(cancellationToken);

        var items = exams
            .Select(exam => new ExamSummaryResponse(
                ExamId: exam.Id,
                Title: exam.Title,
                DurationMinutes: exam.DurationMinutes,
                PassingScorePercentage: exam.PassingScorePercentage))
            .ToArray();

        return TypedResults.Ok(new ListExamsResponse(items));
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
            DurationMinutes: exam.DurationMinutes,
            PassingScorePercentage: exam.PassingScorePercentage,
            SchemaVersion: exam.SchemaVersion,
            Sections: exam.Sections
                .OrderBy(section => section.SectionCode)
                .Select(section => new ExamSectionResponse(section.SectionCode, section.Title, section.QuestionCount))
                .ToArray());

        return TypedResults.Ok(response);
    }
}
