using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExamRunner.Infrastructure.Data.Migrations;

[DbContext(typeof(global::ExamRunner.Infrastructure.Data.ExamRunnerDbContext))]
[Migration("20260422110000")]
public partial class AddExamEditorialStatus : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "EditorialStatus",
            table: "Exams",
            type: "TEXT",
            maxLength: 32,
            nullable: false,
            defaultValue: "draft");

        migrationBuilder.AddColumn<DateTimeOffset>(
            name: "PublishedAtUtc",
            table: "Exams",
            type: "TEXT",
            nullable: true);

        migrationBuilder.Sql(
            """
            UPDATE Exams
            SET EditorialStatus = 'published',
                PublishedAtUtc = CURRENT_TIMESTAMP
            WHERE EXISTS (
                SELECT 1
                FROM Attempts
                WHERE Attempts.ExamId = Exams.Id
                  AND Attempts.SubmittedAtUtc IS NOT NULL
            );
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "EditorialStatus",
            table: "Exams");

        migrationBuilder.DropColumn(
            name: "PublishedAtUtc",
            table: "Exams");
    }
}
