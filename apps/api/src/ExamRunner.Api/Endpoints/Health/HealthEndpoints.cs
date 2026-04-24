using System.Reflection;

namespace ExamRunner.Api.Endpoints.Health;

public static class HealthEndpoints
{
    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder app, string endpointName = "GetHealth")
    {
        app.MapGet("/health", () =>
            TypedResults.Ok(new HealthResponse(
                Status: "ok",
                Timestamp: DateTimeOffset.UtcNow,
                Version: ResolveVersion())))
            .WithName(endpointName)
            .WithTags("Health")
            .WithSummary("Returns API health details")
            .Produces<HealthResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status500InternalServerError);

        return app;
    }

    private static string ResolveVersion()
    {
        var assembly = Assembly.GetEntryAssembly();

        if (assembly is null)
        {
            return "unknown";
        }

        var informationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion;
        if (!string.IsNullOrWhiteSpace(informationalVersion))
        {
            return informationalVersion;
        }

        return assembly.GetName().Version?.ToString() ?? "unknown";
    }
}
