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

        modelBuilder.Entity("ExamRunner.Infrastructure.Data.Entities.AttemptAnswerEntity", b =>
        {
            b.Property<Guid>("Id")
                .ValueGeneratedOnAdd()
                .HasColumnType("TEXT");

            b.Property<Guid>("AttemptId")
                .HasColumnType("TEXT");

            b.Property<Guid>("QuestionId")
                .HasColumnType("TEXT");

            b.Property<Guid?>("SelectedOptionId")
                .HasColumnType("TEXT");

            b.Property<DateTimeOffset>("UpdatedAtUtc")
                .HasColumnType("TEXT");

            b.HasKey("Id");

            b.HasIndex("AttemptId", "QuestionId")
                .IsUnique();

            b.HasIndex("QuestionId");

            b.HasIndex("SelectedOptionId");

            b.ToTable("AttemptAnswers", (string)null);
        });

        modelBuilder.Entity("ExamRunner.Infrastructure.Data.Entities.AttemptEntity", b =>
        {
            b.Property<Guid>("Id")
                .ValueGeneratedOnAdd()
                .HasColumnType("TEXT");

            b.Property<DateTimeOffset>("DeadlineAtUtc")
                .HasColumnType("TEXT");

            b.Property<Guid>("ExamId")
                .HasColumnType("TEXT");

            b.Property<DateTimeOffset>("LastSeenAtUtc")
                .HasColumnType("TEXT");

            b.Property<DateTimeOffset>("StartedAtUtc")
                .HasColumnType("TEXT");

            b.Property<string>("Status")
                .IsRequired()
                .HasMaxLength(30)
                .HasColumnType("TEXT");

            b.Property<DateTimeOffset?>("SubmittedAtUtc")
                .HasColumnType("TEXT");

            b.HasKey("Id");

            b.HasIndex("ExamId");

            b.ToTable("Attempts", (string)null);
        });

        modelBuilder.Entity("ExamRunner.Infrastructure.Data.Entities.AttemptResultEntity", b =>
        {
            b.Property<Guid>("Id")
                .ValueGeneratedOnAdd()
                .HasColumnType("TEXT");

            b.Property<Guid>("AttemptId")
                .HasColumnType("TEXT");

            b.Property<int>("CorrectAnswers")
                .HasColumnType("INTEGER");

            b.Property<DateTimeOffset>("EvaluatedAtUtc")
                .HasColumnType("TEXT");

            b.Property<int>("IncorrectAnswers")
                .HasColumnType("INTEGER");

            b.Property<bool>("Passed")
                .HasColumnType("INTEGER");

            b.Property<string>("QuestionReviewsJson")
                .IsRequired()
                .ValueGeneratedOnAdd()
                .HasColumnType("TEXT")
                .HasDefaultValue("[]");

            b.Property<decimal>("ScorePercentage")
                .HasPrecision(5, 2)
                .HasColumnType("TEXT");

            b.Property<int>("TotalQuestions")
                .HasColumnType("INTEGER");

            b.Property<string>("TopicAnalysisJson")
                .IsRequired()
                .ValueGeneratedOnAdd()
                .HasColumnType("TEXT")
                .HasDefaultValue("[]");

            b.Property<int>("UnansweredQuestions")
                .HasColumnType("INTEGER");

            b.HasKey("Id");

            b.HasIndex("AttemptId")
                .IsUnique();

            b.ToTable("AttemptResults", (string)null);
        });

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

            b.Property<int>("MaxReconnectAttempts")
                .ValueGeneratedOnAdd()
                .HasColumnType("INTEGER")
                .HasDefaultValue(0);

            b.Property<int>("PassingScorePercentage")
                .HasColumnType("INTEGER");

            b.Property<bool>("ReconnectEnabled")
                .ValueGeneratedOnAdd()
                .HasColumnType("INTEGER")
                .HasDefaultValue(false);

            b.Property<int>("ReconnectGracePeriodSeconds")
                .ValueGeneratedOnAdd()
                .HasColumnType("INTEGER")
                .HasDefaultValue(0);

            b.Property<bool>("ReconnectTerminateIfExceeded")
                .ValueGeneratedOnAdd()
                .HasColumnType("INTEGER")
                .HasDefaultValue(true);

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

            b.Property<int>("DisplayOrder")
                .HasColumnType("INTEGER");

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

        modelBuilder.Entity("ExamRunner.Infrastructure.Data.Entities.QuestionEntity", b =>
        {
            b.Property<Guid>("Id")
                .ValueGeneratedOnAdd()
                .HasColumnType("TEXT");

            b.Property<int>("DisplayOrder")
                .HasColumnType("INTEGER");

            b.Property<string>("Difficulty")
                .IsRequired()
                .HasMaxLength(50)
                .HasColumnType("TEXT");

            b.Property<string>("ExplanationDetails")
                .IsRequired()
                .HasMaxLength(8000)
                .HasColumnType("TEXT");

            b.Property<string>("ExplanationSummary")
                .IsRequired()
                .HasMaxLength(1000)
                .HasColumnType("TEXT");

            b.Property<string>("Prompt")
                .IsRequired()
                .HasMaxLength(4000)
                .HasColumnType("TEXT");

            b.Property<string>("QuestionCode")
                .IsRequired()
                .HasMaxLength(100)
                .HasColumnType("TEXT");

            b.Property<Guid>("SectionId")
                .HasColumnType("TEXT");

            b.Property<string>("Topic")
                .IsRequired()
                .HasMaxLength(200)
                .HasColumnType("TEXT");

            b.Property<decimal>("Weight")
                .HasPrecision(6, 2)
                .HasColumnType("TEXT");

            b.HasKey("Id");

            b.HasIndex("SectionId", "QuestionCode")
                .IsUnique();

            b.ToTable("Questions", (string)null);
        });

        modelBuilder.Entity("ExamRunner.Infrastructure.Data.Entities.QuestionOptionEntity", b =>
        {
            b.Property<Guid>("Id")
                .ValueGeneratedOnAdd()
                .HasColumnType("TEXT");

            b.Property<int>("DisplayOrder")
                .HasColumnType("INTEGER");

            b.Property<bool>("IsCorrect")
                .HasColumnType("INTEGER");

            b.Property<string>("OptionCode")
                .IsRequired()
                .HasMaxLength(50)
                .HasColumnType("TEXT");

            b.Property<Guid>("QuestionId")
                .HasColumnType("TEXT");

            b.Property<string>("Text")
                .IsRequired()
                .HasMaxLength(2000)
                .HasColumnType("TEXT");

            b.HasKey("Id");

            b.HasIndex("QuestionId", "OptionCode")
                .IsUnique();

            b.ToTable("QuestionOptions", (string)null);
        });

        modelBuilder.Entity("ExamRunner.Infrastructure.Data.Entities.ReconnectEventEntity", b =>
        {
            b.Property<Guid>("Id")
                .ValueGeneratedOnAdd()
                .HasColumnType("TEXT");

            b.Property<Guid>("AttemptId")
                .HasColumnType("TEXT");

            b.Property<DateTimeOffset>("DisconnectedAtUtc")
                .HasColumnType("TEXT");

            b.Property<bool>("FinalizedAttempt")
                .HasColumnType("INTEGER");

            b.Property<bool>("GracePeriodRespected")
                .HasColumnType("INTEGER");

            b.Property<int>("OfflineDurationSeconds")
                .HasColumnType("INTEGER");

            b.Property<DateTimeOffset>("ReconnectedAtUtc")
                .HasColumnType("TEXT");

            b.Property<int>("SequenceNumber")
                .HasColumnType("INTEGER");

            b.HasKey("Id");

            b.HasIndex("AttemptId", "SequenceNumber")
                .IsUnique();

            b.ToTable("ReconnectEvents", (string)null);
        });

        modelBuilder.Entity("ExamRunner.Infrastructure.Data.Entities.AttemptAnswerEntity", b =>
        {
            b.HasOne("ExamRunner.Infrastructure.Data.Entities.AttemptEntity", "Attempt")
                .WithMany("Answers")
                .HasForeignKey("AttemptId")
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();

            b.HasOne("ExamRunner.Infrastructure.Data.Entities.QuestionEntity", "Question")
                .WithMany("AttemptAnswers")
                .HasForeignKey("QuestionId")
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired();

            b.HasOne("ExamRunner.Infrastructure.Data.Entities.QuestionOptionEntity", "SelectedOption")
                .WithMany("AttemptAnswers")
                .HasForeignKey("SelectedOptionId")
                .OnDelete(DeleteBehavior.Restrict);

            b.Navigation("Attempt");

            b.Navigation("Question");

            b.Navigation("SelectedOption");
        });

        modelBuilder.Entity("ExamRunner.Infrastructure.Data.Entities.AttemptEntity", b =>
        {
            b.HasOne("ExamRunner.Infrastructure.Data.Entities.ExamEntity", "Exam")
                .WithMany("Attempts")
                .HasForeignKey("ExamId")
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired();

            b.Navigation("Exam");
        });

        modelBuilder.Entity("ExamRunner.Infrastructure.Data.Entities.AttemptResultEntity", b =>
        {
            b.HasOne("ExamRunner.Infrastructure.Data.Entities.AttemptEntity", "Attempt")
                .WithOne("Result")
                .HasForeignKey("ExamRunner.Infrastructure.Data.Entities.AttemptResultEntity", "AttemptId")
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();

            b.Navigation("Attempt");
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

        modelBuilder.Entity("ExamRunner.Infrastructure.Data.Entities.QuestionEntity", b =>
        {
            b.HasOne("ExamRunner.Infrastructure.Data.Entities.ExamSectionEntity", "Section")
                .WithMany("Questions")
                .HasForeignKey("SectionId")
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();

            b.Navigation("Section");
        });

        modelBuilder.Entity("ExamRunner.Infrastructure.Data.Entities.QuestionOptionEntity", b =>
        {
            b.HasOne("ExamRunner.Infrastructure.Data.Entities.QuestionEntity", "Question")
                .WithMany("Options")
                .HasForeignKey("QuestionId")
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();

            b.Navigation("Question");
        });

        modelBuilder.Entity("ExamRunner.Infrastructure.Data.Entities.ReconnectEventEntity", b =>
        {
            b.HasOne("ExamRunner.Infrastructure.Data.Entities.AttemptEntity", "Attempt")
                .WithMany("ReconnectEvents")
                .HasForeignKey("AttemptId")
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();

            b.Navigation("Attempt");
        });

        modelBuilder.Entity("ExamRunner.Infrastructure.Data.Entities.AttemptEntity", b =>
        {
            b.Navigation("Answers");

            b.Navigation("ReconnectEvents");

            b.Navigation("Result");
        });

        modelBuilder.Entity("ExamRunner.Infrastructure.Data.Entities.ExamEntity", b =>
        {
            b.Navigation("Attempts");

            b.Navigation("Sections");
        });

        modelBuilder.Entity("ExamRunner.Infrastructure.Data.Entities.ExamSectionEntity", b =>
        {
            b.Navigation("Questions");
        });

        modelBuilder.Entity("ExamRunner.Infrastructure.Data.Entities.QuestionEntity", b =>
        {
            b.Navigation("AttemptAnswers");

            b.Navigation("Options");
        });

        modelBuilder.Entity("ExamRunner.Infrastructure.Data.Entities.QuestionOptionEntity", b =>
        {
            b.Navigation("AttemptAnswers");
        });
#pragma warning restore 612, 618
    }
}
