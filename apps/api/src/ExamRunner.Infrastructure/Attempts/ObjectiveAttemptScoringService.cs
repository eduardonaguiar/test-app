using ExamRunner.Application.Attempts;

namespace ExamRunner.Infrastructure.Attempts;

public sealed class ObjectiveAttemptScoringService : IAttemptScoringService
{
    private const string DefaultTopic = "Sem tópico";

    public AttemptScoringResult ScoreObjectiveAttempt(
        IReadOnlyCollection<ObjectiveQuestionForScoring> questions,
        IReadOnlyCollection<ObjectiveAnswerForScoring> answers,
        int passingScorePercentage)
    {
        var answerByQuestionId = answers
            .GroupBy(answer => answer.QuestionId)
            .ToDictionary(group => group.Key, group => group.Last());

        var globalTotalQuestions = questions.Count;
        var globalCorrectAnswers = 0;
        var globalIncorrectAnswers = 0;
        var globalTotalWeight = questions.Sum(question => question.Weight);
        var globalCorrectWeight = 0m;
        var breakdown = new List<TopicScoreBreakdown>();

        foreach (var topicGroup in questions.GroupBy(question => ResolveTopic(question.Topic)).OrderBy(group => group.Key))
        {
            var topicQuestions = topicGroup.ToArray();
            var topicTotalQuestions = topicQuestions.Length;
            var topicCorrectAnswers = 0;
            var topicIncorrectAnswers = 0;
            var topicTotalWeight = topicQuestions.Sum(question => question.Weight);
            var topicCorrectWeight = 0m;

            foreach (var question in topicQuestions)
            {
                if (!answerByQuestionId.TryGetValue(question.QuestionId, out var answer) || !answer.SelectedOptionId.HasValue)
                {
                    continue;
                }

                if (answer.SelectedOptionId.Value == question.CorrectOptionId)
                {
                    topicCorrectAnswers++;
                    topicCorrectWeight += question.Weight;
                    globalCorrectAnswers++;
                    globalCorrectWeight += question.Weight;
                }
                else
                {
                    topicIncorrectAnswers++;
                    globalIncorrectAnswers++;
                }
            }

            var topicUnansweredQuestions = topicTotalQuestions - topicCorrectAnswers - topicIncorrectAnswers;
            var topicScorePercentage = CalculatePercentage(topicCorrectWeight, topicTotalWeight);

            breakdown.Add(new TopicScoreBreakdown(
                topicGroup.Key,
                topicTotalQuestions,
                topicCorrectAnswers,
                topicIncorrectAnswers,
                topicUnansweredQuestions,
                topicScorePercentage));
        }

        var globalUnansweredQuestions = globalTotalQuestions - globalCorrectAnswers - globalIncorrectAnswers;
        var globalScorePercentage = CalculatePercentage(globalCorrectWeight, globalTotalWeight);

        return new AttemptScoringResult(
            globalTotalQuestions,
            globalCorrectAnswers,
            globalIncorrectAnswers,
            globalUnansweredQuestions,
            globalScorePercentage,
            globalScorePercentage >= passingScorePercentage,
            breakdown);
    }

    private static string ResolveTopic(string topic) => string.IsNullOrWhiteSpace(topic) ? DefaultTopic : topic.Trim();

    private static decimal CalculatePercentage(decimal correctWeight, decimal totalWeight)
    {
        if (totalWeight <= 0m)
        {
            return 0m;
        }

        return Math.Round(correctWeight * 100m / totalWeight, 2, MidpointRounding.AwayFromZero);
    }
}
