using ExamRunner.Infrastructure.Attempts;
using ExamRunner.Infrastructure.Data;
using ExamRunner.Infrastructure.Data.Entities;
using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

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

    [Fact]
    public async Task SaveAnswerAsync_WithValidAttemptAndQuestion_ShouldPersistAnswerWithTimestamp()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<ExamRunnerDbContext>()
            .UseSqlite(connection)
            .Options;

        var now = new DateTimeOffset(2026, 4, 20, 10, 0, 0, TimeSpan.Zero);
        var examId = Guid.NewGuid();
        var attemptId = Guid.NewGuid();
        var sectionId = Guid.NewGuid();
        var questionId = Guid.NewGuid();
        var optionAId = Guid.NewGuid();
        var optionBId = Guid.NewGuid();

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
                        QuestionCount = 1,
                        Questions =
                        [
                            new QuestionEntity
                            {
                                Id = questionId,
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
                                        Id = optionAId,
                                        OptionCode = "A",
                                        Text = "Opção A",
                                        DisplayOrder = 1
                                    },
                                    new QuestionOptionEntity
                                    {
                                        Id = optionBId,
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
                LastSeenAtUtc = now.AddMinutes(-1)
            });

            await seedContext.SaveChangesAsync();
        }

        AttemptExecutionStateSnapshot? snapshot;
        await using (var actContext = new ExamRunnerDbContext(options))
        {
            var sut = new AttemptService(actContext, new FrozenTimeProvider(now));
            snapshot = await sut.SaveAnswerAsync(new SaveAttemptAnswerCommand(attemptId, questionId, optionBId), CancellationToken.None);
        }

        snapshot.Should().NotBeNull();
        snapshot!.AnsweredQuestionCount.Should().Be(1);
        snapshot.PendingQuestionCount.Should().Be(0);
        snapshot.Questions.Single().SelectedOptionId.Should().Be(optionBId);

        await using (var assertContext = new ExamRunnerDbContext(options))
        {
            var persistedAnswer = await assertContext.AttemptAnswers.SingleAsync();
            var persistedAttempt = await assertContext.Attempts.SingleAsync(x => x.Id == attemptId);

            persistedAnswer.AttemptId.Should().Be(attemptId);
            persistedAnswer.QuestionId.Should().Be(questionId);
            persistedAnswer.SelectedOptionId.Should().Be(optionBId);
            persistedAnswer.UpdatedAtUtc.Should().Be(now);
            persistedAttempt.LastSeenAtUtc.Should().Be(now);
        }
    }

    [Fact]
    public async Task SaveAnswerAsync_WithExistingAnswer_ShouldUpdateSameRowForMultipleEdits()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<ExamRunnerDbContext>()
            .UseSqlite(connection)
            .Options;

        var initialNow = new DateTimeOffset(2026, 4, 20, 10, 0, 0, TimeSpan.Zero);
        var updatedNow = initialNow.AddMinutes(3);
        var examId = Guid.NewGuid();
        var attemptId = Guid.NewGuid();
        var sectionId = Guid.NewGuid();
        var questionId = Guid.NewGuid();
        var optionAId = Guid.NewGuid();
        var optionBId = Guid.NewGuid();

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
                        QuestionCount = 1,
                        Questions =
                        [
                            new QuestionEntity
                            {
                                Id = questionId,
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
                                        Id = optionAId,
                                        OptionCode = "A",
                                        Text = "Opção A",
                                        DisplayOrder = 1
                                    },
                                    new QuestionOptionEntity
                                    {
                                        Id = optionBId,
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
                StartedAtUtc = initialNow.AddMinutes(-5),
                DeadlineAtUtc = initialNow.AddMinutes(55),
                LastSeenAtUtc = initialNow.AddMinutes(-1),
                Answers =
                [
                    new AttemptAnswerEntity
                    {
                        Id = Guid.NewGuid(),
                        QuestionId = questionId,
                        SelectedOptionId = optionAId,
                        UpdatedAtUtc = initialNow
                    }
                ]
            });

            await seedContext.SaveChangesAsync();
        }

        await using (var actContext = new ExamRunnerDbContext(options))
        {
            var sut = new AttemptService(actContext, new FrozenTimeProvider(updatedNow));
            await sut.SaveAnswerAsync(new SaveAttemptAnswerCommand(attemptId, questionId, optionBId), CancellationToken.None);
        }

        await using (var assertContext = new ExamRunnerDbContext(options))
        {
            var persistedAnswers = await assertContext.AttemptAnswers
                .Where(answer => answer.AttemptId == attemptId && answer.QuestionId == questionId)
                .ToListAsync();

            persistedAnswers.Should().HaveCount(1);
            persistedAnswers[0].SelectedOptionId.Should().Be(optionBId);
            persistedAnswers[0].UpdatedAtUtc.Should().Be(updatedNow);
        }
    }

    [Fact]
    public async Task SaveAnswerAsync_WithQuestionOutsideAttemptExam_ShouldThrowArgumentException()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<ExamRunnerDbContext>()
            .UseSqlite(connection)
            .Options;

        var now = new DateTimeOffset(2026, 4, 20, 10, 0, 0, TimeSpan.Zero);
        var examId = Guid.NewGuid();
        var attemptId = Guid.NewGuid();
        var sectionId = Guid.NewGuid();
        var validQuestionId = Guid.NewGuid();
        var invalidQuestionId = Guid.NewGuid();
        var optionId = Guid.NewGuid();

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
                        QuestionCount = 1,
                        Questions =
                        [
                            new QuestionEntity
                            {
                                Id = validQuestionId,
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
                                        Id = optionId,
                                        OptionCode = "A",
                                        Text = "Opção A",
                                        DisplayOrder = 1
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
                LastSeenAtUtc = now.AddMinutes(-1)
            });

            await seedContext.SaveChangesAsync();
        }

        await using (var actContext = new ExamRunnerDbContext(options))
        {
            var sut = new AttemptService(actContext, new FrozenTimeProvider(now));
            var action = () => sut.SaveAnswerAsync(new SaveAttemptAnswerCommand(attemptId, invalidQuestionId, optionId), CancellationToken.None);

            await action.Should().ThrowAsync<ArgumentException>()
                .WithMessage("Question does not belong to this attempt.*");
        }
    }

    [Fact]
    public async Task SaveAnswerAsync_WithClosedAttempt_ShouldThrowInvalidOperationException()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<ExamRunnerDbContext>()
            .UseSqlite(connection)
            .Options;

        var now = new DateTimeOffset(2026, 4, 20, 10, 0, 0, TimeSpan.Zero);
        var examId = Guid.NewGuid();
        var attemptId = Guid.NewGuid();
        var sectionId = Guid.NewGuid();
        var questionId = Guid.NewGuid();
        var optionId = Guid.NewGuid();

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
                        QuestionCount = 1,
                        Questions =
                        [
                            new QuestionEntity
                            {
                                Id = questionId,
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
                                        Id = optionId,
                                        OptionCode = "A",
                                        Text = "Opção A",
                                        DisplayOrder = 1
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
                Status = AttemptStatuses.Submitted,
                StartedAtUtc = now.AddMinutes(-10),
                DeadlineAtUtc = now.AddMinutes(50),
                LastSeenAtUtc = now.AddMinutes(-2),
                SubmittedAtUtc = now.AddMinutes(-1)
            });

            await seedContext.SaveChangesAsync();
        }

        await using (var actContext = new ExamRunnerDbContext(options))
        {
            var sut = new AttemptService(actContext, new FrozenTimeProvider(now));
            var action = () => sut.SaveAnswerAsync(new SaveAttemptAnswerCommand(attemptId, questionId, optionId), CancellationToken.None);

            await action.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("Only attempts in progress can accept answers.");
        }
    }

    [Fact]
    public async Task GetExecutionStateAsync_WhenDeadlineHasPassed_ShouldFinalizeAttemptFromBackendTimeline()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<ExamRunnerDbContext>()
            .UseSqlite(connection)
            .Options;

        var now = new DateTimeOffset(2026, 4, 20, 12, 0, 0, TimeSpan.Zero);
        var examId = Guid.NewGuid();
        var attemptId = Guid.NewGuid();
        var sectionId = Guid.NewGuid();
        var questionId = Guid.NewGuid();
        var optionId = Guid.NewGuid();

        await using (var seedContext = new ExamRunnerDbContext(options))
        {
            await seedContext.Database.EnsureCreatedAsync();

            seedContext.Exams.Add(new ExamEntity
            {
                Id = examId,
                Title = "Exam",
                Description = "Desc",
                DurationMinutes = 30,
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
                        QuestionCount = 1,
                        Questions =
                        [
                            new QuestionEntity
                            {
                                Id = questionId,
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
                                        Id = optionId,
                                        OptionCode = "A",
                                        Text = "Opção A",
                                        DisplayOrder = 1
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
                StartedAtUtc = now.AddMinutes(-45),
                DeadlineAtUtc = now.AddMinutes(-15),
                LastSeenAtUtc = now.AddMinutes(-20)
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
        snapshot!.Status.Should().Be(AttemptStatuses.Finalized);
        snapshot.RemainingSeconds.Should().Be(0);
        snapshot.SubmittedAtUtc.Should().Be(now.AddMinutes(-15));

        await using (var assertContext = new ExamRunnerDbContext(options))
        {
            var persistedAttempt = await assertContext.Attempts.SingleAsync(x => x.Id == attemptId);
            persistedAttempt.Status.Should().Be(AttemptStatuses.Finalized);
            persistedAttempt.SubmittedAtUtc.Should().Be(now.AddMinutes(-15));
            persistedAttempt.LastSeenAtUtc.Should().Be(now);
        }
    }

    [Fact]
    public async Task SaveAnswerAsync_WhenDeadlineHasPassed_ShouldFinalizeAndRejectChanges()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<ExamRunnerDbContext>()
            .UseSqlite(connection)
            .Options;

        var now = new DateTimeOffset(2026, 4, 20, 12, 0, 0, TimeSpan.Zero);
        var examId = Guid.NewGuid();
        var attemptId = Guid.NewGuid();
        var sectionId = Guid.NewGuid();
        var questionId = Guid.NewGuid();
        var optionId = Guid.NewGuid();

        await using (var seedContext = new ExamRunnerDbContext(options))
        {
            await seedContext.Database.EnsureCreatedAsync();

            seedContext.Exams.Add(new ExamEntity
            {
                Id = examId,
                Title = "Exam",
                Description = "Desc",
                DurationMinutes = 30,
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
                        QuestionCount = 1,
                        Questions =
                        [
                            new QuestionEntity
                            {
                                Id = questionId,
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
                                        Id = optionId,
                                        OptionCode = "A",
                                        Text = "Opção A",
                                        DisplayOrder = 1
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
                StartedAtUtc = now.AddMinutes(-45),
                DeadlineAtUtc = now.AddMinutes(-1),
                LastSeenAtUtc = now.AddMinutes(-2)
            });

            await seedContext.SaveChangesAsync();
        }

        await using (var actContext = new ExamRunnerDbContext(options))
        {
            var sut = new AttemptService(actContext, new FrozenTimeProvider(now));
            var action = () => sut.SaveAnswerAsync(new SaveAttemptAnswerCommand(attemptId, questionId, optionId), CancellationToken.None);

            await action.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("Only attempts in progress can accept answers.");
        }

        await using (var assertContext = new ExamRunnerDbContext(options))
        {
            var persistedAttempt = await assertContext.Attempts.SingleAsync(x => x.Id == attemptId);
            persistedAttempt.Status.Should().Be(AttemptStatuses.Finalized);
            persistedAttempt.SubmittedAtUtc.Should().Be(now.AddMinutes(-1));
            persistedAttempt.LastSeenAtUtc.Should().Be(now);

            var persistedAnswers = await assertContext.AttemptAnswers.ToListAsync();
            persistedAnswers.Should().BeEmpty();
        }
    }

    [Fact]
    public async Task ReconnectAsync_WhenPolicyIsRespected_ShouldKeepAttemptInProgressAndPersistEvent()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<ExamRunnerDbContext>()
            .UseSqlite(connection)
            .Options;

        var now = new DateTimeOffset(2026, 4, 20, 12, 0, 0, TimeSpan.Zero);
        var examId = Guid.NewGuid();
        var attemptId = Guid.NewGuid();

        await using (var seedContext = new ExamRunnerDbContext(options))
        {
            await seedContext.Database.EnsureCreatedAsync();
            seedContext.Exams.Add(new ExamEntity
            {
                Id = examId,
                Title = "Exam",
                Description = "Desc",
                DurationMinutes = 60,
                PassingScorePercentage = 70,
                SchemaVersion = "1.0.0",
                ReconnectEnabled = true,
                MaxReconnectAttempts = 2,
                ReconnectGracePeriodSeconds = 120,
                ReconnectTerminateIfExceeded = true
            });
            seedContext.Attempts.Add(new AttemptEntity
            {
                Id = attemptId,
                ExamId = examId,
                Status = AttemptStatuses.InProgress,
                StartedAtUtc = now.AddMinutes(-10),
                DeadlineAtUtc = now.AddMinutes(50),
                LastSeenAtUtc = now.AddSeconds(-30)
            });
            await seedContext.SaveChangesAsync();
        }

        await using (var actContext = new ExamRunnerDbContext(options))
        {
            var sut = new AttemptService(actContext, new FrozenTimeProvider(now));
            var snapshot = await sut.ReconnectAsync(attemptId, CancellationToken.None);
            snapshot.Should().NotBeNull();
            snapshot!.Status.Should().Be(AttemptStatuses.InProgress);
            snapshot.LastSeenAtUtc.Should().Be(now);
        }

        await using (var assertContext = new ExamRunnerDbContext(options))
        {
            var eventRow = await assertContext.ReconnectEvents.SingleAsync(x => x.AttemptId == attemptId);
            eventRow.OfflineDurationSeconds.Should().Be(30);
            eventRow.GracePeriodRespected.Should().BeTrue();
            eventRow.FinalizedAttempt.Should().BeFalse();
        }
    }

    [Fact]
    public async Task ReconnectAsync_WhenGracePeriodIsExceededAndTerminateIsTrue_ShouldFinalizeAttempt()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<ExamRunnerDbContext>()
            .UseSqlite(connection)
            .Options;

        var now = new DateTimeOffset(2026, 4, 20, 12, 0, 0, TimeSpan.Zero);
        var examId = Guid.NewGuid();
        var attemptId = Guid.NewGuid();

        await using (var seedContext = new ExamRunnerDbContext(options))
        {
            await seedContext.Database.EnsureCreatedAsync();
            seedContext.Exams.Add(new ExamEntity
            {
                Id = examId,
                Title = "Exam",
                Description = "Desc",
                DurationMinutes = 60,
                PassingScorePercentage = 70,
                SchemaVersion = "1.0.0",
                ReconnectEnabled = true,
                MaxReconnectAttempts = 2,
                ReconnectGracePeriodSeconds = 60,
                ReconnectTerminateIfExceeded = true
            });
            seedContext.Attempts.Add(new AttemptEntity
            {
                Id = attemptId,
                ExamId = examId,
                Status = AttemptStatuses.InProgress,
                StartedAtUtc = now.AddMinutes(-10),
                DeadlineAtUtc = now.AddMinutes(50),
                LastSeenAtUtc = now.AddSeconds(-90)
            });
            await seedContext.SaveChangesAsync();
        }

        await using (var actContext = new ExamRunnerDbContext(options))
        {
            var sut = new AttemptService(actContext, new FrozenTimeProvider(now));
            var snapshot = await sut.ReconnectAsync(attemptId, CancellationToken.None);

            snapshot.Should().NotBeNull();
            snapshot!.Status.Should().Be(AttemptStatuses.Finalized);
            snapshot.SubmittedAtUtc.Should().Be(now);
        }

        await using (var assertContext = new ExamRunnerDbContext(options))
        {
            var events = await assertContext.ReconnectEvents
                .Where(x => x.AttemptId == attemptId)
                .OrderBy(x => x.SequenceNumber)
                .ToListAsync();

            events.Should().HaveCount(1);
            events[0].GracePeriodRespected.Should().BeFalse();
            events[0].FinalizedAttempt.Should().BeTrue();
        }
    }

    [Fact]
    public async Task ReconnectAsync_WhenReconnectCountIsExceededButTerminationIsDisabled_ShouldKeepAttemptInProgress()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<ExamRunnerDbContext>()
            .UseSqlite(connection)
            .Options;

        var now = new DateTimeOffset(2026, 4, 20, 12, 0, 0, TimeSpan.Zero);
        var examId = Guid.NewGuid();
        var attemptId = Guid.NewGuid();

        await using (var seedContext = new ExamRunnerDbContext(options))
        {
            await seedContext.Database.EnsureCreatedAsync();
            seedContext.Exams.Add(new ExamEntity
            {
                Id = examId,
                Title = "Exam",
                Description = "Desc",
                DurationMinutes = 60,
                PassingScorePercentage = 70,
                SchemaVersion = "1.0.0",
                ReconnectEnabled = true,
                MaxReconnectAttempts = 1,
                ReconnectGracePeriodSeconds = 120,
                ReconnectTerminateIfExceeded = false
            });
            seedContext.Attempts.Add(new AttemptEntity
            {
                Id = attemptId,
                ExamId = examId,
                Status = AttemptStatuses.InProgress,
                StartedAtUtc = now.AddMinutes(-10),
                DeadlineAtUtc = now.AddMinutes(50),
                LastSeenAtUtc = now.AddSeconds(-30),
                ReconnectEvents =
                [
                    new ReconnectEventEntity
                    {
                        Id = Guid.NewGuid(),
                        SequenceNumber = 1,
                        DisconnectedAtUtc = now.AddMinutes(-3),
                        ReconnectedAtUtc = now.AddMinutes(-2),
                        OfflineDurationSeconds = 60,
                        GracePeriodRespected = true,
                        FinalizedAttempt = false
                    }
                ]
            });
            await seedContext.SaveChangesAsync();
        }

        await using (var actContext = new ExamRunnerDbContext(options))
        {
            var sut = new AttemptService(actContext, new FrozenTimeProvider(now));
            var snapshot = await sut.ReconnectAsync(attemptId, CancellationToken.None);

            snapshot.Should().NotBeNull();
            snapshot!.Status.Should().Be(AttemptStatuses.InProgress);
        }

        await using (var assertContext = new ExamRunnerDbContext(options))
        {
            var events = await assertContext.ReconnectEvents
                .Where(x => x.AttemptId == attemptId)
                .OrderBy(x => x.SequenceNumber)
                .ToListAsync();

            events.Should().HaveCount(2);
            events[1].GracePeriodRespected.Should().BeTrue();
            events[1].FinalizedAttempt.Should().BeFalse();

            var attempt = await assertContext.Attempts.SingleAsync(x => x.Id == attemptId);
            attempt.Status.Should().Be(AttemptStatuses.InProgress);
        }
    }

    [Fact]
    public async Task ReconnectAsync_WhenReconnectCountIsExceededAndTerminateIsTrue_ShouldFinalizeAttempt()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<ExamRunnerDbContext>()
            .UseSqlite(connection)
            .Options;

        var now = new DateTimeOffset(2026, 4, 20, 12, 0, 0, TimeSpan.Zero);
        var examId = Guid.NewGuid();
        var attemptId = Guid.NewGuid();

        await using (var seedContext = new ExamRunnerDbContext(options))
        {
            await seedContext.Database.EnsureCreatedAsync();
            seedContext.Exams.Add(new ExamEntity
            {
                Id = examId,
                Title = "Exam",
                Description = "Desc",
                DurationMinutes = 60,
                PassingScorePercentage = 70,
                SchemaVersion = "1.0.0",
                ReconnectEnabled = true,
                MaxReconnectAttempts = 1,
                ReconnectGracePeriodSeconds = 120,
                ReconnectTerminateIfExceeded = true
            });
            seedContext.Attempts.Add(new AttemptEntity
            {
                Id = attemptId,
                ExamId = examId,
                Status = AttemptStatuses.InProgress,
                StartedAtUtc = now.AddMinutes(-10),
                DeadlineAtUtc = now.AddMinutes(50),
                LastSeenAtUtc = now.AddSeconds(-30),
                ReconnectEvents =
                [
                    new ReconnectEventEntity
                    {
                        Id = Guid.NewGuid(),
                        SequenceNumber = 1,
                        DisconnectedAtUtc = now.AddMinutes(-3),
                        ReconnectedAtUtc = now.AddMinutes(-2),
                        OfflineDurationSeconds = 60,
                        GracePeriodRespected = true,
                        FinalizedAttempt = false
                    }
                ]
            });
            await seedContext.SaveChangesAsync();
        }

        await using (var actContext = new ExamRunnerDbContext(options))
        {
            var sut = new AttemptService(actContext, new FrozenTimeProvider(now));
            var snapshot = await sut.ReconnectAsync(attemptId, CancellationToken.None);

            snapshot.Should().NotBeNull();
            snapshot!.Status.Should().Be(AttemptStatuses.Finalized);
            snapshot.SubmittedAtUtc.Should().Be(now);
        }

        await using (var assertContext = new ExamRunnerDbContext(options))
        {
            var events = await assertContext.ReconnectEvents
                .Where(x => x.AttemptId == attemptId)
                .OrderBy(x => x.SequenceNumber)
                .ToListAsync();

            events.Should().HaveCount(2);
            events[1].GracePeriodRespected.Should().BeTrue();
            events[1].FinalizedAttempt.Should().BeTrue();

            var attempt = await assertContext.Attempts.SingleAsync(x => x.Id == attemptId);
            attempt.Status.Should().Be(AttemptStatuses.Finalized);
            attempt.SubmittedAtUtc.Should().Be(now);
        }
    }

    [Fact]
    public async Task ReconnectAsync_WhenReconnectPolicyIsDisabled_ShouldStillPersistAuditEvent()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<ExamRunnerDbContext>()
            .UseSqlite(connection)
            .Options;

        var now = new DateTimeOffset(2026, 4, 20, 12, 0, 0, TimeSpan.Zero);
        var examId = Guid.NewGuid();
        var attemptId = Guid.NewGuid();

        await using (var seedContext = new ExamRunnerDbContext(options))
        {
            await seedContext.Database.EnsureCreatedAsync();
            seedContext.Exams.Add(new ExamEntity
            {
                Id = examId,
                Title = "Exam",
                Description = "Desc",
                DurationMinutes = 60,
                PassingScorePercentage = 70,
                SchemaVersion = "1.0.0",
                ReconnectEnabled = false,
                MaxReconnectAttempts = 0,
                ReconnectGracePeriodSeconds = 0,
                ReconnectTerminateIfExceeded = true
            });
            seedContext.Attempts.Add(new AttemptEntity
            {
                Id = attemptId,
                ExamId = examId,
                Status = AttemptStatuses.InProgress,
                StartedAtUtc = now.AddMinutes(-10),
                DeadlineAtUtc = now.AddMinutes(50),
                LastSeenAtUtc = now.AddSeconds(-45)
            });
            await seedContext.SaveChangesAsync();
        }

        await using (var actContext = new ExamRunnerDbContext(options))
        {
            var sut = new AttemptService(actContext, new FrozenTimeProvider(now));
            var snapshot = await sut.ReconnectAsync(attemptId, CancellationToken.None);
            snapshot.Should().NotBeNull();
            snapshot!.Status.Should().Be(AttemptStatuses.InProgress);
            snapshot.LastSeenAtUtc.Should().Be(now);
        }

        await using (var assertContext = new ExamRunnerDbContext(options))
        {
            var events = await assertContext.ReconnectEvents
                .Where(x => x.AttemptId == attemptId)
                .OrderBy(x => x.SequenceNumber)
                .ToListAsync();

            events.Should().HaveCount(1);
            events[0].OfflineDurationSeconds.Should().Be(45);
            events[0].GracePeriodRespected.Should().BeTrue();
            events[0].FinalizedAttempt.Should().BeFalse();
        }
    }

    [Fact]
    public async Task SubmitAsync_WithInProgressAttempt_ShouldCloseAttemptAndPersistScoredResult()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<ExamRunnerDbContext>()
            .UseSqlite(connection)
            .Options;

        var now = new DateTimeOffset(2026, 4, 20, 13, 0, 0, TimeSpan.Zero);
        var examId = Guid.NewGuid();
        var attemptId = Guid.NewGuid();
        var sectionId = Guid.NewGuid();
        var questionAId = Guid.NewGuid();
        var questionBId = Guid.NewGuid();
        var questionCId = Guid.NewGuid();
        var optionA1Id = Guid.NewGuid();
        var optionA2Id = Guid.NewGuid();
        var optionB1Id = Guid.NewGuid();
        var optionB2Id = Guid.NewGuid();
        var optionC1Id = Guid.NewGuid();
        var optionC2Id = Guid.NewGuid();

        await using (var seedContext = new ExamRunnerDbContext(options))
        {
            await seedContext.Database.EnsureCreatedAsync();
            seedContext.Exams.Add(new ExamEntity
            {
                Id = examId,
                Title = "Exam",
                Description = "Desc",
                DurationMinutes = 60,
                PassingScorePercentage = 60,
                SchemaVersion = "1.0.0",
                Sections =
                [
                    new ExamSectionEntity
                    {
                        Id = sectionId,
                        Title = "Section A",
                        SectionCode = "SEC-A",
                        DisplayOrder = 1,
                        QuestionCount = 3,
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
                                    new QuestionOptionEntity { Id = optionA1Id, OptionCode = "A", Text = "Opção A", IsCorrect = true, DisplayOrder = 1 },
                                    new QuestionOptionEntity { Id = optionA2Id, OptionCode = "B", Text = "Opção B", IsCorrect = false, DisplayOrder = 2 }
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
                                    new QuestionOptionEntity { Id = optionB1Id, OptionCode = "A", Text = "Opção A", IsCorrect = true, DisplayOrder = 1 },
                                    new QuestionOptionEntity { Id = optionB2Id, OptionCode = "B", Text = "Opção B", IsCorrect = false, DisplayOrder = 2 }
                                ]
                            },
                            new QuestionEntity
                            {
                                Id = questionCId,
                                QuestionCode = "Q-3",
                                Prompt = "Pergunta 3",
                                DisplayOrder = 3,
                                ExplanationSummary = "Resumo",
                                ExplanationDetails = "Detalhe",
                                Topic = "Topic",
                                Difficulty = "easy",
                                Weight = 1m,
                                Options =
                                [
                                    new QuestionOptionEntity { Id = optionC1Id, OptionCode = "A", Text = "Opção A", IsCorrect = true, DisplayOrder = 1 },
                                    new QuestionOptionEntity { Id = optionC2Id, OptionCode = "B", Text = "Opção B", IsCorrect = false, DisplayOrder = 2 }
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
                StartedAtUtc = now.AddMinutes(-20),
                DeadlineAtUtc = now.AddMinutes(40),
                LastSeenAtUtc = now.AddMinutes(-1),
                Answers =
                [
                    new AttemptAnswerEntity
                    {
                        Id = Guid.NewGuid(),
                        QuestionId = questionAId,
                        SelectedOptionId = optionA1Id,
                        UpdatedAtUtc = now.AddMinutes(-5)
                    },
                    new AttemptAnswerEntity
                    {
                        Id = Guid.NewGuid(),
                        QuestionId = questionBId,
                        SelectedOptionId = optionB2Id,
                        UpdatedAtUtc = now.AddMinutes(-4)
                    }
                ]
            });
            await seedContext.SaveChangesAsync();
        }

        await using (var actContext = new ExamRunnerDbContext(options))
        {
            var sut = new AttemptService(actContext, new FrozenTimeProvider(now));
            var snapshot = await sut.SubmitAsync(attemptId, CancellationToken.None);

            snapshot.Should().NotBeNull();
            snapshot!.Status.Should().Be(AttemptStatuses.Submitted);
            snapshot.SubmittedAtUtc.Should().Be(now);
            snapshot.LastSeenAtUtc.Should().Be(now);
        }

        await using (var assertContext = new ExamRunnerDbContext(options))
        {
            var attempt = await assertContext.Attempts
                .Include(x => x.Result)
                .SingleAsync(x => x.Id == attemptId);

            attempt.Status.Should().Be(AttemptStatuses.Submitted);
            attempt.SubmittedAtUtc.Should().Be(now);
            attempt.Result.Should().NotBeNull();
            attempt.Result!.TotalQuestions.Should().Be(3);
            attempt.Result.CorrectAnswers.Should().Be(1);
            attempt.Result.IncorrectAnswers.Should().Be(1);
            attempt.Result.UnansweredQuestions.Should().Be(1);
            attempt.Result.ScorePercentage.Should().Be(33.33m);
            attempt.Result.Passed.Should().BeFalse();
            attempt.Result.EvaluatedAtUtc.Should().Be(now);
            attempt.Result.QuestionReviewsJson.Should().NotBeNullOrWhiteSpace();
            attempt.Result.TopicAnalysisJson.Should().NotBeNullOrWhiteSpace();
        }
    }

    [Fact]
    public async Task SubmitAsync_WithSubmittedAttempt_ShouldRejectAndKeepSingleResult()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<ExamRunnerDbContext>()
            .UseSqlite(connection)
            .Options;

        var now = new DateTimeOffset(2026, 4, 20, 14, 0, 0, TimeSpan.Zero);
        var examId = Guid.NewGuid();
        var attemptId = Guid.NewGuid();
        var resultId = Guid.NewGuid();

        await using (var seedContext = new ExamRunnerDbContext(options))
        {
            await seedContext.Database.EnsureCreatedAsync();
            seedContext.Exams.Add(new ExamEntity
            {
                Id = examId,
                Title = "Exam",
                Description = "Desc",
                DurationMinutes = 60,
                PassingScorePercentage = 70,
                SchemaVersion = "1.0.0"
            });
            seedContext.Attempts.Add(new AttemptEntity
            {
                Id = attemptId,
                ExamId = examId,
                Status = AttemptStatuses.Submitted,
                StartedAtUtc = now.AddMinutes(-30),
                DeadlineAtUtc = now.AddMinutes(30),
                LastSeenAtUtc = now.AddMinutes(-2),
                SubmittedAtUtc = now.AddMinutes(-1),
                Result = new AttemptResultEntity
                {
                    Id = resultId,
                    TotalQuestions = 1,
                    CorrectAnswers = 1,
                    IncorrectAnswers = 0,
                    UnansweredQuestions = 0,
                    ScorePercentage = 100m,
                    Passed = true,
                    EvaluatedAtUtc = now.AddMinutes(-1)
                }
            });
            await seedContext.SaveChangesAsync();
        }

        await using (var actContext = new ExamRunnerDbContext(options))
        {
            var sut = new AttemptService(actContext, new FrozenTimeProvider(now));
            var action = () => sut.SubmitAsync(attemptId, CancellationToken.None);

            await action.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("Only attempts in progress can be submitted.");
        }

        await using (var assertContext = new ExamRunnerDbContext(options))
        {
            var attempt = await assertContext.Attempts.SingleAsync(x => x.Id == attemptId);
            var results = await assertContext.AttemptResults
                .Where(x => x.AttemptId == attemptId)
                .ToListAsync();

            attempt.Status.Should().Be(AttemptStatuses.Submitted);
            attempt.SubmittedAtUtc.Should().Be(now.AddMinutes(-1));
            results.Should().HaveCount(1);
            results[0].Id.Should().Be(resultId);
        }
    }

    [Fact]
    public async Task GetResultAsync_WithSubmittedAttempt_ShouldReturnDetailedReviewAndTopicAnalysis()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<ExamRunnerDbContext>()
            .UseSqlite(connection)
            .Options;

        var now = new DateTimeOffset(2026, 4, 20, 15, 0, 0, TimeSpan.Zero);
        var examId = Guid.NewGuid();
        var attemptId = Guid.NewGuid();
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
                DurationMinutes = 60,
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
                                ExplanationSummary = "Resumo A",
                                ExplanationDetails = "Detalhe A",
                                Topic = "Networking",
                                Difficulty = "easy",
                                Weight = 1m,
                                Options =
                                [
                                    new QuestionOptionEntity { Id = optionA1Id, OptionCode = "A", Text = "Opção A", IsCorrect = true, DisplayOrder = 1 },
                                    new QuestionOptionEntity { Id = optionA2Id, OptionCode = "B", Text = "Opção B", IsCorrect = false, DisplayOrder = 2 }
                                ]
                            },
                            new QuestionEntity
                            {
                                Id = questionBId,
                                QuestionCode = "Q-2",
                                Prompt = "Pergunta 2",
                                DisplayOrder = 2,
                                ExplanationSummary = "Resumo B",
                                ExplanationDetails = "Detalhe B",
                                Topic = "Security",
                                Difficulty = "easy",
                                Weight = 1m,
                                Options =
                                [
                                    new QuestionOptionEntity { Id = optionB1Id, OptionCode = "A", Text = "Opção A", IsCorrect = true, DisplayOrder = 1 },
                                    new QuestionOptionEntity { Id = optionB2Id, OptionCode = "B", Text = "Opção B", IsCorrect = false, DisplayOrder = 2 }
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
                Status = AttemptStatuses.Submitted,
                StartedAtUtc = now.AddMinutes(-30),
                DeadlineAtUtc = now.AddMinutes(30),
                LastSeenAtUtc = now.AddMinutes(-1),
                SubmittedAtUtc = now,
                Answers =
                [
                    new AttemptAnswerEntity
                    {
                        Id = Guid.NewGuid(),
                        QuestionId = questionAId,
                        SelectedOptionId = optionA1Id,
                        UpdatedAtUtc = now
                    },
                    new AttemptAnswerEntity
                    {
                        Id = Guid.NewGuid(),
                        QuestionId = questionBId,
                        SelectedOptionId = optionB2Id,
                        UpdatedAtUtc = now
                    }
                ],
                Result = new AttemptResultEntity
                {
                    Id = Guid.NewGuid(),
                    TotalQuestions = 2,
                    CorrectAnswers = 1,
                    IncorrectAnswers = 1,
                    UnansweredQuestions = 0,
                    ScorePercentage = 50m,
                    Passed = false,
                    EvaluatedAtUtc = now
                }
            });

            await seedContext.SaveChangesAsync();
        }

        AttemptResultSnapshot? snapshot;
        await using (var actContext = new ExamRunnerDbContext(options))
        {
            var sut = new AttemptService(actContext, new FrozenTimeProvider(now));
            snapshot = await sut.GetResultAsync(attemptId, CancellationToken.None);
        }

        snapshot.Should().NotBeNull();
        snapshot!.Score.Should().Be(1);
        snapshot.Percentage.Should().Be(50m);
        snapshot.Passed.Should().BeFalse();
        snapshot.Outcome.Should().Be("reprovado");
        snapshot.QuestionReviews.Should().HaveCount(2);

        var questionAReview = snapshot.QuestionReviews.Single(review => review.QuestionId == questionAId);
        questionAReview.UserSelectedOptionId.Should().Be(optionA1Id);
        questionAReview.CorrectOptionId.Should().Be(optionA1Id);
        questionAReview.IsCorrect.Should().BeTrue();
        questionAReview.ExplanationSummary.Should().Be("Resumo A");
        questionAReview.ExplanationDetails.Should().Be("Detalhe A");

        var questionBReview = snapshot.QuestionReviews.Single(review => review.QuestionId == questionBId);
        questionBReview.UserSelectedOptionId.Should().Be(optionB2Id);
        questionBReview.CorrectOptionId.Should().Be(optionB1Id);
        questionBReview.IsCorrect.Should().BeFalse();

        snapshot.TopicAnalysis.Should().HaveCount(2);
        snapshot.TopicAnalysis.Should().Contain(x =>
            x.Topic == "Networking" &&
            x.CorrectAnswers == 1 &&
            x.IncorrectAnswers == 0 &&
            x.ScorePercentage == 100m);
        snapshot.TopicAnalysis.Should().Contain(x =>
            x.Topic == "Security" &&
            x.CorrectAnswers == 0 &&
            x.IncorrectAnswers == 1 &&
            x.ScorePercentage == 0m);
    }

    [Fact]
    public async Task GetResultAsync_WithPersistedReviewSnapshot_ShouldRemainStableForHistoricalReopen()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<ExamRunnerDbContext>()
            .UseSqlite(connection)
            .Options;

        var now = new DateTimeOffset(2026, 4, 20, 15, 30, 0, TimeSpan.Zero);
        var examId = Guid.NewGuid();
        var attemptId = Guid.NewGuid();
        var sectionId = Guid.NewGuid();
        var questionId = Guid.NewGuid();
        var optionAId = Guid.NewGuid();
        var optionBId = Guid.NewGuid();

        var persistedReviews = new[]
        {
            new AttemptResultQuestionReviewSnapshot(
                questionId,
                sectionId,
                "Section A",
                "Q-1",
                "Pergunta original",
                optionAId,
                "A",
                "Resposta original",
                optionAId,
                "A",
                "Resposta original",
                true,
                "Resumo original",
                "Detalhe original")
        };

        var persistedTopics = new[]
        {
            new TopicScoreBreakdown("Networking", 1, 1, 0, 0, 100m)
        };

        await using (var seedContext = new ExamRunnerDbContext(options))
        {
            await seedContext.Database.EnsureCreatedAsync();

            seedContext.Exams.Add(new ExamEntity
            {
                Id = examId,
                Title = "Exam",
                Description = "Desc",
                DurationMinutes = 60,
                PassingScorePercentage = 70,
                SchemaVersion = "1.0.0",
                Sections =
                [
                    new ExamSectionEntity
                    {
                        Id = sectionId,
                        Title = "Section alterada",
                        SectionCode = "SEC-A",
                        DisplayOrder = 1,
                        QuestionCount = 1,
                        Questions =
                        [
                            new QuestionEntity
                            {
                                Id = questionId,
                                QuestionCode = "Q-1",
                                Prompt = "Pergunta alterada",
                                DisplayOrder = 1,
                                ExplanationSummary = "Resumo alterado",
                                ExplanationDetails = "Detalhe alterado",
                                Topic = "Cloud",
                                Difficulty = "easy",
                                Weight = 1m,
                                Options =
                                [
                                    new QuestionOptionEntity { Id = optionAId, OptionCode = "A", Text = "Resposta alterada", IsCorrect = true, DisplayOrder = 1 },
                                    new QuestionOptionEntity { Id = optionBId, OptionCode = "B", Text = "Distrator alterado", IsCorrect = false, DisplayOrder = 2 }
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
                Status = AttemptStatuses.Submitted,
                StartedAtUtc = now.AddMinutes(-30),
                DeadlineAtUtc = now.AddMinutes(30),
                LastSeenAtUtc = now.AddMinutes(-1),
                SubmittedAtUtc = now,
                Answers =
                [
                    new AttemptAnswerEntity
                    {
                        Id = Guid.NewGuid(),
                        QuestionId = questionId,
                        SelectedOptionId = optionAId,
                        UpdatedAtUtc = now
                    }
                ],
                Result = new AttemptResultEntity
                {
                    Id = Guid.NewGuid(),
                    TotalQuestions = 1,
                    CorrectAnswers = 1,
                    IncorrectAnswers = 0,
                    UnansweredQuestions = 0,
                    ScorePercentage = 100m,
                    Passed = true,
                    EvaluatedAtUtc = now,
                    QuestionReviewsJson = JsonSerializer.Serialize(persistedReviews),
                    TopicAnalysisJson = JsonSerializer.Serialize(persistedTopics)
                }
            });

            await seedContext.SaveChangesAsync();
        }

        AttemptResultSnapshot? snapshot;
        await using (var actContext = new ExamRunnerDbContext(options))
        {
            var sut = new AttemptService(actContext, new FrozenTimeProvider(now));
            snapshot = await sut.GetResultAsync(attemptId, CancellationToken.None);
        }

        snapshot.Should().NotBeNull();
        snapshot!.QuestionReviews.Should().HaveCount(1);
        snapshot.QuestionReviews[0].Prompt.Should().Be("Pergunta original");
        snapshot.QuestionReviews[0].ExplanationSummary.Should().Be("Resumo original");
        snapshot.QuestionReviews[0].UserSelectedOptionText.Should().Be("Resposta original");
        snapshot.TopicAnalysis.Should().ContainSingle(topic => topic.Topic == "Networking" && topic.ScorePercentage == 100m);
    }

    [Fact]
    public async Task GetResultAsync_WithInProgressAttempt_ShouldReject()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<ExamRunnerDbContext>()
            .UseSqlite(connection)
            .Options;

        var now = new DateTimeOffset(2026, 4, 20, 16, 0, 0, TimeSpan.Zero);
        var examId = Guid.NewGuid();
        var attemptId = Guid.NewGuid();

        await using (var seedContext = new ExamRunnerDbContext(options))
        {
            await seedContext.Database.EnsureCreatedAsync();

            seedContext.Exams.Add(new ExamEntity
            {
                Id = examId,
                Title = "Exam",
                Description = "Desc",
                DurationMinutes = 60,
                PassingScorePercentage = 70,
                SchemaVersion = "1.0.0"
            });

            seedContext.Attempts.Add(new AttemptEntity
            {
                Id = attemptId,
                ExamId = examId,
                Status = AttemptStatuses.InProgress,
                StartedAtUtc = now.AddMinutes(-10),
                DeadlineAtUtc = now.AddMinutes(50),
                LastSeenAtUtc = now.AddMinutes(-1)
            });

            await seedContext.SaveChangesAsync();
        }

        await using (var actContext = new ExamRunnerDbContext(options))
        {
            var sut = new AttemptService(actContext, new FrozenTimeProvider(now));
            var action = () => sut.GetResultAsync(attemptId, CancellationToken.None);

            await action.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("Result is available only after submission.");
        }
    }

    [Fact]
    public async Task GetHistoryAsync_ShouldReturnFinalizedAttemptsWithComputedMetrics()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<ExamRunnerDbContext>()
            .UseSqlite(connection)
            .Options;

        var now = new DateTimeOffset(2026, 4, 20, 18, 0, 0, TimeSpan.Zero);
        var examId = Guid.NewGuid();
        var includedAttemptId = Guid.NewGuid();
        var inProgressAttemptId = Guid.NewGuid();

        await using (var seedContext = new ExamRunnerDbContext(options))
        {
            await seedContext.Database.EnsureCreatedAsync();

            seedContext.Exams.Add(new ExamEntity
            {
                Id = examId,
                Title = "Simulado de Redes",
                Description = "Desc",
                DurationMinutes = 60,
                PassingScorePercentage = 70,
                SchemaVersion = "1.0.0"
            });

            seedContext.Attempts.Add(new AttemptEntity
            {
                Id = includedAttemptId,
                ExamId = examId,
                Status = AttemptStatuses.Submitted,
                StartedAtUtc = now.AddMinutes(-30),
                DeadlineAtUtc = now.AddMinutes(30),
                LastSeenAtUtc = now.AddMinutes(-2),
                SubmittedAtUtc = now.AddMinutes(-1),
                Result = new AttemptResultEntity
                {
                    Id = Guid.NewGuid(),
                    TotalQuestions = 10,
                    CorrectAnswers = 8,
                    IncorrectAnswers = 2,
                    UnansweredQuestions = 0,
                    ScorePercentage = 80m,
                    Passed = true,
                    EvaluatedAtUtc = now.AddMinutes(-1)
                }
            });

            seedContext.Attempts.Add(new AttemptEntity
            {
                Id = inProgressAttemptId,
                ExamId = examId,
                Status = AttemptStatuses.InProgress,
                StartedAtUtc = now.AddMinutes(-5),
                DeadlineAtUtc = now.AddMinutes(55),
                LastSeenAtUtc = now.AddMinutes(-1)
            });

            await seedContext.SaveChangesAsync();
        }

        IReadOnlyList<AttemptHistoryItemSnapshot> history;
        await using (var actContext = new ExamRunnerDbContext(options))
        {
            var sut = new AttemptService(actContext, new FrozenTimeProvider(now));
            history = await sut.GetHistoryAsync(CancellationToken.None);
        }

        history.Should().HaveCount(1);
        history[0].AttemptId.Should().Be(includedAttemptId);
        history[0].ExamTitle.Should().Be("Simulado de Redes");
        history[0].Score.Should().Be(8);
        history[0].Percentage.Should().Be(80m);
        history[0].TimeSpentSeconds.Should().Be(1740);
        history[0].Status.Should().Be(AttemptStatuses.Submitted);
    }

    private sealed class FrozenTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }
}
