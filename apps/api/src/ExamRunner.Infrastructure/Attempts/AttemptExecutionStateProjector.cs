using ExamRunner.Application.Attempts;
using ExamRunner.Infrastructure.Data.Entities;

namespace ExamRunner.Infrastructure.Attempts;

internal static class AttemptExecutionStateProjector
{
    public static AttemptExecutionStateSnapshot Build(AttemptEntity attempt, DateTimeOffset now)
    {
        var selectedOptionsByQuestionId = attempt.Answers
            .GroupBy(x => x.QuestionId)
            .ToDictionary(group => group.Key, group => group.OrderByDescending(answer => answer.UpdatedAtUtc).First().SelectedOptionId);

        var questions = attempt.Exam.Sections
            .OrderBy(section => section.DisplayOrder)
            .SelectMany(section => section.Questions
                .OrderBy(question => question.DisplayOrder)
                .Select(question =>
                {
                    selectedOptionsByQuestionId.TryGetValue(question.Id, out var selectedOptionId);

                    var options = question.Options
                        .OrderBy(option => option.DisplayOrder)
                        .Select(option => new AttemptExecutionQuestionOptionSnapshot(
                            option.Id,
                            option.OptionCode,
                            option.Text,
                            option.DisplayOrder))
                        .ToArray();

                    return new AttemptExecutionQuestionSnapshot(
                        question.Id,
                        section.Id,
                        section.Title,
                        question.QuestionCode,
                        question.Prompt,
                        question.DisplayOrder,
                        selectedOptionId,
                        selectedOptionId.HasValue,
                        options);
                }))
            .ToArray();

        var answeredQuestionCount = questions.Count(question => question.IsAnswered);
        var pendingQuestionCount = questions.Length - answeredQuestionCount;
        var remainingSeconds = (int)Math.Max(0, Math.Floor((attempt.DeadlineAtUtc - now).TotalSeconds));

        return new AttemptExecutionStateSnapshot(
            attempt.Id,
            attempt.ExamId,
            attempt.Status,
            attempt.StartedAtUtc,
            attempt.DeadlineAtUtc,
            attempt.LastSeenAtUtc,
            attempt.SubmittedAtUtc,
            remainingSeconds,
            answeredQuestionCount,
            pendingQuestionCount,
            questions);
    }
}
