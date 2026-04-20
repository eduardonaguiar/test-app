using ExamRunner.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

#nullable disable

namespace ExamRunner.Infrastructure.Data.Migrations;

[DbContext(typeof(ExamRunnerDbContext))]
partial class ExamRunnerDbContextModelSnapshot : ModelSnapshot
{
    protected override void BuildModel(ModelBuilder modelBuilder)
    {
#pragma warning disable 612, 618
        modelBuilder.HasAnnotation("ProductVersion", "8.0.11");

        modelBuilder.Entity("ExamRunner.Infrastructure.Data.Entities.ExamEntity", b =>
        {
            b.Property<Guid>("Id")
                .ValueGeneratedOnAdd()
                .HasColumnType("TEXT");

            b.Property<string>("Description")
                .IsRequired()
                .HasMaxLength(2000)
                .HasColumnType("TEXT");

            b.Property<int>("DurationMinutes")
                .HasColumnType("INTEGER");

            b.Property<int>("PassingScorePercentage")
                .HasColumnType("INTEGER");

            b.Property<string>("SchemaVersion")
                .IsRequired()
                .HasMaxLength(32)
                .HasColumnType("TEXT");

            b.Property<string>("Title")
                .IsRequired()
                .HasMaxLength(200)
                .HasColumnType("TEXT");

            b.HasKey("Id");

            b.ToTable("Exams", (string)null);
        });

        modelBuilder.Entity("ExamRunner.Infrastructure.Data.Entities.ExamSectionEntity", b =>
        {
            b.Property<Guid>("Id")
                .ValueGeneratedOnAdd()
                .HasColumnType("TEXT");

            b.Property<Guid>("ExamId")
                .HasColumnType("TEXT");

            b.Property<int>("QuestionCount")
                .HasColumnType("INTEGER");

            b.Property<string>("SectionCode")
                .IsRequired()
                .HasMaxLength(100)
                .HasColumnType("TEXT");

            b.Property<string>("Title")
                .IsRequired()
                .HasMaxLength(200)
                .HasColumnType("TEXT");

            b.HasKey("Id");

            b.HasIndex("ExamId", "SectionCode")
                .IsUnique();

            b.ToTable("ExamSections", (string)null);
        });

        modelBuilder.Entity("ExamRunner.Infrastructure.Data.Entities.ExamSectionEntity", b =>
        {
            b.HasOne("ExamRunner.Infrastructure.Data.Entities.ExamEntity", "Exam")
                .WithMany("Sections")
                .HasForeignKey("ExamId")
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();

            b.Navigation("Exam");
        });

        modelBuilder.Entity("ExamRunner.Infrastructure.Data.Entities.ExamEntity", b =>
        {
            b.Navigation("Sections");
        });
#pragma warning restore 612, 618
    }
}
