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

    private sealed class FrozenTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }
}
