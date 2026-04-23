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
