using ExamRunner.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamRunner.Infrastructure.Data.Configurations;

public sealed class ExamSectionEntityConfiguration : IEntityTypeConfiguration<ExamSectionEntity>
{
    public void Configure(EntityTypeBuilder<ExamSectionEntity> builder)
    {
        builder.ToTable("ExamSections");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.SectionCode)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.Title)
            .HasMaxLength(200)
            .IsRequired();

        builder.HasIndex(x => new { x.ExamId, x.SectionCode })
            .IsUnique();

        builder.HasMany(x => x.Questions)
            .WithOne(x => x.Section)
            .HasForeignKey(x => x.SectionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
