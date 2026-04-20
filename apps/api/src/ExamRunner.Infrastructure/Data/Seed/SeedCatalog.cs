using ExamRunner.Infrastructure.Data.Entities;

namespace ExamRunner.Infrastructure.Data.Seed;

internal static class SeedCatalog
{
    public static readonly Guid DotNetExamId = Guid.Parse("8a4f90f8-f24c-45e8-88c5-b6f7f5ff9fc1");
    public static readonly Guid DotNetSec1Id = Guid.Parse("d6b32959-1f95-4c52-a2b4-95e1fd2f8d16");
    public static readonly Guid DotNetSec2Id = Guid.Parse("b9fcbe5b-eb3b-4cc5-b2c9-9ef6d314f710");

    public static readonly Guid ReactExamId = Guid.Parse("646530f8-54e9-416f-82be-3e51f7fbe4bf");
    public static readonly Guid ReactSec1Id = Guid.Parse("16180a4b-e631-4024-9fbe-fadf7edfdb0f");
    public static readonly Guid ReactSec2Id = Guid.Parse("92f7cb55-ebf5-4e15-a29d-f713ecea5141");

    public static IReadOnlyList<ExamEntity> CreateExams()
    {
        return
        [
            new ExamEntity
            {
                Id = DotNetExamId,
                Title = "Simulado .NET 8 Fundamentals",
                Description = "Exame introdutório para fundamentos de ASP.NET Core e C#.",
                DurationMinutes = 60,
                PassingScorePercentage = 70,
                SchemaVersion = "1.0.0",
                Sections =
                [
                    new ExamSectionEntity
                    {
                        Id = DotNetSec1Id,
                        SectionCode = "sec-1",
                        Title = "C# e Runtime",
                        QuestionCount = 8
                    },
                    new ExamSectionEntity
                    {
                        Id = DotNetSec2Id,
                        SectionCode = "sec-2",
                        Title = "ASP.NET Core",
                        QuestionCount = 12
                    }
                ]
            },
            new ExamEntity
            {
                Id = ReactExamId,
                Title = "Simulado React + TypeScript",
                Description = "Exame focado em navegação, estado e tipagem no frontend.",
                DurationMinutes = 45,
                PassingScorePercentage = 75,
                SchemaVersion = "1.0.0",
                Sections =
                [
                    new ExamSectionEntity
                    {
                        Id = ReactSec1Id,
                        SectionCode = "sec-1",
                        Title = "React Core",
                        QuestionCount = 10
                    },
                    new ExamSectionEntity
                    {
                        Id = ReactSec2Id,
                        SectionCode = "sec-2",
                        Title = "TypeScript",
                        QuestionCount = 10
                    }
                ]
            }
        ];
    }
}
