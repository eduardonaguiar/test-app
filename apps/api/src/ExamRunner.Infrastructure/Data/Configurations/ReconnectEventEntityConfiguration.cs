using ExamRunner.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamRunner.Infrastructure.Data.Configurations;

public sealed class ReconnectEventEntityConfiguration : IEntityTypeConfiguration<ReconnectEventEntity>
{
    public void Configure(EntityTypeBuilder<ReconnectEventEntity> builder)
    {
        builder.ToTable("ReconnectEvents");

        builder.HasKey(x => x.Id);

        builder.HasIndex(x => new { x.AttemptId, x.SequenceNumber })
            .IsUnique();
    }
}
