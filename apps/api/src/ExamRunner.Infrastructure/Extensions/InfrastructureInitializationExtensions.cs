using ExamRunner.Infrastructure.Data;
using ExamRunner.Infrastructure.Data.Seed;
using ExamRunner.Infrastructure.Import;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ExamRunner.Infrastructure.Extensions;

public static class InfrastructureInitializationExtensions
{
    public static async Task InitializeInfrastructureAsync(this IServiceProvider services, CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();

        var dbContext = scope.ServiceProvider.GetRequiredService<ExamRunnerDbContext>();
        await EnsureDatabaseSchemaAsync(dbContext, cancellationToken);
    }

    public static async Task SeedExampleExamFromFileAsync(
        this IServiceProvider services,
        string exampleFilePath,
        CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();

        var dbContext = scope.ServiceProvider.GetRequiredService<ExamRunnerDbContext>();
        var schemaValidator = scope.ServiceProvider.GetRequiredService<IOfficialExamSchemaValidator>();
        await EnsureDatabaseSchemaAsync(dbContext, cancellationToken);

        if (!File.Exists(exampleFilePath))
        {
            throw new FileNotFoundException($"Seed file not found at '{exampleFilePath}'.", exampleFilePath);
        }

        var validationErrors = await schemaValidator.ValidateAsync(await File.ReadAllTextAsync(exampleFilePath, cancellationToken), cancellationToken);
        if (validationErrors.Count > 0)
        {
            throw new InvalidOperationException($"Seed file '{exampleFilePath}' is invalid according to official schema: {string.Join("; ", validationErrors)}");
        }

        var exam = ExampleExamSeedFileParser.Parse(exampleFilePath);

        if (await dbContext.Exams.AnyAsync(item => item.Id == exam.Id, cancellationToken))
        {
            return;
        }

        dbContext.Exams.Add(exam);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public static async Task<DemoSeedSummary> SeedDemoExamsFromDirectoryAsync(
        this IServiceProvider services,
        string directoryPath,
        CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();

        var dbContext = scope.ServiceProvider.GetRequiredService<ExamRunnerDbContext>();
        var schemaValidator = scope.ServiceProvider.GetRequiredService<IOfficialExamSchemaValidator>();
        await EnsureDatabaseSchemaAsync(dbContext, cancellationToken);

        if (!Directory.Exists(directoryPath))
        {
            throw new DirectoryNotFoundException($"Demo seed directory was not found at '{directoryPath}'.");
        }

        var foundFiles = Directory
            .GetFiles(directoryPath, "*.json", SearchOption.TopDirectoryOnly)
            .OrderBy(path => path, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var summary = new DemoSeedSummary(foundFiles.Length);

        foreach (var filePath in foundFiles)
        {
            var rawJson = await File.ReadAllTextAsync(filePath, cancellationToken);
            var validationErrors = await schemaValidator.ValidateAsync(rawJson, cancellationToken);

            if (validationErrors.Count > 0)
            {
                summary.InvalidFiles++;
                summary.Failures.Add($"{Path.GetFileName(filePath)}: {string.Join("; ", validationErrors)}");
                continue;
            }

            summary.ValidFiles++;

            try
            {
                var exam = ExampleExamSeedFileParser.Parse(filePath);

                if (await dbContext.Exams.AnyAsync(item => item.Id == exam.Id, cancellationToken))
                {
                    summary.Skipped++;
                    continue;
                }

                dbContext.Exams.Add(exam);
                await dbContext.SaveChangesAsync(cancellationToken);
                summary.Imported++;
            }
            catch (Exception exception)
            {
                summary.Failures.Add($"{Path.GetFileName(filePath)}: {exception.Message}");
            }
        }

        return summary;
    }

    private static async Task EnsureDatabaseSchemaAsync(ExamRunnerDbContext dbContext, CancellationToken cancellationToken)
    {
        await dbContext.Database.MigrateAsync(cancellationToken);

        if (await DoesTableExistAsync(dbContext, "Exams", cancellationToken))
        {
            return;
        }

        await dbContext.Database.EnsureDeletedAsync(cancellationToken);
        await dbContext.Database.MigrateAsync(cancellationToken);
    }

    private static async Task<bool> DoesTableExistAsync(ExamRunnerDbContext dbContext, string tableName, CancellationToken cancellationToken)
    {
        var connection = dbContext.Database.GetDbConnection();
        var openedHere = connection.State != System.Data.ConnectionState.Open;

        if (openedHere)
        {
            await connection.OpenAsync(cancellationToken);
        }

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = $tableName";

            var parameter = command.CreateParameter();
            parameter.ParameterName = "$tableName";
            parameter.Value = tableName;
            command.Parameters.Add(parameter);

            var result = await command.ExecuteScalarAsync(cancellationToken);
            var tableCount = result is long count ? count : Convert.ToInt64(result);

            return tableCount > 0;
        }
        finally
        {
            if (openedHere)
            {
                await connection.CloseAsync();
            }
        }
    }
}

public sealed class DemoSeedSummary(int foundFiles)
{
    public int FoundFiles { get; } = foundFiles;
    public int ValidFiles { get; set; }
    public int InvalidFiles { get; set; }
    public int Imported { get; set; }
    public int Skipped { get; set; }
    public List<string> Failures { get; } = [];
}
