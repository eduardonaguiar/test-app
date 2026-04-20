#!/usr/bin/env bash
set -euo pipefail

dotnet ef database update \
  --project apps/api/src/ExamRunner.Infrastructure/ExamRunner.Infrastructure.csproj \
  --startup-project apps/api/src/ExamRunner.Api/ExamRunner.Api.csproj
