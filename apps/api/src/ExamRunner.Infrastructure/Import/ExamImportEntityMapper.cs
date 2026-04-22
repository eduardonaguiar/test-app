using ExamRunner.Infrastructure.Data.Entities;

namespace ExamRunner.Infrastructure.Import;

public sealed class ExamImportEntityMapper : IExamImportEntityMapper
{
    public ExamEntity Map(ImportExamPayload payload)
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
            ReconnectGracePeriodSeconds = payload.ReconnectPolicy.GracePeriodSeconds,
            ReconnectTerminateIfExceeded = payload.ReconnectPolicy.TerminateIfExceeded,
            EditorialStatus = ExamEntity.DraftStatus
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
}
