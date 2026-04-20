using Microsoft.AspNetCore.Mvc;
using ExamRunner.Api.Endpoints.Exams;
using ExamRunner.Api.Endpoints.Health;

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

var app = builder.Build();

app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

var api = app.MapGroup("/api")
    .WithTags("API")
    .WithOpenApi();

api.MapHealthEndpoints();
api.MapExamEndpoints();

app.Run();

public partial class Program;
