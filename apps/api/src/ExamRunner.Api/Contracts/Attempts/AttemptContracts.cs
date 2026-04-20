namespace ExamRunner.Api.Contracts.Attempts;

public sealed record CreateAttemptRequest(Guid ExamId);

public sealed record AttemptResponse(
    Guid AttemptId,
    Guid ExamId,
    string Status,
    DateTimeOffset StartedAt,
    DateTimeOffset DeadlineAt,
    DateTimeOffset LastSeenAt,
    DateTimeOffset? SubmittedAt);

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
