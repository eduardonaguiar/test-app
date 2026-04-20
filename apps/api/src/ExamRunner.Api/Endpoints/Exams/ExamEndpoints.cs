using ExamRunner.Api.Contracts.Errors;
using ExamRunner.Api.Contracts.Exams;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace ExamRunner.Api.Endpoints.Exams;

public static class ExamEndpoints
{
    private static readonly IReadOnlyList<ExamDetailResponse> Catalog =
    [
        new(
            ExamId: Guid.Parse("8a4f90f8-f24c-45e8-88c5-b6f7f5ff9fc1"),
            Title: "Simulado .NET 8 Fundamentals",
            Description: "Exame introdutório para fundamentos de ASP.NET Core e C#.",
            DurationMinutes: 60,
            PassingScorePercentage: 70,
            SchemaVersion: "1.0.0",
            Sections:
            [
                new ExamSectionResponse("sec-1", "C# e Runtime", 8),
                new ExamSectionResponse("sec-2", "ASP.NET Core", 12)
            ]),
        new(
            ExamId: Guid.Parse("646530f8-54e9-416f-82be-3e51f7fbe4bf"),
            Title: "Simulado React + TypeScript",
            Description: "Exame focado em navegação, estado e tipagem no frontend.",
            DurationMinutes: 45,
            PassingScorePercentage: 75,
            SchemaVersion: "1.0.0",
            Sections:
            [
                new ExamSectionResponse("sec-1", "React Core", 10),
                new ExamSectionResponse("sec-2", "TypeScript", 10)
            ])
    ];

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

    private static Ok<ListExamsResponse> ListExams()
    {
        var items = Catalog
            .Select(exam => new ExamSummaryResponse(
                ExamId: exam.ExamId,
                Title: exam.Title,
                DurationMinutes: exam.DurationMinutes,
                PassingScorePercentage: exam.PassingScorePercentage))
            .ToArray();

        return TypedResults.Ok(new ListExamsResponse(items));
    }

    private static Results<Ok<ExamDetailResponse>, NotFound<ProblemDetails>> GetExamById(Guid examId)
    {
        var exam = Catalog.SingleOrDefault(x => x.ExamId == examId);

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

        return TypedResults.Ok(exam);
    }
}
