using ExamRunner.Infrastructure.Data.Entities;

namespace ExamRunner.Infrastructure.Import;

public sealed class ExamImportService(
    IOfficialExamSchemaValidator schemaValidator,
    IExamImportPayloadParser payloadParser,
    IExamImportPayloadConsistencyValidator consistencyValidator,
    IExamImportEntityMapper mapper,
    IExamImportPersistence persistence) : IExamImportService
{
    public async Task<ExamImportResult> ImportAsync(string rawJson, CancellationToken cancellationToken)
    {
        var schemaErrors = await schemaValidator.ValidateAsync(rawJson, cancellationToken);
        if (schemaErrors.Count > 0)
        {
            throw new ExamImportException(
                "Exam JSON payload is invalid according to the official schema.",
                schemaErrors,
                "validation_failed");
        }

        var payload = payloadParser.Parse(rawJson);

        var consistencyErrors = consistencyValidator.Validate(payload).ToArray();
        if (consistencyErrors.Length > 0)
        {
            throw new ExamImportException(
                "Exam JSON payload is structurally valid but contains inconsistent references.",
                consistencyErrors,
                "import_inconsistent_payload");
        }

        var exam = mapper.Map(payload);
        await persistence.SaveAsync(exam, cancellationToken);

        var questionCount = exam.Sections.Sum(section => section.QuestionCount);
        return new ExamImportResult(exam.Id, exam.Title, exam.Sections.Count, questionCount);
    }
}
