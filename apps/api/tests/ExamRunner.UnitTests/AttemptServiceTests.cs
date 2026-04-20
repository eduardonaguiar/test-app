using ExamRunner.Infrastructure.Attempts;
using ExamRunner.Infrastructure.Data;
using ExamRunner.Infrastructure.Data.Entities;
using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace ExamRunner.UnitTests;

public sealed class AttemptServiceTests
{
    [Fact]
    public async Task CreateAsync_WithExistingExam_ShouldPersistConsistentInitialState()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<ExamRunnerDbContext>()
            .UseSqlite(connection)
            .Options;

        var now = new DateTimeOffset(2026, 4, 20, 10, 0, 0, TimeSpan.Zero);
        var examId = Guid.NewGuid();

        await using (var seedContext = new ExamRunnerDbContext(options))
        {
            await seedContext.Database.EnsureCreatedAsync();
            seedContext.Exams.Add(new ExamEntity
            {
                Id = examId,
                Title = "Exam",
                Description = "Desc",
                DurationMinutes = 90,
                PassingScorePercentage = 70,
                SchemaVersion = "1.0.0"
            });
            await seedContext.SaveChangesAsync();
        }

        AttemptSnapshot snapshot;

        await using (var actContext = new ExamRunnerDbContext(options))
        {
            var sut = new AttemptService(actContext, new FrozenTimeProvider(now));
            snapshot = await sut.CreateAsync(new CreateAttemptCommand(examId), CancellationToken.None);
        }

        snapshot.ExamId.Should().Be(examId);
        snapshot.Status.Should().Be(AttemptStatuses.InProgress);
        snapshot.StartedAtUtc.Should().Be(now);
        snapshot.LastSeenAtUtc.Should().Be(now);
        snapshot.DeadlineAtUtc.Should().Be(now.AddMinutes(90));
        snapshot.SubmittedAtUtc.Should().BeNull();

        await using (var assertContext = new ExamRunnerDbContext(options))
        {
            var persisted = await assertContext.Attempts.SingleAsync();
            persisted.ExamId.Should().Be(examId);
            persisted.Status.Should().Be(AttemptStatuses.InProgress);
            persisted.StartedAtUtc.Should().Be(now);
            persisted.LastSeenAtUtc.Should().Be(now);
            persisted.DeadlineAtUtc.Should().Be(now.AddMinutes(90));
            persisted.SubmittedAtUtc.Should().BeNull();
        }
    }

    [Fact]
    public async Task CreateAsync_WithUnknownExam_ShouldThrow()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<ExamRunnerDbContext>()
            .UseSqlite(connection)
            .Options;

        await using (var context = new ExamRunnerDbContext(options))
        {
            await context.Database.EnsureCreatedAsync();

            var sut = new AttemptService(context, new FrozenTimeProvider(DateTimeOffset.UtcNow));
            var action = () => sut.CreateAsync(new CreateAttemptCommand(Guid.NewGuid()), CancellationToken.None);

            await action.Should().ThrowAsync<AttemptCreationException>();
        }
    }

    [Fact]
    public async Task GetExecutionStateAsync_WithPersistedAnswers_ShouldReturnSessionStateForFrontendRebuild()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<ExamRunnerDbContext>()
            .UseSqlite(connection)
            .Options;

        var now = new DateTimeOffset(2026, 4, 20, 10, 0, 0, TimeSpan.Zero);

        var attemptId = Guid.NewGuid();
        var examId = Guid.NewGuid();
        var sectionId = Guid.NewGuid();
        var questionAId = Guid.NewGuid();
        var questionBId = Guid.NewGuid();
        var optionA1Id = Guid.NewGuid();
        var optionA2Id = Guid.NewGuid();
        var optionB1Id = Guid.NewGuid();
        var optionB2Id = Guid.NewGuid();

        await using (var seedContext = new ExamRunnerDbContext(options))
        {
            await seedContext.Database.EnsureCreatedAsync();

            seedContext.Exams.Add(new ExamEntity
            {
                Id = examId,
                Title = "Exam",
                Description = "Desc",
                DurationMinutes = 90,
                PassingScorePercentage = 70,
                SchemaVersion = "1.0.0",
                Sections =
                [
                    new ExamSectionEntity
                    {
                        Id = sectionId,
                        Title = "Section A",
                        SectionCode = "SEC-A",
                        DisplayOrder = 1,
                        QuestionCount = 2,
                        Questions =
                        [
                            new QuestionEntity
                            {
                                Id = questionAId,
                                QuestionCode = "Q-1",
                                Prompt = "Pergunta 1",
                                DisplayOrder = 1,
                                ExplanationSummary = "Resumo",
                                ExplanationDetails = "Detalhe",
                                Topic = "Topic",
                                Difficulty = "easy",
                                Weight = 1m,
                                Options =
                                [
                                    new QuestionOptionEntity
                                    {
                                        Id = optionA1Id,
                                        OptionCode = "A",
                                        Text = "Opção A",
                                        DisplayOrder = 1
                                    },
                                    new QuestionOptionEntity
                                    {
                                        Id = optionA2Id,
                                        OptionCode = "B",
                                        Text = "Opção B",
                                        DisplayOrder = 2
                                    }
                                ]
                            },
                            new QuestionEntity
                            {
                                Id = questionBId,
                                QuestionCode = "Q-2",
                                Prompt = "Pergunta 2",
                                DisplayOrder = 2,
                                ExplanationSummary = "Resumo",
                                ExplanationDetails = "Detalhe",
                                Topic = "Topic",
                                Difficulty = "easy",
                                Weight = 1m,
                                Options =
                                [
                                    new QuestionOptionEntity
                                    {
                                        Id = optionB1Id,
                                        OptionCode = "A",
                                        Text = "Opção A",
                                        DisplayOrder = 1
                                    },
                                    new QuestionOptionEntity
                                    {
                                        Id = optionB2Id,
                                        OptionCode = "B",
                                        Text = "Opção B",
                                        DisplayOrder = 2
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });

            seedContext.Attempts.Add(new AttemptEntity
            {
                Id = attemptId,
                ExamId = examId,
                Status = AttemptStatuses.InProgress,
                StartedAtUtc = now.AddMinutes(-5),
                DeadlineAtUtc = now.AddMinutes(55),
                LastSeenAtUtc = now.AddMinutes(-1),
                Answers =
                [
                    new AttemptAnswerEntity
                    {
                        Id = Guid.NewGuid(),
                        QuestionId = questionAId,
                        SelectedOptionId = optionA2Id,
                        UpdatedAtUtc = now.AddSeconds(-10)
                    }
                ]
            });

            await seedContext.SaveChangesAsync();
        }

        AttemptExecutionStateSnapshot? snapshot;
        await using (var actContext = new ExamRunnerDbContext(options))
        {
            var sut = new AttemptService(actContext, new FrozenTimeProvider(now));
            snapshot = await sut.GetExecutionStateAsync(attemptId, CancellationToken.None);
        }

        snapshot.Should().NotBeNull();
        snapshot!.RemainingSeconds.Should().Be(3300);
        snapshot.AnsweredQuestionCount.Should().Be(1);
        snapshot.PendingQuestionCount.Should().Be(1);
        snapshot.Questions.Should().HaveCount(2);
        snapshot.Questions[0].QuestionId.Should().Be(questionAId);
        snapshot.Questions[0].SelectedOptionId.Should().Be(optionA2Id);
        snapshot.Questions[0].IsAnswered.Should().BeTrue();
        snapshot.Questions[1].QuestionId.Should().Be(questionBId);
        snapshot.Questions[1].SelectedOptionId.Should().BeNull();
        snapshot.Questions[1].IsAnswered.Should().BeFalse();
    }

    [Fact]
    public async Task GetExecutionStateAsync_WithUnknownAttempt_ShouldReturnNull()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<ExamRunnerDbContext>()
            .UseSqlite(connection)
            .Options;

        await using (var context = new ExamRunnerDbContext(options))
        {
            await context.Database.EnsureCreatedAsync();
            var sut = new AttemptService(context, new FrozenTimeProvider(DateTimeOffset.UtcNow));

            var snapshot = await sut.GetExecutionStateAsync(Guid.NewGuid(), CancellationToken.None);

            snapshot.Should().BeNull();
        }
    }

    private sealed class FrozenTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }
}
