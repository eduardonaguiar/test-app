namespace ExamRunner.Infrastructure.Attempts;

public sealed record CreateAttemptCommand(Guid ExamId);

public sealed record AttemptSnapshot(
    Guid AttemptId,
    Guid ExamId,
    string Status,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset DeadlineAtUtc,
    DateTimeOffset LastSeenAtUtc,
    DateTimeOffset? SubmittedAtUtc);
