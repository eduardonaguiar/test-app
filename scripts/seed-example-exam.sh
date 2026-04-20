#!/usr/bin/env bash
set -euo pipefail

EXAMPLE_FILE="contracts/exam-schema/examples/exam-basico-curto.json"

if [[ ! -f "$EXAMPLE_FILE" ]]; then
  echo "Arquivo de exemplo não encontrado: $EXAMPLE_FILE" >&2
  exit 1
fi

dotnet run --project apps/api/src/ExamRunner.Api -- --seed-example "$EXAMPLE_FILE"
