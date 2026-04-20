namespace ExamRunner.Infrastructure.Import;

public sealed record ExamImportResult(
    Guid ExamId,
    string Title,
    int SectionCount,
    int QuestionCount);

public sealed record ExamImportValidationError(string Path, string Message);

public sealed class ExamImportException(
    string message,
    IReadOnlyList<ExamImportValidationError> errors,
    string errorCode) : Exception(message)
{
    public IReadOnlyList<ExamImportValidationError> Errors { get; } = errors;
    public string ErrorCode { get; } = errorCode;
}

public interface IExamImportService
{
    Task<ExamImportResult> ImportAsync(string rawJson, CancellationToken cancellationToken);
}
