using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExamRunner.Infrastructure.Data.Migrations;

[DbContext(typeof(global::ExamRunner.Infrastructure.Data.ExamRunnerDbContext))]
[Migration("20260420153000")]
public partial class InitialExamEngineModel : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "MaxReconnectAttempts",
            table: "Exams",
            type: "INTEGER",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<bool>(
            name: "ReconnectEnabled",
            table: "Exams",
            type: "INTEGER",
            nullable: false,
            defaultValue: false);

        migrationBuilder.AddColumn<int>(
            name: "ReconnectGracePeriodSeconds",
            table: "Exams",
            type: "INTEGER",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<int>(
            name: "DisplayOrder",
            table: "ExamSections",
            type: "INTEGER",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.CreateTable(
            name: "Attempts",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "TEXT", nullable: false),
                ExamId = table.Column<Guid>(type: "TEXT", nullable: false),
                StartedAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                DeadlineAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                LastSeenAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                SubmittedAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                Status = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Attempts", x => x.Id);
                table.ForeignKey(
                    name: "FK_Attempts_Exams_ExamId",
                    column: x => x.ExamId,
                    principalTable: "Exams",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateTable(
            name: "Questions",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "TEXT", nullable: false),
                SectionId = table.Column<Guid>(type: "TEXT", nullable: false),
                QuestionCode = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                Prompt = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: false),
                ExplanationSummary = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                ExplanationDetails = table.Column<string>(type: "TEXT", maxLength: 8000, nullable: false),
                Topic = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                Difficulty = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                Weight = table.Column<decimal>(type: "TEXT", precision: 6, scale: 2, nullable: false),
                DisplayOrder = table.Column<int>(type: "INTEGER", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Questions", x => x.Id);
                table.ForeignKey(
                    name: "FK_Questions_ExamSections_SectionId",
                    column: x => x.SectionId,
                    principalTable: "ExamSections",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "AttemptResults",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "TEXT", nullable: false),
                AttemptId = table.Column<Guid>(type: "TEXT", nullable: false),
                TotalQuestions = table.Column<int>(type: "INTEGER", nullable: false),
                CorrectAnswers = table.Column<int>(type: "INTEGER", nullable: false),
                IncorrectAnswers = table.Column<int>(type: "INTEGER", nullable: false),
                UnansweredQuestions = table.Column<int>(type: "INTEGER", nullable: false),
                ScorePercentage = table.Column<decimal>(type: "TEXT", precision: 5, scale: 2, nullable: false),
                Passed = table.Column<bool>(type: "INTEGER", nullable: false),
                EvaluatedAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_AttemptResults", x => x.Id);
                table.ForeignKey(
                    name: "FK_AttemptResults_Attempts_AttemptId",
                    column: x => x.AttemptId,
                    principalTable: "Attempts",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "ReconnectEvents",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "TEXT", nullable: false),
                AttemptId = table.Column<Guid>(type: "TEXT", nullable: false),
                SequenceNumber = table.Column<int>(type: "INTEGER", nullable: false),
                DisconnectedAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                ReconnectedAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                OfflineDurationSeconds = table.Column<int>(type: "INTEGER", nullable: false),
                GracePeriodRespected = table.Column<bool>(type: "INTEGER", nullable: false),
                FinalizedAttempt = table.Column<bool>(type: "INTEGER", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_ReconnectEvents", x => x.Id);
                table.ForeignKey(
                    name: "FK_ReconnectEvents_Attempts_AttemptId",
                    column: x => x.AttemptId,
                    principalTable: "Attempts",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "QuestionOptions",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "TEXT", nullable: false),
                QuestionId = table.Column<Guid>(type: "TEXT", nullable: false),
                OptionCode = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                Text = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: false),
                IsCorrect = table.Column<bool>(type: "INTEGER", nullable: false),
                DisplayOrder = table.Column<int>(type: "INTEGER", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_QuestionOptions", x => x.Id);
                table.ForeignKey(
                    name: "FK_QuestionOptions_Questions_QuestionId",
                    column: x => x.QuestionId,
                    principalTable: "Questions",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "AttemptAnswers",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "TEXT", nullable: false),
                AttemptId = table.Column<Guid>(type: "TEXT", nullable: false),
                QuestionId = table.Column<Guid>(type: "TEXT", nullable: false),
                SelectedOptionId = table.Column<Guid>(type: "TEXT", nullable: true),
                UpdatedAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_AttemptAnswers", x => x.Id);
                table.ForeignKey(
                    name: "FK_AttemptAnswers_Attempts_AttemptId",
                    column: x => x.AttemptId,
                    principalTable: "Attempts",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_AttemptAnswers_QuestionOptions_SelectedOptionId",
                    column: x => x.SelectedOptionId,
                    principalTable: "QuestionOptions",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "FK_AttemptAnswers_Questions_QuestionId",
                    column: x => x.QuestionId,
                    principalTable: "Questions",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "IX_AttemptAnswers_AttemptId_QuestionId",
            table: "AttemptAnswers",
            columns: new[] { "AttemptId", "QuestionId" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_AttemptAnswers_QuestionId",
            table: "AttemptAnswers",
            column: "QuestionId");

        migrationBuilder.CreateIndex(
            name: "IX_AttemptAnswers_SelectedOptionId",
            table: "AttemptAnswers",
            column: "SelectedOptionId");

        migrationBuilder.CreateIndex(
            name: "IX_AttemptResults_AttemptId",
            table: "AttemptResults",
            column: "AttemptId",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_Attempts_ExamId",
            table: "Attempts",
            column: "ExamId");

        migrationBuilder.CreateIndex(
            name: "IX_QuestionOptions_QuestionId_OptionCode",
            table: "QuestionOptions",
            columns: new[] { "QuestionId", "OptionCode" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_Questions_SectionId_QuestionCode",
            table: "Questions",
            columns: new[] { "SectionId", "QuestionCode" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_ReconnectEvents_AttemptId_SequenceNumber",
            table: "ReconnectEvents",
            columns: new[] { "AttemptId", "SequenceNumber" },
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "AttemptAnswers");
        migrationBuilder.DropTable(name: "AttemptResults");
        migrationBuilder.DropTable(name: "ReconnectEvents");
        migrationBuilder.DropTable(name: "QuestionOptions");
        migrationBuilder.DropTable(name: "Attempts");
        migrationBuilder.DropTable(name: "Questions");

        migrationBuilder.DropColumn(name: "MaxReconnectAttempts", table: "Exams");
        migrationBuilder.DropColumn(name: "ReconnectEnabled", table: "Exams");
        migrationBuilder.DropColumn(name: "ReconnectGracePeriodSeconds", table: "Exams");
        migrationBuilder.DropColumn(name: "DisplayOrder", table: "ExamSections");
    }
}
