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

public partial class Program;
