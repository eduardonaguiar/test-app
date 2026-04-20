using ExamRunner.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamRunner.Infrastructure.Data.Configurations;

public sealed class AttemptAnswerEntityConfiguration : IEntityTypeConfiguration<AttemptAnswerEntity>
{
    public void Configure(EntityTypeBuilder<AttemptAnswerEntity> builder)
    {
        builder.ToTable("AttemptAnswers");

        builder.HasKey(x => x.Id);

        builder.HasIndex(x => new { x.AttemptId, x.QuestionId })
            .IsUnique();

        builder.HasOne(x => x.Question)
            .WithMany(x => x.AttemptAnswers)
            .HasForeignKey(x => x.QuestionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.SelectedOption)
            .WithMany(x => x.AttemptAnswers)
            .HasForeignKey(x => x.SelectedOptionId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
