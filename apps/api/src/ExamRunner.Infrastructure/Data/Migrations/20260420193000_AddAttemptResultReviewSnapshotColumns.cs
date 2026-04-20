using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExamRunner.Infrastructure.Data.Migrations;

public partial class AddAttemptResultReviewSnapshotColumns : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "QuestionReviewsJson",
            table: "AttemptResults",
            type: "TEXT",
            nullable: false,
            defaultValue: "[]");

        migrationBuilder.AddColumn<string>(
            name: "TopicAnalysisJson",
            table: "AttemptResults",
            type: "TEXT",
            nullable: false,
            defaultValue: "[]");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "QuestionReviewsJson",
            table: "AttemptResults");

        migrationBuilder.DropColumn(
            name: "TopicAnalysisJson",
            table: "AttemptResults");
    }
}
