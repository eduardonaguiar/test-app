using System.Text.Json;
using ExamRunner.Infrastructure.Data;
using ExamRunner.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using NJsonSchema;

namespace ExamRunner.Infrastructure.Import;

public sealed class ExamImportService(ExamRunnerDbContext dbContext, IHostEnvironment hostEnvironment) : IExamImportService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public async Task<ExamImportResult> ImportAsync(string rawJson, CancellationToken cancellationToken)
    {
        var schema = await LoadOfficialSchemaAsync();
        var schemaErrors = schema.Validate(rawJson)
            .Select(error => new ExamImportValidationError(error.Path, error.ToString()))
            .ToArray();

        if (schemaErrors.Length > 0)
        {
            throw new ExamImportException(
                "Exam JSON payload is invalid according to the official schema.",
                schemaErrors,
                "validation_failed");
        }

        var payload = JsonSerializer.Deserialize<ImportExamPayload>(rawJson, JsonOptions)
            ?? throw new ExamImportException(
                "Exam JSON payload is empty or malformed.",
                [new ExamImportValidationError("$", "Payload could not be deserialized.")],
                "validation_failed");

        var consistencyErrors = ValidateConsistency(payload).ToArray();
        if (consistencyErrors.Length > 0)
        {
            throw new ExamImportException(
                "Exam JSON payload is structurally valid but contains inconsistent references.",
                consistencyErrors,
                "import_inconsistent_payload");
        }

        var exam = MapToEntity(payload);

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        dbContext.Exams.Add(exam);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        var questionCount = exam.Sections.Sum(section => section.QuestionCount);
        return new ExamImportResult(exam.Id, exam.Title, exam.Sections.Count, questionCount);
    }

    private async Task<JsonSchema> LoadOfficialSchemaAsync()
    {
        var schemaPath = ResolveSchemaPath();
        await using var stream = File.OpenRead(schemaPath);
        return await JsonSchema.FromStreamAsync(stream);
    }

    private string ResolveSchemaPath()
    {
        var current = new DirectoryInfo(hostEnvironment.ContentRootPath);

        while (current is not null)
        {
            var candidate = Path.Combine(current.FullName, "packages", "exam-schema", "src", "exam.schema.json");
            if (File.Exists(candidate))
            {
                return candidate;
            }

            current = current.Parent;
        }

        throw new FileNotFoundException("Official exam schema file was not found.");
    }

    private static IEnumerable<ExamImportValidationError> ValidateConsistency(ImportExamPayload payload)
    {
        var sectionIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var questionIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        for (var sectionIndex = 0; sectionIndex < payload.Sections.Count; sectionIndex++)
        {
            var section = payload.Sections[sectionIndex];
            var sectionPath = $"$.sections[{sectionIndex}]";

            if (!sectionIds.Add(section.SectionId))
            {
                yield return new ExamImportValidationError($"{sectionPath}.sectionId", $"Section id '{section.SectionId}' is duplicated.");
            }

            for (var questionIndex = 0; questionIndex < section.Questions.Count; questionIndex++)
            {
                var question = section.Questions[questionIndex];
                var questionPath = $"{sectionPath}.questions[{questionIndex}]";

                if (!questionIds.Add(question.QuestionId))
                {
                    yield return new ExamImportValidationError($"{questionPath}.questionId", $"Question id '{question.QuestionId}' is duplicated across sections.");
                }

                var optionIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                var hasCorrectOption = false;

                for (var optionIndex = 0; optionIndex < question.Options.Count; optionIndex++)
                {
                    var option = question.Options[optionIndex];
                    var optionPath = $"{questionPath}.options[{optionIndex}]";

                    if (!optionIds.Add(option.OptionId))
                    {
                        yield return new ExamImportValidationError($"{optionPath}.optionId", $"Option id '{option.OptionId}' is duplicated in question '{question.QuestionId}'.");
                    }

                    if (string.Equals(option.OptionId, question.CorrectOptionId, StringComparison.OrdinalIgnoreCase))
                    {
                        hasCorrectOption = true;
                    }
                }

                if (!hasCorrectOption)
                {
                    yield return new ExamImportValidationError(
                        $"{questionPath}.correctOptionId",
                        $"Correct option id '{question.CorrectOptionId}' was not found in question '{question.QuestionId}'.");
                }
            }
        }
    }

    private static ExamEntity MapToEntity(ImportExamPayload payload)
    {
        var exam = new ExamEntity
        {
            Id = Guid.NewGuid(),
            Title = payload.Metadata.Title,
            Description = payload.Metadata.Description ?? string.Empty,
            DurationMinutes = payload.DurationMinutes,
            PassingScorePercentage = (int)Math.Round(payload.PassingScore, MidpointRounding.AwayFromZero),
            SchemaVersion = payload.SchemaVersion,
            ReconnectEnabled = payload.ReconnectPolicy.Enabled,
            MaxReconnectAttempts = payload.ReconnectPolicy.MaxReconnects,
            ReconnectGracePeriodSeconds = payload.ReconnectPolicy.GracePeriodSeconds
        };

        var sectionOrder = 1;
        foreach (var sectionPayload in payload.Sections)
        {
            var section = new ExamSectionEntity
            {
                Id = Guid.NewGuid(),
                SectionCode = sectionPayload.SectionId,
                Title = sectionPayload.Title,
                QuestionCount = sectionPayload.Questions.Count,
                DisplayOrder = sectionOrder++
            };

            var questionOrder = 1;
            foreach (var questionPayload in sectionPayload.Questions)
            {
                var question = new QuestionEntity
                {
                    Id = Guid.NewGuid(),
                    QuestionCode = questionPayload.QuestionId,
                    Prompt = questionPayload.Prompt,
                    ExplanationSummary = questionPayload.ExplanationSummary,
                    ExplanationDetails = questionPayload.ExplanationDetailed,
                    Topic = questionPayload.Topic,
                    Difficulty = questionPayload.Difficulty,
                    Weight = questionPayload.Weight,
                    DisplayOrder = questionOrder++
                };

                var optionOrder = 1;
                foreach (var optionPayload in questionPayload.Options)
                {
                    question.Options.Add(new QuestionOptionEntity
                    {
                        Id = Guid.NewGuid(),
                        OptionCode = optionPayload.OptionId,
                        Text = optionPayload.Text,
                        IsCorrect = string.Equals(optionPayload.OptionId, questionPayload.CorrectOptionId, StringComparison.OrdinalIgnoreCase),
                        DisplayOrder = optionOrder++
                    });
                }

                section.Questions.Add(question);
            }

            exam.Sections.Add(section);
        }

        return exam;
    }

    private sealed record ImportExamPayload(
        string SchemaVersion,
        ImportExamMetadataPayload Metadata,
        int DurationMinutes,
        decimal PassingScore,
        ImportReconnectPolicyPayload ReconnectPolicy,
        List<ImportSectionPayload> Sections);

    private sealed record ImportExamMetadataPayload(
        string ExamId,
        string Title,
        string? Description);

    private sealed record ImportReconnectPolicyPayload(bool Enabled, int MaxReconnects, int GracePeriodSeconds);

    private sealed record ImportSectionPayload(string SectionId, string Title, List<ImportQuestionPayload> Questions);

    private sealed record ImportQuestionPayload(
        string QuestionId,
        string Prompt,
        List<ImportOptionPayload> Options,
        string CorrectOptionId,
        string ExplanationSummary,
        string ExplanationDetailed,
        string Topic,
        string Difficulty,
        decimal Weight);

    private sealed record ImportOptionPayload(string OptionId, string Text);
}
