using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExamRunner.Infrastructure.Data.Migrations;

[DbContext(typeof(global::ExamRunner.Infrastructure.Data.ExamRunnerDbContext))]
[Migration("20260420170000")]
public partial class AddReconnectTerminateIfExceeded : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "ReconnectTerminateIfExceeded",
            table: "Exams",
            type: "INTEGER",
            nullable: false,
            defaultValue: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "ReconnectTerminateIfExceeded",
            table: "Exams");
    }
}
