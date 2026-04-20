namespace ExamRunner.Infrastructure.Attempts;

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
