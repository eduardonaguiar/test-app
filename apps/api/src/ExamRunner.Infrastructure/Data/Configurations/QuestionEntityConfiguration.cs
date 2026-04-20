using ExamRunner.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamRunner.Infrastructure.Data.Configurations;

public sealed class QuestionEntityConfiguration : IEntityTypeConfiguration<QuestionEntity>
{
    public void Configure(EntityTypeBuilder<QuestionEntity> builder)
    {
        builder.ToTable("Questions");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.QuestionCode)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.Prompt)
            .HasMaxLength(4_000)
            .IsRequired();

        builder.Property(x => x.ExplanationSummary)
            .HasMaxLength(1_000)
            .IsRequired();

        builder.Property(x => x.ExplanationDetails)
            .HasMaxLength(8_000)
            .IsRequired();

        builder.Property(x => x.Topic)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(x => x.Difficulty)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(x => x.Weight)
            .HasPrecision(6, 2);

        builder.HasIndex(x => new { x.SectionId, x.QuestionCode })
            .IsUnique();

        builder.HasMany(x => x.Options)
            .WithOne(x => x.Question)
            .HasForeignKey(x => x.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
