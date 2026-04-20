namespace ExamRunner.Infrastructure.Attempts;

public interface IAttemptScoringService
{
    AttemptScoringResult ScoreObjectiveAttempt(
        IReadOnlyCollection<ObjectiveQuestionForScoring> questions,
        IReadOnlyCollection<ObjectiveAnswerForScoring> answers,
        int passingScorePercentage);
}
