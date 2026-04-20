using System.Text.Json;

namespace ExamRunner.Infrastructure.Import;

public sealed class ExamImportPayloadParser : IExamImportPayloadParser
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public ImportExamPayload Parse(string rawJson)
    {
        return JsonSerializer.Deserialize<ImportExamPayload>(rawJson, JsonOptions)
            ?? throw new ExamImportException(
                "Exam JSON payload is empty or malformed.",
                [new ExamImportValidationError("$", "Payload could not be deserialized.")],
                "validation_failed");
    }
}
