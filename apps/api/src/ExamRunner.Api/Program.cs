using ExamRunner.Api.Endpoints.Attempts;
using ExamRunner.Api.Endpoints.Exams;
using ExamRunner.Api.Endpoints.Health;
using ExamRunner.Infrastructure.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
    {
        context.ProblemDetails.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
        context.ProblemDetails.Extensions["timestamp"] = DateTimeOffset.UtcNow;
    };
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddInfrastructure(builder.Configuration, builder.Environment);

var app = builder.Build();

if (TryResolveDemoSeedCommand(args, out var demoSeedDirectory))
{
    var summary = await app.Services.SeedDemoExamsFromDirectoryAsync(demoSeedDirectory);

    Console.WriteLine($"{summary.FoundFiles} simulados encontrados");
    Console.WriteLine($"{summary.ValidFiles} válidos");
    Console.WriteLine($"{summary.Imported} importados");
    Console.WriteLine($"{summary.Skipped} ignorados (já existentes)");
    Console.WriteLine($"{summary.Failures.Count} falhas");

    foreach (var failure in summary.Failures)
    {
        Console.WriteLine($" - {failure}");
    }

    return;
}

if (TryResolveSeedCommand(args, out var seedFilePath))
{
    await app.Services.SeedExampleExamFromFileAsync(seedFilePath);
    Console.WriteLine($"Seed completed using file '{seedFilePath}'.");
    return;
}

app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

await app.Services.InitializeInfrastructureAsync();

var api = app.MapGroup("/api")
    .WithTags("API")
    .WithOpenApi();

api.MapHealthEndpoints();
api.MapExamEndpoints();
api.MapAttemptEndpoints();

app.Run();

static bool TryResolveSeedCommand(string[] args, out string seedFilePath)
{
    const string seedArgument = "--seed-example";
    seedFilePath = string.Empty;

    var seedArgumentIndex = Array.FindIndex(args, arg => string.Equals(arg, seedArgument, StringComparison.OrdinalIgnoreCase));
    if (seedArgumentIndex < 0)
    {
        return false;
    }

    if (seedArgumentIndex + 1 >= args.Length)
    {
        throw new InvalidOperationException($"Missing example exam path. Usage: dotnet run --project apps/api/src/ExamRunner.Api -- {seedArgument} <path-to-json>");
    }

    seedFilePath = Path.GetFullPath(args[seedArgumentIndex + 1]);
    return true;
}

static bool TryResolveDemoSeedCommand(string[] args, out string directoryPath)
{
    const string seedArgument = "--seed-demo";
    directoryPath = string.Empty;

    var seedArgumentIndex = Array.FindIndex(args, arg => string.Equals(arg, seedArgument, StringComparison.OrdinalIgnoreCase));
    if (seedArgumentIndex < 0)
    {
        return false;
    }

    if (seedArgumentIndex + 1 >= args.Length)
    {
        throw new InvalidOperationException($"Missing demo seed directory path. Usage: dotnet run --project apps/api/src/ExamRunner.Api -- {seedArgument} <path-to-directory>");
    }

    directoryPath = Path.GetFullPath(args[seedArgumentIndex + 1]);
    return true;
}

public partial class Program;
