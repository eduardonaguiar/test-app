using ExamRunner.Infrastructure.Data.Entities;
using ExamRunner.Infrastructure.Import;
using FluentAssertions;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

namespace ExamRunner.UnitTests;

public sealed class ExamImportServiceTests
{
    [Fact]
    public async Task ImportAsync_WithValidJson_ShouldImportExam()
    {
        var persistence = new FakeExamImportPersistence();
        var service = CreateSut(persistence);

        var result = await service.ImportAsync(BuildValidPayloadJson(), CancellationToken.None);

        result.Title.Should().Be("Prova de Exemplo");
        result.SectionCount.Should().Be(1);
        result.QuestionCount.Should().Be(2);
        persistence.SavedExam.Should().NotBeNull();
        persistence.SavedExam!.Sections.Should().HaveCount(1);
    }

    [Fact]
    public async Task ImportAsync_WithMissingRequiredField_ShouldFailSchemaValidation()
    {
        var service = CreateSut(new FakeExamImportPersistence());
        var payload = BuildValidPayloadJson().Replace("\"title\": \"Prova de Exemplo\",\n", string.Empty);

        var action = () => service.ImportAsync(payload, CancellationToken.None);

        var exception = await action.Should().ThrowAsync<ExamImportException>();
        exception.Which.ErrorCode.Should().Be("validation_failed");
        exception.Which.Errors.Should().Contain(error => error.Path.Contains("metadata") && error.Message.Contains("required"));
    }

    [Fact]
    public async Task ImportAsync_WithInvalidCorrectOption_ShouldFailConsistencyValidation()
    {
        var service = CreateSut(new FakeExamImportPersistence());
        var payload = BuildValidPayloadJson().Replace("\"correctOptionId\": \"A\"", "\"correctOptionId\": \"Z\"");

        var action = () => service.ImportAsync(payload, CancellationToken.None);

        var exception = await action.Should().ThrowAsync<ExamImportException>();
        exception.Which.ErrorCode.Should().Be("import_inconsistent_payload");
        exception.Which.Errors.Should().Contain(error => error.Path.EndsWith("correctOptionId") && error.Message.Contains("was not found"));
    }

    [Fact]
    public async Task ImportAsync_WithoutSchemaVersion_ShouldFailSchemaValidation()
    {
        var service = CreateSut(new FakeExamImportPersistence());
        var payload = BuildValidPayloadJson().Replace("  \"schemaVersion\": \"1.0.0\",\n", string.Empty);

        var action = () => service.ImportAsync(payload, CancellationToken.None);

        var exception = await action.Should().ThrowAsync<ExamImportException>();
        exception.Which.ErrorCode.Should().Be("validation_failed");
        exception.Which.Errors.Should().Contain(error => error.Path == "#" || error.Path.Contains("schemaVersion"));
    }

    [Fact]
    public async Task ImportAsync_WithDuplicatedQuestionIds_ShouldFailConsistencyValidation()
    {
        var service = CreateSut(new FakeExamImportPersistence());
        var payload = BuildValidPayloadJson().Replace("\"questionId\": \"q-2\"", "\"questionId\": \"q-1\"");

        var action = () => service.ImportAsync(payload, CancellationToken.None);

        var exception = await action.Should().ThrowAsync<ExamImportException>();
        exception.Which.ErrorCode.Should().Be("import_inconsistent_payload");
        exception.Which.Errors.Should().Contain(error => error.Path.EndsWith("questionId") && error.Message.Contains("duplicated", StringComparison.OrdinalIgnoreCase));
    }

    private static ExamImportService CreateSut(FakeExamImportPersistence persistence)
    {
        var hostEnvironment = new FakeHostEnvironment(FindRepositoryRoot());

        return new ExamImportService(
            new OfficialExamSchemaValidator(hostEnvironment),
            new ExamImportPayloadParser(),
            new ExamImportPayloadConsistencyValidator(),
            new ExamImportEntityMapper(),
            persistence);
    }

    private static string FindRepositoryRoot()
    {
        var current = new DirectoryInfo(AppContext.BaseDirectory);

        while (current is not null)
        {
            var schemaPath = Path.Combine(current.FullName, "packages", "exam-schema", "src", "exam.schema.json");
            if (File.Exists(schemaPath))
            {
                return current.FullName;
            }

            current = current.Parent;
        }

        throw new InvalidOperationException("Could not resolve repository root for test execution.");
    }

    private static string BuildValidPayloadJson() =>
        """
        {
          "schemaVersion": "1.0.0",
          "metadata": {
            "examId": "exam-001",
            "title": "Prova de Exemplo",
            "description": "Descrição da prova"
          },
          "durationMinutes": 60,
          "passingScore": 70,
          "reconnectPolicy": {
            "enabled": true,
            "maxReconnects": 2,
            "gracePeriodSeconds": 30
          },
          "sections": [
            {
              "sectionId": "s-1",
              "title": "Fundamentos",
              "questions": [
                {
                  "questionId": "q-1",
                  "prompt": "Qual é a capital da França?",
                  "options": [
                    { "optionId": "A", "text": "Paris" },
                    { "optionId": "B", "text": "Lyon" }
                  ],
                  "correctOptionId": "A",
                  "explanationSummary": "Paris é a capital da França.",
                  "explanationDetailed": "Paris é sede do governo francês e principal centro político do país.",
                  "topic": "Geografia",
                  "difficulty": "easy",
                  "weight": 1
                },
                {
                  "questionId": "q-2",
                  "prompt": "2 + 2 = ?",
                  "options": [
                    { "optionId": "A", "text": "4" },
                    { "optionId": "B", "text": "5" }
                  ],
                  "correctOptionId": "A",
                  "explanationSummary": "Resultado básico de adição.",
                  "explanationDetailed": "Somando dois com dois obtemos quatro.",
                  "topic": "Matemática",
                  "difficulty": "easy",
                  "weight": 1
                }
              ]
            }
          ]
        }
        """;

    private sealed class FakeExamImportPersistence : IExamImportPersistence
    {
        public ExamEntity? SavedExam { get; private set; }

        public Task SaveAsync(ExamEntity exam, CancellationToken cancellationToken)
        {
            SavedExam = exam;
            return Task.CompletedTask;
        }
    }

    private sealed class FakeHostEnvironment(string contentRootPath) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "ExamRunner.UnitTests";
        public string ContentRootPath { get; set; } = contentRootPath;
        public IFileProvider ContentRootFileProvider { get; set; } = new PhysicalFileProvider(contentRootPath);
    }
}
