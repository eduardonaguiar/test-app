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
        var breakdown = new List<TopicScoreBreakdown>();

        foreach (var topicGroup in questions.GroupBy(question => ResolveTopic(question.Topic)).OrderBy(group => group.Key))
        {
            var topicTotalQuestions = topicGroup.Count();
            var topicCorrectAnswers = 0;
            var topicIncorrectAnswers = 0;

            foreach (var question in topicGroup)
            {
                if (!answerByQuestionId.TryGetValue(question.QuestionId, out var answer) || !answer.SelectedOptionId.HasValue)
                {
                    continue;
                }

                if (answer.SelectedOptionId.Value == question.CorrectOptionId)
                {
                    topicCorrectAnswers++;
                    globalCorrectAnswers++;
                }
                else
                {
                    topicIncorrectAnswers++;
                    globalIncorrectAnswers++;
                }
            }

            var topicUnansweredQuestions = topicTotalQuestions - topicCorrectAnswers - topicIncorrectAnswers;
            var topicScorePercentage = CalculatePercentage(topicCorrectAnswers, topicTotalQuestions);

            breakdown.Add(new TopicScoreBreakdown(
                topicGroup.Key,
                topicTotalQuestions,
                topicCorrectAnswers,
                topicIncorrectAnswers,
                topicUnansweredQuestions,
                topicScorePercentage));
        }

        var globalUnansweredQuestions = globalTotalQuestions - globalCorrectAnswers - globalIncorrectAnswers;
        var globalScorePercentage = CalculatePercentage(globalCorrectAnswers, globalTotalQuestions);

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

    private static decimal CalculatePercentage(int correctAnswers, int totalQuestions)
    {
        if (totalQuestions == 0)
        {
            return 0m;
        }

        return Math.Round((decimal)correctAnswers * 100m / totalQuestions, 2, MidpointRounding.AwayFromZero);
    }
}
