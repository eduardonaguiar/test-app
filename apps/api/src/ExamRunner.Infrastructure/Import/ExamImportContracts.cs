using ExamRunner.Infrastructure.Data.Entities;

namespace ExamRunner.Infrastructure.Import;

public interface IOfficialExamSchemaValidator
{
    Task<IReadOnlyList<ExamImportValidationError>> ValidateAsync(string rawJson, CancellationToken cancellationToken);
}

public interface IExamImportPayloadParser
{
    ImportExamPayload Parse(string rawJson);
}

public interface IExamImportPayloadConsistencyValidator
{
    IEnumerable<ExamImportValidationError> Validate(ImportExamPayload payload);
}

public interface IExamImportEntityMapper
{
    ExamEntity Map(ImportExamPayload payload);
}

public interface IExamImportPersistence
{
    Task SaveAsync(ExamEntity exam, CancellationToken cancellationToken);
}
