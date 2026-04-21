namespace ExamRunner.Api.Contracts.Attempts;

public sealed record CreateAttemptRequest(Guid ExamId);

public sealed record SaveAttemptAnswerRequest(Guid? SelectedOptionId);

public sealed record AttemptResponse(
    Guid AttemptId,
    Guid ExamId,
    string Status,
    DateTimeOffset StartedAt,
    DateTimeOffset DeadlineAt,
    DateTimeOffset LastSeenAt,
    DateTimeOffset? SubmittedAt);

public sealed record AttemptHistoryResponse(
    IReadOnlyList<AttemptHistoryItemResponse> Items);

public sealed record AttemptHistoryItemResponse(
    Guid AttemptId,
    Guid ExamId,
    string ExamTitle,
    DateTimeOffset AttemptedAt,
    int? Score,
    decimal? Percentage,
    int TimeSpentSeconds,
    string Status);

public sealed record AttemptExecutionStateResponse(
    Guid AttemptId,
    Guid ExamId,
    string Status,
    DateTimeOffset StartedAt,
    DateTimeOffset DeadlineAt,
    DateTimeOffset LastSeenAt,
    DateTimeOffset? SubmittedAt,
    int RemainingSeconds,
    int AnsweredQuestionCount,
    int PendingQuestionCount,
    IReadOnlyList<AttemptExecutionQuestionResponse> Questions);

public sealed record AttemptExecutionQuestionResponse(
    Guid QuestionId,
    Guid SectionId,
    string SectionTitle,
    string QuestionCode,
    string Prompt,
    int DisplayOrder,
    Guid? SelectedOptionId,
    bool IsAnswered,
    IReadOnlyList<AttemptExecutionQuestionOptionResponse> Options);

public sealed record AttemptExecutionQuestionOptionResponse(
    Guid OptionId,
    string OptionCode,
    string Text,
    int DisplayOrder);

public sealed record AttemptResultResponse(
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
    DateTimeOffset SubmittedAt,
    DateTimeOffset EvaluatedAt,
    IReadOnlyList<AttemptResultQuestionReviewResponse> QuestionReviews,
    IReadOnlyList<AttemptResultTopicAnalysisResponse> TopicAnalysis);

public sealed record AttemptResultQuestionReviewResponse(
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

public sealed record AttemptResultTopicAnalysisResponse(
    string Topic,
    int TotalQuestions,
    int CorrectAnswers,
    int IncorrectAnswers,
    int UnansweredQuestions,
    decimal Percentage);
