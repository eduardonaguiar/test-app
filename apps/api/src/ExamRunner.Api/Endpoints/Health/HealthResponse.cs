namespace ExamRunner.Api.Endpoints.Health;

public sealed record HealthResponse(string Status, DateTimeOffset Timestamp, string Version);
