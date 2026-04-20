using ExamRunner.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamRunner.Infrastructure.Data.Configurations;

public sealed class AttemptResultEntityConfiguration : IEntityTypeConfiguration<AttemptResultEntity>
{
    public void Configure(EntityTypeBuilder<AttemptResultEntity> builder)
    {
        builder.ToTable("AttemptResults");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.ScorePercentage)
            .HasPrecision(5, 2);

        builder.HasIndex(x => x.AttemptId)
            .IsUnique();
    }
}
