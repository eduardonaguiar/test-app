using ExamRunner.Application.Attempts;
using ExamRunner.Infrastructure.Data;
using FluentValidation;

namespace ExamRunner.Infrastructure.Attempts;

public sealed class AttemptService(
    ExamRunnerDbContext dbContext,
    TimeProvider timeProvider,
    IValidator<CreateAttemptCommand>? createAttemptCommandValidator = null,
    IValidator<SaveAttemptAnswerCommand>? saveAttemptAnswerCommandValidator = null,
    IAttemptScoringService? attemptScoringService = null,
    IAttemptLifecycleService? lifecycleService = null,
    IAttemptReconnectService? reconnectService = null,
    IAttemptReportingService? reportingService = null) : IAttemptService
{
    private readonly IAttemptLifecycleService lifecycleService = lifecycleService
        ?? new AttemptLifecycleService(dbContext, timeProvider, createAttemptCommandValidator, saveAttemptAnswerCommandValidator, attemptScoringService);

    private readonly IAttemptReconnectService reconnectService = reconnectService
        ?? new AttemptReconnectService(dbContext, timeProvider);

    private readonly IAttemptReportingService reportingService = reportingService
        ?? new AttemptReportingService(dbContext);

    public Task<IReadOnlyList<AttemptHistoryItemSnapshot>> GetHistoryAsync(CancellationToken cancellationToken = default)
        => reportingService.GetHistoryAsync(cancellationToken);

    public Task<PerformanceDashboardSnapshot> GetPerformanceDashboardAsync(CancellationToken cancellationToken = default)
        => reportingService.GetPerformanceDashboardAsync(cancellationToken);

    public Task<AttemptSnapshot> CreateAsync(CreateAttemptCommand command, CancellationToken cancellationToken = default)
        => lifecycleService.CreateAsync(command, cancellationToken);

    public Task<AttemptExecutionStateSnapshot?> GetExecutionStateAsync(Guid attemptId, CancellationToken cancellationToken = default)
        => lifecycleService.GetExecutionStateAsync(attemptId, cancellationToken);

    public Task<AttemptResultSnapshot?> GetResultAsync(Guid attemptId, CancellationToken cancellationToken = default)
        => lifecycleService.GetResultAsync(attemptId, cancellationToken);

    public Task<AttemptExecutionStateSnapshot?> ReconnectAsync(Guid attemptId, CancellationToken cancellationToken = default)
        => reconnectService.ReconnectAsync(attemptId, cancellationToken);

    public Task<AttemptExecutionStateSnapshot?> SaveAnswerAsync(SaveAttemptAnswerCommand command, CancellationToken cancellationToken = default)
        => lifecycleService.SaveAnswerAsync(command, cancellationToken);

    public Task<AttemptSnapshot?> SubmitAsync(Guid attemptId, CancellationToken cancellationToken = default)
        => lifecycleService.SubmitAsync(attemptId, cancellationToken);
}
