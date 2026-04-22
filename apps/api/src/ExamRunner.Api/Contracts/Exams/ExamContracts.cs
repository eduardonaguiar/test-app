namespace ExamRunner.Api.Contracts.Exams;

public sealed record ExamSummaryResponse(
    Guid ExamId,
    string Title,
    string Description,
    int DurationMinutes,
    int PassingScorePercentage,
    string SchemaVersion,
    bool ReconnectEnabled,
    int SectionCount,
    int QuestionCount);

public sealed record ListExamsResponse(IReadOnlyList<ExamSummaryResponse> Items);

public sealed record AuthoringTestSummaryResponse(
    Guid ExamId,
    string Title,
    string Description,
    string Status,
    int QuestionCount,
    int SectionCount,
    DateTimeOffset? UpdatedAt);

public sealed record ListAuthoringTestsResponse(IReadOnlyList<AuthoringTestSummaryResponse> Items);

public sealed record ExamQuestionOptionPreviewResponse(
    string OptionId,
    string Text,
    int DisplayOrder);

public sealed record ExamQuestionPreviewResponse(
    string QuestionId,
    string Prompt,
    string Topic,
    string Difficulty,
    decimal Weight,
    IReadOnlyList<ExamQuestionOptionPreviewResponse> Options);

public sealed record ExamSectionDetailResponse(
    string SectionId,
    string Title,
    int DisplayOrder,
    int QuestionCount,
    IReadOnlyList<ExamQuestionPreviewResponse> Questions);

public sealed record ReconnectPolicyResponse(
    bool Enabled,
    int MaxReconnectAttempts,
    int GracePeriodSeconds,
    bool TerminateIfExceeded);

public sealed record ExamDetailResponse(
    Guid ExamId,
    string Title,
    string Description,
    string Status,
    int DurationMinutes,
    int PassingScorePercentage,
    string SchemaVersion,
    int SectionCount,
    int QuestionCount,
    ReconnectPolicyResponse ReconnectPolicy,
    IReadOnlyList<ExamSectionDetailResponse> Sections);

public sealed record ImportExamResponse(Guid ExamId, string Title, int SectionCount, int QuestionCount);

public sealed record EditorialValidationIssueResponse(
    string Code,
    string Severity,
    string Scope,
    string Message,
    string? Path,
    string? EntityId);

public sealed record EditorialValidationSummaryResponse(
    int BlockingErrorCount,
    int WarningCount,
    int SectionCount,
    int QuestionCount,
    int ValidQuestionCount);

public sealed record EditorialValidationResultResponse(
    bool IsPublishable,
    IReadOnlyList<EditorialValidationIssueResponse> BlockingErrors,
    IReadOnlyList<EditorialValidationIssueResponse> Warnings,
    EditorialValidationSummaryResponse Summary);

public sealed record PublishExamResponse(
    Guid ExamId,
    string Status,
    DateTimeOffset PublishedAt,
    EditorialValidationResultResponse Validation);
