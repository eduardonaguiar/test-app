using ExamRunner.Infrastructure.Data;
using ExamRunner.Infrastructure.Data.Seed;
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

        if (await dbContext.Exams.AnyAsync(cancellationToken))
        {
            return;
        }

        var exams = SeedCatalog.CreateExams();
        dbContext.Exams.AddRange(exams);

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public static async Task SeedExampleExamFromFileAsync(
        this IServiceProvider services,
        string exampleFilePath,
        CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();

        var dbContext = scope.ServiceProvider.GetRequiredService<ExamRunnerDbContext>();
        await EnsureDatabaseSchemaAsync(dbContext, cancellationToken);

        if (await dbContext.Exams.AnyAsync(cancellationToken))
        {
            return;
        }

        var exam = ExampleExamSeedFileParser.Parse(exampleFilePath);
        dbContext.Exams.Add(exam);

        await dbContext.SaveChangesAsync(cancellationToken);
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
