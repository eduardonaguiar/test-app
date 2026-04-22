namespace ExamRunner.Application.Attempts;

public sealed record CreateAttemptCommand(Guid ExamId);

public sealed record SaveAttemptAnswerCommand(Guid AttemptId, Guid QuestionId, Guid? SelectedOptionId);

public sealed record AttemptSnapshot(
    Guid AttemptId,
    Guid ExamId,
    string Status,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset DeadlineAtUtc,
    DateTimeOffset LastSeenAtUtc,
    DateTimeOffset? SubmittedAtUtc);

public sealed record AttemptHistoryItemSnapshot(
    Guid AttemptId,
    Guid ExamId,
    string ExamTitle,
    DateTimeOffset AttemptedAtUtc,
    int? Score,
    decimal? Percentage,
    int TimeSpentSeconds,
    string Status);

public sealed record AttemptExecutionStateSnapshot(
    Guid AttemptId,
    Guid ExamId,
    string Status,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset DeadlineAtUtc,
    DateTimeOffset LastSeenAtUtc,
    DateTimeOffset? SubmittedAtUtc,
    int RemainingSeconds,
    int AnsweredQuestionCount,
    int PendingQuestionCount,
    IReadOnlyList<AttemptExecutionQuestionSnapshot> Questions);

public sealed record AttemptExecutionQuestionSnapshot(
    Guid QuestionId,
    Guid SectionId,
    string SectionTitle,
    string QuestionCode,
    string Prompt,
    int DisplayOrder,
    Guid? SelectedOptionId,
    bool IsAnswered,
    IReadOnlyList<AttemptExecutionQuestionOptionSnapshot> Options);

public sealed record AttemptExecutionQuestionOptionSnapshot(
    Guid OptionId,
    string OptionCode,
    string Text,
    int DisplayOrder);

public sealed record AttemptResultSnapshot(
    Guid AttemptId,
    Guid ExamId,
    int Score,
    decimal Percentage,
    bool Passed,
    string Outcome,
    int TotalQuestions,
    int CorrectAnswers,
    int IncorrectAnswers,
    int UnansweredQuestions,
    DateTimeOffset SubmittedAtUtc,
    DateTimeOffset EvaluatedAtUtc,
    IReadOnlyList<AttemptResultQuestionReviewSnapshot> QuestionReviews,
    IReadOnlyList<TopicScoreBreakdown> TopicAnalysis);

public sealed record AttemptResultQuestionReviewSnapshot(
    Guid QuestionId,
    Guid SectionId,
    string SectionTitle,
    string QuestionCode,
    string Prompt,
    string Topic,
    string Difficulty,
    Guid? UserSelectedOptionId,
    string? UserSelectedOptionCode,
    string? UserSelectedOptionText,
    Guid CorrectOptionId,
    string CorrectOptionCode,
    string CorrectOptionText,
    bool IsCorrect,
    string ExplanationSummary,
    string ExplanationDetails);

public sealed record PerformanceDashboardSnapshot(
    PerformanceDashboardSummarySnapshot Summary,
    IReadOnlyList<AttemptTrendPointSnapshot> AttemptTrend,
    IReadOnlyList<TopicPerformanceSnapshot> TopicPerformance);

public sealed record PerformanceDashboardSummarySnapshot(
    int TotalAttempts,
    int TotalQuestions,
    int TotalCorrect,
    int TotalIncorrect,
    decimal GlobalAccuracyRate,
    decimal AverageAttemptPercentage,
    decimal? LastAttemptPercentage,
    decimal? BestAttemptPercentage);

public sealed record AttemptTrendPointSnapshot(
    Guid AttemptId,
    string Label,
    DateTimeOffset ExecutedAtUtc,
    decimal Percentage);

public sealed record TopicPerformanceSnapshot(
    string Topic,
    int TotalQuestions,
    int TotalCorrect,
    int TotalIncorrect,
    decimal AccuracyRate);
