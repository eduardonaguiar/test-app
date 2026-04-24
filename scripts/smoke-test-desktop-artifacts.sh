#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESKTOP_PACKAGE_JSON="${ROOT_DIR}/apps/desktop/package.json"
INSTALLER_OUTPUT_DIR="${ROOT_DIR}/dist/desktop/windows"
FORGE_OUTPUT_DIR="${ROOT_DIR}/apps/desktop/out/make"
BACKEND_EXE_PATH="${ROOT_DIR}/apps/api/publish/win-x64/ExamRunner.Api.exe"
REACT_BUILD_DIR="${ROOT_DIR}/apps/desktop/web-dist"
REACT_INDEX_PATH="${REACT_BUILD_DIR}/index.html"

RUN_HEALTH_CHECK=false
HEALTH_PORT=18080
HEALTH_TIMEOUT_SECONDS=15
BACKEND_PID=""

usage() {
  cat <<'USAGE'
Uso: bash scripts/smoke-test-desktop-artifacts.sh [opções]

Valida artefatos mínimos de uma build desktop:
  - instalador Windows
  - backend empacotado (.exe)
  - build React copiado para o desktop (web-dist)

Opções:
  --health-check            Executa o backend publicado e chama /health (opcional)
  --health-port <porta>     Porta usada no health check (padrão: 18080)
  --health-timeout <seg>    Timeout do health check em segundos (padrão: 15)
  -h, --help                Exibe esta ajuda
USAGE
}

fail() {
  echo "[SMOKE][ERRO] $1" >&2
  exit 1
}

pass() {
  echo "[SMOKE][OK] $1"
}

cleanup() {
  if [[ -n "${BACKEND_PID}" ]] && kill -0 "${BACKEND_PID}" >/dev/null 2>&1; then
    kill "${BACKEND_PID}" >/dev/null 2>&1 || true
    wait "${BACKEND_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

while [[ $# -gt 0 ]]; do
  case "$1" in
    --health-check)
      RUN_HEALTH_CHECK=true
      ;;
    --health-port)
      shift
      [[ $# -gt 0 ]] || fail "Informe o valor de --health-port."
      HEALTH_PORT="$1"
      ;;
    --health-timeout)
      shift
      [[ $# -gt 0 ]] || fail "Informe o valor de --health-timeout."
      HEALTH_TIMEOUT_SECONDS="$1"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "Opção inválida: $1. Use --help para ver as opções."
      ;;
  esac
  shift
done

[[ -f "${DESKTOP_PACKAGE_JSON}" ]] || fail "Arquivo não encontrado: ${DESKTOP_PACKAGE_JSON}"

DESKTOP_VERSION="$(node -p "require('${DESKTOP_PACKAGE_JSON}').version")"
EXPECTED_INSTALLER_PATH="${INSTALLER_OUTPUT_DIR}/ExamRunnerDesktop-${DESKTOP_VERSION}-win-x64-setup.exe"

if [[ -f "${EXPECTED_INSTALLER_PATH}" ]]; then
  pass "Instalador encontrado em ${EXPECTED_INSTALLER_PATH}"
else
  FOUND_INSTALLER_PATH="$(find "${FORGE_OUTPUT_DIR}" -type f -name '*Setup.exe' | head -n 1 || true)"
  if [[ -n "${FOUND_INSTALLER_PATH}" ]]; then
    pass "Instalador encontrado no output do Electron Forge: ${FOUND_INSTALLER_PATH}"
  else
    fail "Instalador não encontrado. Esperado em '${EXPECTED_INSTALLER_PATH}' ou em '${FORGE_OUTPUT_DIR}'."
  fi
fi

[[ -f "${BACKEND_EXE_PATH}" ]] || fail "Backend publicado não encontrado: ${BACKEND_EXE_PATH}"
pass "Backend empacotado encontrado em ${BACKEND_EXE_PATH}"

[[ -d "${REACT_BUILD_DIR}" ]] || fail "Diretório do build React não encontrado: ${REACT_BUILD_DIR}"
[[ -f "${REACT_INDEX_PATH}" ]] || fail "Build React incompleto. Arquivo ausente: ${REACT_INDEX_PATH}"
pass "Build React encontrado em ${REACT_BUILD_DIR}"

if [[ "${RUN_HEALTH_CHECK}" == true ]]; then
  if ! command -v curl >/dev/null 2>&1; then
    fail "curl é obrigatório para --health-check."
  fi

  if ! command -v timeout >/dev/null 2>&1; then
    fail "timeout é obrigatório para --health-check."
  fi

  if ! command -v file >/dev/null 2>&1; then
    fail "comando 'file' é obrigatório para --health-check."
  fi

  FILE_OUTPUT="$(file -b "${BACKEND_EXE_PATH}" || true)"
  OS_NAME="$(uname -s)"
  IS_WINDOWS_SHELL=false
  case "${OS_NAME}" in
    MINGW*|CYGWIN*|MSYS*)
      IS_WINDOWS_SHELL=true
      ;;
  esac

  if [[ "${FILE_OUTPUT}" == *"PE32"* ]] && [[ "${IS_WINDOWS_SHELL}" != true ]]; then
    fail "Health check não pode rodar neste ambiente: o backend publicado é Windows-only (${FILE_OUTPUT})."
  fi

  HEALTH_URL="http://127.0.0.1:${HEALTH_PORT}/health"
  pass "Executando backend publicado para validar ${HEALTH_URL}"

  ASPNETCORE_URLS="http://127.0.0.1:${HEALTH_PORT}" "${BACKEND_EXE_PATH}" >/tmp/exam-runner-smoke-backend.log 2>&1 &
  BACKEND_PID=$!

  DEADLINE=$((SECONDS + HEALTH_TIMEOUT_SECONDS))
  HEALTH_OK=false
  while (( SECONDS < DEADLINE )); do
    if curl --silent --fail --max-time 2 "${HEALTH_URL}" >/dev/null; then
      HEALTH_OK=true
      break
    fi
    sleep 1
  done

  if [[ "${HEALTH_OK}" != true ]]; then
    fail "Health check falhou. Endpoint '${HEALTH_URL}' não respondeu em ${HEALTH_TIMEOUT_SECONDS}s. Log: /tmp/exam-runner-smoke-backend.log"
  fi

  pass "Health check concluído com sucesso (${HEALTH_URL})"
fi

pass "Smoke test concluído com sucesso."
