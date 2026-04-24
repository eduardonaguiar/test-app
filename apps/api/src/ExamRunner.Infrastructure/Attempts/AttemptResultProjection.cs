using System.Text.Json;
using ExamRunner.Application.Attempts;
using ExamRunner.Infrastructure.Data.Entities;

namespace ExamRunner.Infrastructure.Attempts;

internal static class AttemptResultProjection
{
    private static readonly JsonSerializerOptions ResultSerializationOptions = new(JsonSerializerDefaults.Web);

    public static AttemptResultEntity BuildScoredResult(
        AttemptEntity attempt,
        DateTimeOffset evaluatedAtUtc,
        IAttemptScoringService scoringService)
    {
        var objectiveQuestions = attempt.Exam.Sections
            .SelectMany(section => section.Questions)
            .Select(question => new ObjectiveQuestionForScoring(
                question.Id,
                question.Topic,
                question.Options.Single(option => option.IsCorrect).Id,
                question.Weight))
            .ToList();

        var objectiveAnswers = attempt.Answers
            .Select(answer => new ObjectiveAnswerForScoring(answer.QuestionId, answer.SelectedOptionId))
            .ToArray();

        var scoreResult = scoringService.ScoreObjectiveAttempt(
            objectiveQuestions,
            objectiveAnswers,
            attempt.Exam.PassingScorePercentage);

        return new AttemptResultEntity
        {
            Id = Guid.NewGuid(),
            AttemptId = attempt.Id,
            TotalQuestions = scoreResult.TotalQuestions,
            CorrectAnswers = scoreResult.CorrectAnswers,
            IncorrectAnswers = scoreResult.IncorrectAnswers,
            UnansweredQuestions = scoreResult.UnansweredQuestions,
            ScorePercentage = scoreResult.ScorePercentage,
            Passed = scoreResult.Passed,
            EvaluatedAtUtc = evaluatedAtUtc
        };
    }

    public static IReadOnlyList<AttemptResultQuestionReviewSnapshot> BuildQuestionReviews(AttemptEntity attempt)
    {
        var selectedOptionsByQuestionId = attempt.Answers
            .GroupBy(answer => answer.QuestionId)
            .ToDictionary(group => group.Key, group => group.OrderByDescending(answer => answer.UpdatedAtUtc).First().SelectedOptionId);

        return attempt.Exam.Sections
            .OrderBy(section => section.DisplayOrder)
            .SelectMany(section => section.Questions
                .OrderBy(question => question.DisplayOrder)
                .Select(question =>
                {
                    selectedOptionsByQuestionId.TryGetValue(question.Id, out var selectedOptionId);

                    var correctOption = question.Options.Single(option => option.IsCorrect);
                    var userOption = selectedOptionId.HasValue
                        ? question.Options.SingleOrDefault(option => option.Id == selectedOptionId.Value)
                        : null;

                    return new AttemptResultQuestionReviewSnapshot(
                        question.Id,
                        section.Id,
                        section.Title,
                        question.QuestionCode,
                        question.Prompt,
                        question.Topic,
                        question.Difficulty,
                        userOption?.Id,
                        userOption?.OptionCode,
                        userOption?.Text,
                        correctOption.Id,
                        correctOption.OptionCode,
                        correctOption.Text,
                        userOption?.Id == correctOption.Id,
                        question.ExplanationSummary,
                        question.ExplanationDetails);
                }))
            .ToArray();
    }

    public static IReadOnlyList<TopicScoreBreakdown> BuildTopicAnalysis(
        AttemptEntity attempt,
        IAttemptScoringService scoringService)
    {
        var questions = attempt.Exam.Sections
            .SelectMany(section => section.Questions)
            .Select(question => new ObjectiveQuestionForScoring(
                question.Id,
                question.Topic,
                question.Options.Single(option => option.IsCorrect).Id,
                question.Weight))
            .ToArray();

        var answers = attempt.Answers
            .Select(answer => new ObjectiveAnswerForScoring(answer.QuestionId, answer.SelectedOptionId))
            .ToArray();

        return scoringService
            .ScoreObjectiveAttempt(questions, answers, attempt.Exam.PassingScorePercentage)
            .TopicBreakdown;
    }

    public static IReadOnlyList<AttemptResultQuestionReviewSnapshot> DeserializePersistedQuestionReviews(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return [];
        }

        return JsonSerializer.Deserialize<IReadOnlyList<AttemptResultQuestionReviewSnapshot>>(value, ResultSerializationOptions)
            ?? [];
    }

    public static IReadOnlyList<TopicScoreBreakdown> DeserializePersistedTopicAnalysis(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return [];
        }

        return JsonSerializer.Deserialize<IReadOnlyList<TopicScoreBreakdown>>(value, ResultSerializationOptions)
            ?? [];
    }

    public static string SerializeQuestionReviews(IReadOnlyList<AttemptResultQuestionReviewSnapshot> questionReviews)
    {
        return JsonSerializer.Serialize(questionReviews, ResultSerializationOptions);
    }

    public static string SerializeTopicAnalysis(IReadOnlyList<TopicScoreBreakdown> topicAnalysis)
    {
        return JsonSerializer.Serialize(topicAnalysis, ResultSerializationOptions);
    }
}
