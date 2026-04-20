using NJsonSchema;

namespace ExamRunner.Infrastructure.Import;

public sealed class OfficialExamSchemaValidator(IHostEnvironment hostEnvironment) : IOfficialExamSchemaValidator
{
    public async Task<IReadOnlyList<ExamImportValidationError>> ValidateAsync(string rawJson, CancellationToken cancellationToken)
    {
        var schema = await LoadOfficialSchemaAsync(cancellationToken);
        return schema.Validate(rawJson)
            .Select(error => new ExamImportValidationError(error.Path, error.ToString()))
            .ToArray();
    }

    private async Task<JsonSchema> LoadOfficialSchemaAsync(CancellationToken cancellationToken)
    {
        var schemaPath = ResolveSchemaPath();
        await using var stream = File.OpenRead(schemaPath);
        return await JsonSchema.FromStreamAsync(stream);
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
