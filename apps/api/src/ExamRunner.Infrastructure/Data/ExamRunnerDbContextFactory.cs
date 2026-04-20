using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace ExamRunner.Infrastructure.Data;

public sealed class ExamRunnerDbContextFactory : IDesignTimeDbContextFactory<ExamRunnerDbContext>
{
    public ExamRunnerDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<ExamRunnerDbContext>();
        optionsBuilder.UseSqlite("Data Source=App_Data/exam-runner.db");

        return new ExamRunnerDbContext(optionsBuilder.Options);
    }
}
