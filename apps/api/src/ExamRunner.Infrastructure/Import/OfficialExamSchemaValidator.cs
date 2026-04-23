using Microsoft.Extensions.Hosting;
using NJsonSchema;
using System.Text.Json;

namespace ExamRunner.Infrastructure.Import;

public sealed class OfficialExamSchemaValidator(IHostEnvironment hostEnvironment) : IOfficialExamSchemaValidator
{
    public async Task<IReadOnlyList<ExamImportValidationError>> ValidateAsync(string rawJson, CancellationToken cancellationToken)
    {
        if (IsSchemaVersionMissing(rawJson))
        {
            return [new ExamImportValidationError("$.schemaVersion", "Required property 'schemaVersion' was not found.")];
        }

        var requiredFieldErrors = ValidateRequiredFields(rawJson);
        if (requiredFieldErrors.Count > 0)
        {
            return requiredFieldErrors;
        }

        var schema = await LoadOfficialSchemaAsync(cancellationToken);
        return schema.Validate(rawJson)
            .Select(error => new ExamImportValidationError(error.Path ?? string.Empty, error.ToString()))
            .ToArray();
    }

    private static bool IsSchemaVersionMissing(string rawJson)
    {
        using var document = JsonDocument.Parse(rawJson);
        return document.RootElement.ValueKind != JsonValueKind.Object ||
               !document.RootElement.TryGetProperty("schemaVersion", out var schemaVersionElement) ||
               schemaVersionElement.ValueKind == JsonValueKind.Null;
    }

    private static IReadOnlyList<ExamImportValidationError> ValidateRequiredFields(string rawJson)
    {
        using var document = JsonDocument.Parse(rawJson);
        var errors = new List<ExamImportValidationError>();

        if (!document.RootElement.TryGetProperty("metadata", out var metadataElement) ||
            metadataElement.ValueKind != JsonValueKind.Object)
        {
            errors.Add(new ExamImportValidationError("$.metadata", "Required property 'metadata' was not found."));
            return errors;
        }

        if (!metadataElement.TryGetProperty("examId", out var examIdElement) ||
            examIdElement.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
        {
            errors.Add(new ExamImportValidationError("$.metadata.examId", "Required property 'examId' was not found."));
        }

        if (!metadataElement.TryGetProperty("title", out var titleElement) ||
            titleElement.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
        {
            errors.Add(new ExamImportValidationError("$.metadata.title", "Required property 'title' was not found."));
        }

        return errors;
    }

    private async Task<JsonSchema> LoadOfficialSchemaAsync(CancellationToken cancellationToken)
    {
        var schemaPath = ResolveSchemaPath();
        await using var stream = File.OpenRead(schemaPath);
        using var reader = new StreamReader(stream);
        var schemaJson = await reader.ReadToEndAsync(cancellationToken);
        return await JsonSchema.FromJsonAsync(schemaJson);
    }

    private string ResolveSchemaPath()
    {
        var current = new DirectoryInfo(hostEnvironment.ContentRootPath);

        while (current is not null)
        {
            var candidate = Path.Combine(current.FullName, "packages", "exam-schema", "src", "exam.schema.json");
            if (File.Exists(candidate))
            {
                return candidate;
            }

            current = current.Parent;
        }

        throw new FileNotFoundException("Official exam schema file was not found.");
    }
}
