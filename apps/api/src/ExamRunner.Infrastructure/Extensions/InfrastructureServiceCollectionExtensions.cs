using ExamRunner.Application.Attempts;
using ExamRunner.Infrastructure.Attempts;
using ExamRunner.Infrastructure.Authoring;
using ExamRunner.Infrastructure.Data;
using ExamRunner.Infrastructure.Import;
using ExamRunner.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace ExamRunner.Infrastructure.Extensions;

public static class InfrastructureServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        var connectionString = BuildConnectionString(configuration, environment);

        services.AddDbContext<ExamRunnerDbContext>(options =>
            options.UseSqlite(connectionString, sqlite =>
                sqlite.MigrationsAssembly(typeof(ExamRunnerDbContext).Assembly.FullName)));

        services.AddSingleton(TimeProvider.System);

        services.AddScoped<IExamReadRepository, ExamReadRepository>();
        services.AddScoped<IExamPublicationService, ExamPublicationService>();
        services.AddScoped<IAttemptScoringService, ObjectiveAttemptScoringService>();
        services.AddScoped<IAttemptService, AttemptService>();

        services.AddScoped<IOfficialExamSchemaValidator, OfficialExamSchemaValidator>();
        services.AddScoped<IExamImportPayloadParser, ExamImportPayloadParser>();
        services.AddScoped<IExamImportPayloadConsistencyValidator, ExamImportPayloadConsistencyValidator>();
        services.AddScoped<IExamImportEntityMapper, ExamImportEntityMapper>();
        services.AddScoped<IExamImportPersistence, ExamImportPersistence>();
        services.AddScoped<IExamImportService, ExamImportService>();

        return services;
    }

    private static string BuildConnectionString(IConfiguration configuration, IHostEnvironment environment)
    {
        var configured = configuration.GetConnectionString("ExamRunnerDb");

        if (!string.IsNullOrWhiteSpace(configured))
        {
            EnsureSqliteDirectoryExists(configured, environment.ContentRootPath);
            return configured;
        }

        var dbDirectory = Path.Combine(environment.ContentRootPath, "App_Data");
        Directory.CreateDirectory(dbDirectory);

        var dbPath = Path.Combine(dbDirectory, "exam-runner.db");

        return $"Data Source={dbPath}";
    }

    private static void EnsureSqliteDirectoryExists(string connectionString, string contentRootPath)
    {
        const string key = "Data Source=";

        if (!connectionString.StartsWith(key, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var dataSource = connectionString[key.Length..].Trim();
        if (string.IsNullOrWhiteSpace(dataSource) || dataSource == ":memory:")
        {
            return;
        }

        var dbPath = Path.IsPathRooted(dataSource)
            ? dataSource
            : Path.GetFullPath(Path.Combine(contentRootPath, dataSource));

        var directory = Path.GetDirectoryName(dbPath);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }
    }
}
