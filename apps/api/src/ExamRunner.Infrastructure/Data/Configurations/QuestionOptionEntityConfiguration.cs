using ExamRunner.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamRunner.Infrastructure.Data.Configurations;

public sealed class QuestionOptionEntityConfiguration : IEntityTypeConfiguration<QuestionOptionEntity>
{
    public void Configure(EntityTypeBuilder<QuestionOptionEntity> builder)
    {
        builder.ToTable("QuestionOptions");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.OptionCode)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(x => x.Text)
            .HasMaxLength(2_000)
            .IsRequired();

        builder.HasIndex(x => new { x.QuestionId, x.OptionCode })
            .IsUnique();
    }
}
