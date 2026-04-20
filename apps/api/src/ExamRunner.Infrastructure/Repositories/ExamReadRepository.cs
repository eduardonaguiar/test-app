using ExamRunner.Infrastructure.Data;
using ExamRunner.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace ExamRunner.Infrastructure.Repositories;

public sealed class ExamReadRepository(ExamRunnerDbContext dbContext) : IExamReadRepository
{
    public async Task<IReadOnlyList<ExamEntity>> ListAsync(CancellationToken cancellationToken = default)
    {
        return await dbContext.Exams
            .AsNoTracking()
            .OrderBy(x => x.Title)
            .ToListAsync(cancellationToken);
    }

    public async Task<ExamEntity?> GetByIdAsync(Guid examId, CancellationToken cancellationToken = default)
    {
        return await dbContext.Exams
            .AsNoTracking()
            .Include(x => x.Sections.OrderBy(section => section.SectionCode))
            .SingleOrDefaultAsync(x => x.Id == examId, cancellationToken);
    }
}
