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

app.Run();

public partial class Program;
