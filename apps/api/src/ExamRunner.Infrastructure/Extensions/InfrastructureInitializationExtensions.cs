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
        await dbContext.Database.MigrateAsync(cancellationToken);

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
        await dbContext.Database.MigrateAsync(cancellationToken);

        if (await dbContext.Exams.AnyAsync(cancellationToken))
        {
            return;
        }

        var exam = ExampleExamSeedFileParser.Parse(exampleFilePath);
        dbContext.Exams.Add(exam);

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
