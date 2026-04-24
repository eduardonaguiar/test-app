#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_PROJECT_PATH="apps/api/src/ExamRunner.Api/ExamRunner.Api.csproj"
OUTPUT_DIR="${ROOT_DIR}/apps/api/publish/win-x64"

cd "${ROOT_DIR}"

dotnet publish "${API_PROJECT_PATH}" \
  -c Release \
  -r win-x64 \
  --self-contained true \
  -p:PublishSingleFile=true \
  -p:IncludeNativeLibrariesForSelfExtract=true \
  -o "${OUTPUT_DIR}"

echo "Publish concluído em: ${OUTPUT_DIR}"
echo "Executável esperado: ${OUTPUT_DIR}/ExamRunner.Api.exe"
