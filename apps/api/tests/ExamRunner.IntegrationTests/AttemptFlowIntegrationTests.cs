using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;

namespace ExamRunner.IntegrationTests;

public sealed class AttemptFlowIntegrationTests : IClassFixture<ExamRunnerApiFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly HttpClient _client;

    public AttemptFlowIntegrationTests(ExamRunnerApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task ImportToResultFlow_ShouldSupportCriticalAttemptLifecycle()
    {
        var importResponse = await _client.PostAsync(
            "/api/exams/import",
            new StringContent(ValidExamPayload, Encoding.UTF8, "application/json"));

        importResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var importedExam = await importResponse.Content.ReadFromJsonAsync<ImportExamResponse>(JsonOptions);
        importedExam.Should().NotBeNull();

        var createAttemptResponse = await _client.PostAsJsonAsync(
            "/api/attempts",
            new { examId = importedExam!.ExamId });

        createAttemptResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdAttempt = await createAttemptResponse.Content.ReadFromJsonAsync<AttemptResponse>(JsonOptions);
        createdAttempt.Should().NotBeNull();

        var attemptStateResponse = await _client.GetAsync($"/api/attempts/{createdAttempt!.AttemptId}");
        attemptStateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var attemptState = await attemptStateResponse.Content.ReadFromJsonAsync<AttemptExecutionStateResponse>(JsonOptions);
        attemptState.Should().NotBeNull();
        attemptState!.Questions.Should().HaveCount(2);

        var targetQuestion = attemptState.Questions[0];
        var selectedOptionId = targetQuestion.Options[1].OptionId;

        var saveAnswerResponse = await _client.PutAsJsonAsync(
            $"/api/attempts/{createdAttempt.AttemptId}/answers/{targetQuestion.QuestionId}",
            new { selectedOptionId });

        saveAnswerResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var saveAnswerState = await saveAnswerResponse.Content.ReadFromJsonAsync<AttemptExecutionStateResponse>(JsonOptions);
        saveAnswerState.Should().NotBeNull();
        saveAnswerState!.AnsweredQuestionCount.Should().Be(1);

        var reconnectResponse = await _client.PostAsync($"/api/attempts/{createdAttempt.AttemptId}/reconnect", content: null);
        reconnectResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var reconnectState = await reconnectResponse.Content.ReadFromJsonAsync<AttemptExecutionStateResponse>(JsonOptions);
        reconnectState.Should().NotBeNull();
        reconnectState!.AnsweredQuestionCount.Should().Be(1);

        var submitResponse = await _client.PostAsync($"/api/attempts/{createdAttempt.AttemptId}/submit", content: null);
        submitResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var submittedAttempt = await submitResponse.Content.ReadFromJsonAsync<AttemptResponse>(JsonOptions);
        submittedAttempt.Should().NotBeNull();
        submittedAttempt!.Status.Should().Be("Submitted");

        var resultResponse = await _client.GetAsync($"/api/attempts/{createdAttempt.AttemptId}/result");
        resultResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await resultResponse.Content.ReadFromJsonAsync<AttemptResultResponse>(JsonOptions);
        result.Should().NotBeNull();
        result!.AttemptId.Should().Be(createdAttempt.AttemptId);
        result.TotalQuestions.Should().Be(2);
        result.QuestionReviews.Should().HaveCount(2);

        var historyResponse = await _client.GetAsync("/api/history");
        historyResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var history = await historyResponse.Content.ReadFromJsonAsync<AttemptHistoryResponse>(JsonOptions);
        history.Should().NotBeNull();
        history!.Items.Should().ContainSingle(item => item.AttemptId == createdAttempt.AttemptId);
    }

    private const string ValidExamPayload =
        """
        {
          "schemaVersion": "1.0.0",
          "metadata": {
            "examId": "integration-flow-exam-v1",
            "title": "Integration Flow Exam",
            "description": "Exam used by integration tests."
          },
          "durationMinutes": 30,
          "passingScore": 70,
          "reconnectPolicy": {
            "enabled": true,
            "maxReconnects": 2,
            "gracePeriodSeconds": 120,
            "terminateIfExceeded": true
          },
          "sections": [
            {
              "sectionId": "network-basics",
              "title": "Network Basics",
              "questions": [
                {
                  "questionId": "q1",
                  "prompt": "Which OSI layer handles routing?",
                  "options": [
                    { "optionId": "a", "text": "Data Link" },
                    { "optionId": "b", "text": "Network" },
                    { "optionId": "c", "text": "Application" }
                  ],
                  "correctOptionId": "b",
                  "explanationSummary": "Routing is a layer 3 concern.",
                  "explanationDetailed": "The network layer is responsible for path selection and packet forwarding.",
                  "topic": "OSI",
                  "difficulty": "easy",
                  "weight": 1
                },
                {
                  "questionId": "q2",
                  "prompt": "Which protocol resolves domain names?",
                  "options": [
                    { "optionId": "a", "text": "DNS" },
                    { "optionId": "b", "text": "NTP" },
                    { "optionId": "c", "text": "SMTP" }
                  ],
                  "correctOptionId": "a",
                  "explanationSummary": "DNS maps hostnames to IP addresses.",
                  "explanationDetailed": "DNS clients query DNS servers to resolve a domain name into one or more IP addresses.",
                  "topic": "Protocols",
                  "difficulty": "easy",
                  "weight": 1
                }
              ]
            }
          ]
        }
        """;

    private sealed record ImportExamResponse(Guid ExamId, string Title, int SectionCount, int QuestionCount);

    private sealed record AttemptResponse(Guid AttemptId, Guid ExamId, string Status);

    private sealed record AttemptExecutionStateResponse(
        Guid AttemptId,
        Guid ExamId,
        string Status,
        int AnsweredQuestionCount,
        int PendingQuestionCount,
        IReadOnlyList<AttemptExecutionQuestionResponse> Questions);

    private sealed record AttemptExecutionQuestionResponse(
        Guid QuestionId,
        Guid SectionId,
        string QuestionCode,
        string Prompt,
        Guid? SelectedOptionId,
        bool IsAnswered,
        IReadOnlyList<AttemptExecutionOptionResponse> Options);

    private sealed record AttemptExecutionOptionResponse(Guid OptionId, string OptionCode, string Text);

    private sealed record AttemptResultResponse(
        Guid AttemptId,
        int TotalQuestions,
        IReadOnlyList<AttemptResultQuestionReviewResponse> QuestionReviews);

    private sealed record AttemptResultQuestionReviewResponse(Guid QuestionId, bool IsCorrect);

    private sealed record AttemptHistoryResponse(IReadOnlyList<AttemptHistoryItemResponse> Items);

    private sealed record AttemptHistoryItemResponse(
        Guid AttemptId,
        Guid ExamId,
        string ExamTitle,
        DateTimeOffset AttemptedAt,
        [property: JsonPropertyName("score")] int? Score,
        [property: JsonPropertyName("percentage")] decimal? Percentage,
        int TimeSpentSeconds,
        string Status);
}
