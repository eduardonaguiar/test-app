using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExamRunner.Infrastructure.Data.Migrations;

[DbContext(typeof(global::ExamRunner.Infrastructure.Data.ExamRunnerDbContext))]
[Migration("20260420120000")]
public partial class InitialSqlite : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Exams",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "TEXT", nullable: false),
                Title = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                Description = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: false),
                DurationMinutes = table.Column<int>(type: "INTEGER", nullable: false),
                PassingScorePercentage = table.Column<int>(type: "INTEGER", nullable: false),
                SchemaVersion = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Exams", x => x.Id);
            });

        migrationBuilder.CreateTable(
            name: "ExamSections",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "TEXT", nullable: false),
                ExamId = table.Column<Guid>(type: "TEXT", nullable: false),
                SectionCode = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                Title = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                QuestionCount = table.Column<int>(type: "INTEGER", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_ExamSections", x => x.Id);
                table.ForeignKey(
                    name: "FK_ExamSections_Exams_ExamId",
                    column: x => x.ExamId,
                    principalTable: "Exams",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_ExamSections_ExamId_SectionCode",
            table: "ExamSections",
            columns: new[] { "ExamId", "SectionCode" },
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "ExamSections");
        migrationBuilder.DropTable(name: "Exams");
    }
}
