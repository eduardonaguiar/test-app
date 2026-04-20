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

public sealed record ExamSectionResponse(
    string SectionId,
    string Title,
    int QuestionCount);

public sealed record ExamDetailResponse(
    Guid ExamId,
    string Title,
    string Description,
    int DurationMinutes,
    int PassingScorePercentage,
    string SchemaVersion,
    IReadOnlyList<ExamSectionResponse> Sections);

public sealed record ImportExamResponse(Guid ExamId, string Title, int SectionCount, int QuestionCount);
