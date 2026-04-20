#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_PATH="$ROOT_DIR/contracts/openapi/exam-runner.openapi.json"
API_URL="http://127.0.0.1:5199"

cleanup() {
  if [[ -n "${API_PID:-}" ]] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" >/dev/null 2>&1 || true
    wait "$API_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

ASPNETCORE_ENVIRONMENT=Development dotnet run \
  --project "$ROOT_DIR/apps/api/src/ExamRunner.Api" \
  --urls "$API_URL" \
  >"$ROOT_DIR/.openapi-api.log" 2>&1 &
API_PID=$!

for _ in {1..60}; do
  if curl --silent --show-error --fail "$API_URL/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

curl --silent --show-error --fail \
  "$API_URL/swagger/v1/swagger.json" \
  --output "$OUTPUT_PATH"

echo "OpenAPI exportado em: $OUTPUT_PATH"
