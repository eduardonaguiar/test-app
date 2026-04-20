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
