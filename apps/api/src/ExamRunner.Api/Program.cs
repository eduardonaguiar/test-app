using System.Globalization;
using ExamRunner.Api.Endpoints.Attempts;
using ExamRunner.Api.Endpoints.Exams;
using ExamRunner.Api.Endpoints.Health;
using ExamRunner.Api.Handlers;
using ExamRunner.Api.Validation;
using ExamRunner.Api.Validation.Requests;
using ExamRunner.Application.Attempts;
using ExamRunner.Infrastructure.Extensions;
using FluentValidation;

const string LocalCorsPolicyName = "LocalClientPolicy";

var builder = WebApplication.CreateBuilder(args);
ConfigureDesktopPort(builder, args);
ConfigureCors(builder);

builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
    {
        context.ProblemDetails.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
        context.ProblemDetails.Extensions["timestamp"] = DateTimeOffset.UtcNow;
    };
});
builder.Services.AddExceptionHandler<ValidationExceptionHandler>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddValidatorsFromAssemblyContaining<CreateAttemptRequestValidator>();
builder.Services.AddValidatorsFromAssemblyContaining<CreateAttemptCommandValidator>();
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
app.UseCors(LocalCorsPolicyName);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

await app.Services.InitializeInfrastructureAsync();

var api = app.MapGroup("/api")
    .WithTags("API")
    .WithOpenApi();

api.AddEndpointFilterFactory(ValidationEndpointFilterFactory.Create);
api.MapHealthEndpoints("GetApiHealth");
api.MapExamEndpoints();
api.MapAttemptEndpoints();

app.MapHealthEndpoints();

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

static void ConfigureDesktopPort(WebApplicationBuilder builder, string[] args)
{
    const string urlsEnvironmentVariable = "ASPNETCORE_URLS";

    if (!string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(urlsEnvironmentVariable)))
    {
        return;
    }

    if (!TryResolveConfiguredPort(args, out var port))
    {
        return;
    }

    builder.WebHost.UseUrls($"http://localhost:{port}");
}

static bool TryResolveConfiguredPort(string[] args, out int port)
{
    const string desktopPortEnvironmentVariable = "EXAM_RUNNER_API_PORT";
    port = 0;

    if (TryResolvePort(Environment.GetEnvironmentVariable(desktopPortEnvironmentVariable), out port))
    {
        return true;
    }

    const string portArgument = "--port";
    var portArgumentIndex = Array.FindIndex(args, arg => string.Equals(arg, portArgument, StringComparison.OrdinalIgnoreCase));

    if (portArgumentIndex < 0)
    {
        return false;
    }

    if (portArgumentIndex + 1 >= args.Length)
    {
        throw new InvalidOperationException($"Missing port value. Usage: dotnet run --project apps/api/src/ExamRunner.Api -- {portArgument} <port>");
    }

    if (!TryResolvePort(args[portArgumentIndex + 1], out port))
    {
        throw new InvalidOperationException("Invalid port value. Provide a number between 1 and 65535.");
    }

    return true;
}

static bool TryResolvePort(string? value, out int port)
{
    const int minPort = 1;
    const int maxPort = 65_535;
    port = 0;

    if (string.IsNullOrWhiteSpace(value))
    {
        return false;
    }

    if (!int.TryParse(value, NumberStyles.None, CultureInfo.InvariantCulture, out var parsed))
    {
        return false;
    }

    if (parsed < minPort || parsed > maxPort)
    {
        return false;
    }

    port = parsed;
    return true;
}

static void ConfigureCors(WebApplicationBuilder builder)
{
    var configuredWebOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
    var webOrigins = configuredWebOrigins
        .Where(origin => !string.IsNullOrWhiteSpace(origin))
        .Select(origin => origin.Trim())
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();

    var desktopOrigins = GetDesktopOrigins(builder.Configuration);
    var isDesktopModeEnabled = builder.Configuration.GetValue<bool>("Desktop:Enabled");
    var allowNullOriginInDesktop = builder.Configuration.GetValue<bool>("Desktop:Cors:AllowNullOrigin");

    builder.Services.AddCors(options =>
    {
        options.AddPolicy(LocalCorsPolicyName, policy =>
        {
            policy
                .AllowAnyHeader()
                .AllowAnyMethod()
                .SetIsOriginAllowed(origin => IsAllowedLocalOrigin(origin, webOrigins, desktopOrigins, isDesktopModeEnabled, allowNullOriginInDesktop));
        });
    });
}

static string[] GetDesktopOrigins(IConfiguration configuration)
{
    var configuredDesktopOrigins = configuration.GetSection("Desktop:Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();

    return configuredDesktopOrigins
        .Where(origin => !string.IsNullOrWhiteSpace(origin))
        .Select(origin => origin.Trim())
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();
}

static bool IsAllowedLocalOrigin(
    string origin,
    IReadOnlyCollection<string> webOrigins,
    IReadOnlyCollection<string> desktopOrigins,
    bool isDesktopModeEnabled,
    bool allowNullOriginInDesktop)
{
    if (webOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
    {
        return true;
    }

    if (!isDesktopModeEnabled)
    {
        return false;
    }

    if (desktopOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
    {
        return true;
    }

    return allowNullOriginInDesktop && string.Equals(origin, "null", StringComparison.Ordinal);
}

public partial class Program;
