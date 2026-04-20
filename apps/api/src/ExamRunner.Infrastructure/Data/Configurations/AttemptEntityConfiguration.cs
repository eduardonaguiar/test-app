using ExamRunner.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamRunner.Infrastructure.Data.Configurations;

public sealed class AttemptEntityConfiguration : IEntityTypeConfiguration<AttemptEntity>
{
    public void Configure(EntityTypeBuilder<AttemptEntity> builder)
    {
        builder.ToTable("Attempts");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Status)
            .HasMaxLength(30)
            .IsRequired();

        builder.HasIndex(x => x.ExamId);

        builder.HasMany(x => x.Answers)
            .WithOne(x => x.Attempt)
            .HasForeignKey(x => x.AttemptId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Result)
            .WithOne(x => x.Attempt)
            .HasForeignKey<AttemptResultEntity>(x => x.AttemptId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(x => x.ReconnectEvents)
            .WithOne(x => x.Attempt)
            .HasForeignKey(x => x.AttemptId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
