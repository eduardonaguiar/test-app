namespace ExamRunner.Infrastructure.Authoring;

public sealed record EditorialValidationIssue(
    string Code,
    string Severity,
    string Scope,
    string Message,
    string? Path = null,
    string? EntityId = null);

public sealed record EditorialValidationSummary(
    int BlockingErrorCount,
    int WarningCount,
    int SectionCount,
    int QuestionCount,
    int ValidQuestionCount);

public sealed record EditorialValidationResult(
    bool IsPublishable,
    IReadOnlyList<EditorialValidationIssue> BlockingErrors,
    IReadOnlyList<EditorialValidationIssue> Warnings,
    EditorialValidationSummary Summary);

public sealed record PublishExamResult(
    Guid ExamId,
    string Status,
    DateTimeOffset PublishedAtUtc,
    EditorialValidationResult Validation);

public sealed record PublishExamFailure(
    string Code,
    string Message,
    EditorialValidationResult Validation);
