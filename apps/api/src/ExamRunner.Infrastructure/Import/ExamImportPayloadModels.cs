namespace ExamRunner.Infrastructure.Import;

public sealed record ImportExamPayload(
    string SchemaVersion,
    ImportExamMetadataPayload Metadata,
    int DurationMinutes,
    decimal PassingScore,
    ImportReconnectPolicyPayload ReconnectPolicy,
    List<ImportSectionPayload> Sections);

public sealed record ImportExamMetadataPayload(
    string ExamId,
    string Title,
    string? Description);

public sealed record ImportReconnectPolicyPayload(bool Enabled, int MaxReconnects, int GracePeriodSeconds);

public sealed record ImportSectionPayload(string SectionId, string Title, List<ImportQuestionPayload> Questions);

public sealed record ImportQuestionPayload(
    string QuestionId,
    string Prompt,
    List<ImportOptionPayload> Options,
    string CorrectOptionId,
    string ExplanationSummary,
    string ExplanationDetailed,
    string Topic,
    string Difficulty,
    decimal Weight);

public sealed record ImportOptionPayload(string OptionId, string Text);
