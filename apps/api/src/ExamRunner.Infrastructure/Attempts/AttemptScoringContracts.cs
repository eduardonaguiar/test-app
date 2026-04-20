namespace ExamRunner.Infrastructure.Attempts;

public sealed record ObjectiveQuestionForScoring(
    Guid QuestionId,
    string Topic,
    Guid CorrectOptionId,
    decimal Weight = 1m);

public sealed record ObjectiveAnswerForScoring(
    Guid QuestionId,
    Guid? SelectedOptionId);

public sealed record TopicScoreBreakdown(
    string Topic,
    int TotalQuestions,
    int CorrectAnswers,
    int IncorrectAnswers,
    int UnansweredQuestions,
    decimal ScorePercentage);

public sealed record AttemptScoringResult(
    int TotalQuestions,
    int CorrectAnswers,
    int IncorrectAnswers,
    int UnansweredQuestions,
    decimal ScorePercentage,
    bool Passed,
    IReadOnlyList<TopicScoreBreakdown> TopicBreakdown);
