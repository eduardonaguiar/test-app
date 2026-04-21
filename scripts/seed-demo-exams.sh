#!/usr/bin/env bash
set -euo pipefail

DEMO_DIR="contracts/exam-schema/examples/demo"

if [[ ! -d "$DEMO_DIR" ]]; then
  echo "Diretório de simulados demo não encontrado: $DEMO_DIR" >&2
  exit 1
fi

dotnet run --project apps/api/src/ExamRunner.Api -- --seed-demo "$DEMO_DIR"
