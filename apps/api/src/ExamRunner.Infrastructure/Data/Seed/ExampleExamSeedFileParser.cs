using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using ExamRunner.Infrastructure.Data.Entities;

namespace ExamRunner.Infrastructure.Data.Seed;

internal static class ExampleExamSeedFileParser
{
    public static ExamEntity Parse(string filePath)
    {
        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException($"Example exam file was not found at '{filePath}'.", filePath);
        }

        var rawJson = File.ReadAllText(filePath);
        var payload = JsonSerializer.Deserialize<SeedExamPayload>(rawJson, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        }) ?? throw new InvalidOperationException("Could not deserialize example exam JSON file.");

        if (payload.Metadata is null)
        {
            throw new InvalidOperationException("Example exam JSON is missing metadata.");
        }

        var examId = DeterministicGuid(payload.Metadata.ExamId);

        var exam = new ExamEntity
        {
            Id = examId,
            Title = payload.Metadata.Title,
            Description = payload.Metadata.Description,
            DurationMinutes = payload.DurationMinutes,
            PassingScorePercentage = (int)Math.Round(payload.PassingScore),
            SchemaVersion = payload.SchemaVersion,
            ReconnectEnabled = payload.ReconnectPolicy.Enabled,
            MaxReconnectAttempts = payload.ReconnectPolicy.MaxReconnects,
            ReconnectGracePeriodSeconds = payload.ReconnectPolicy.GracePeriodSeconds,
            ReconnectTerminateIfExceeded = payload.ReconnectPolicy.TerminateIfExceeded
        };

        var sectionOrder = 1;
        foreach (var sectionPayload in payload.Sections)
        {
            var section = new ExamSectionEntity
            {
                Id = DeterministicGuid($"{payload.Metadata.ExamId}:section:{sectionPayload.SectionId}"),
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
                    Id = DeterministicGuid($"{payload.Metadata.ExamId}:question:{questionPayload.QuestionId}"),
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
                        Id = DeterministicGuid($"{payload.Metadata.ExamId}:question:{questionPayload.QuestionId}:option:{optionPayload.OptionId}"),
                        OptionCode = optionPayload.OptionId,
                        Text = optionPayload.Text,
                        IsCorrect = optionPayload.OptionId == questionPayload.CorrectOptionId,
                        DisplayOrder = optionOrder++
                    });
                }

                section.Questions.Add(question);
            }

            exam.Sections.Add(section);
        }

        return exam;
    }

    private static Guid DeterministicGuid(string value)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        var guidBytes = new byte[16];
        Array.Copy(hash, guidBytes, guidBytes.Length);
        return new Guid(guidBytes);
    }

    private sealed record SeedExamPayload(
        string SchemaVersion,
        SeedMetadataPayload Metadata,
        int DurationMinutes,
        decimal PassingScore,
        SeedReconnectPolicyPayload ReconnectPolicy,
        List<SeedSectionPayload> Sections);

    private sealed record SeedMetadataPayload(string ExamId, string Title, string Description);

    private sealed record SeedReconnectPolicyPayload(
        bool Enabled,
        int MaxReconnects,
        int GracePeriodSeconds,
        bool TerminateIfExceeded);

    private sealed record SeedSectionPayload(string SectionId, string Title, List<SeedQuestionPayload> Questions);

    private sealed record SeedQuestionPayload(
        string QuestionId,
        string Prompt,
        List<SeedOptionPayload> Options,
        string CorrectOptionId,
        string ExplanationSummary,
        string ExplanationDetailed,
        string Topic,
        string Difficulty,
        decimal Weight);

    private sealed record SeedOptionPayload(string OptionId, string Text);
}
