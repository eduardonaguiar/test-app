#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_PACKAGE="@exam-runner/web"
DESKTOP_PACKAGE="@exam-runner/desktop"
API_PUBLISH_SCRIPT="${ROOT_DIR}/scripts/publish-api-win-x64.sh"
DESKTOP_PACKAGE_JSON="${ROOT_DIR}/apps/desktop/package.json"
FORGE_OUT_DIR="${ROOT_DIR}/apps/desktop/out/make"
OUTPUT_DIR="${ROOT_DIR}/dist/desktop/windows"

require_command() {
  local command_name="$1"
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "Erro: comando obrigatório não encontrado: ${command_name}" >&2
    exit 1
  fi
}

if [[ ! -f "${DESKTOP_PACKAGE_JSON}" ]]; then
  echo "Erro: arquivo não encontrado: ${DESKTOP_PACKAGE_JSON}" >&2
  exit 1
fi

require_command pnpm
require_command dotnet
require_command node

DESKTOP_VERSION="$(node -p "require('${DESKTOP_PACKAGE_JSON}').version")"
FINAL_INSTALLER_PATH="${OUTPUT_DIR}/ExamRunnerDesktop-${DESKTOP_VERSION}-win-x64-setup.exe"

cd "${ROOT_DIR}"

echo "[1/4] Build do frontend React (modo desktop)..."
pnpm --filter "${WEB_PACKAGE}" build --mode desktop

echo "[2/4] Preparando artefatos web para o Electron..."
node "${ROOT_DIR}/scripts/prepare-desktop-web.mjs"

echo "[3/4] Publicando backend .NET (win-x64)..."
bash "${API_PUBLISH_SCRIPT}"

echo "[4/4] Gerando instalador com Electron Forge (win32/x64)..."
rm -rf "${FORGE_OUT_DIR}"
pnpm --filter "${DESKTOP_PACKAGE}" exec electron-forge make --platform win32 --arch x64

SETUP_EXE_PATH="$(find "${FORGE_OUT_DIR}" -type f -name '*Setup.exe' | head -n 1)"

if [[ -z "${SETUP_EXE_PATH}" ]]; then
  echo "Erro: instalador Setup.exe não foi encontrado em ${FORGE_OUT_DIR}" >&2
  exit 1
fi

mkdir -p "${OUTPUT_DIR}"
cp "${SETUP_EXE_PATH}" "${FINAL_INSTALLER_PATH}"

echo "Instalador gerado com sucesso."
echo "Origem: ${SETUP_EXE_PATH}"
echo "Saída final: ${FINAL_INSTALLER_PATH}"
