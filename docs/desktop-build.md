# Build do Executável Windows (Desktop)

Este documento descreve, de ponta a ponta, como gerar o instalador Windows da aplicação desktop local-first do Exam Runner.

## 1) Objetivo da distribuição desktop

A distribuição desktop existe para entregar uma experiência **offline-first local** com instalação simples para usuário final de Windows, incluindo:

- frontend React empacotado em Electron;
- backend .NET executando como sidecar local;
- persistência em SQLite no perfil do usuário;
- execução sem depender de infraestrutura cloud.

Com isso, qualquer dev consegue gerar um instalador `.exe` reprodutível para distribuição interna/testes.

---

## 2) Arquitetura de empacotamento

A aplicação desktop segue o modelo:

- **Shell**: Electron (`apps/desktop`)
- **UI**: React + Vite (`apps/web`), copiado para `apps/desktop/web-dist`
- **Backend sidecar**: ASP.NET Core .NET 8 publicado para `win-x64` em `apps/api/publish/win-x64`
- **Banco local**: SQLite criado em AppData do usuário

### Fluxo de runtime

1. O Electron inicia.
2. O processo principal sobe o backend sidecar local (`ExamRunner.Api.exe`).
3. O frontend React chama a API local por HTTP (localhost).
4. Dados e logs são gravados em `%APPDATA%\ExamRunner`.

### Fluxo de build/release

1. Build do web app em modo desktop.
2. Cópia de `apps/web/dist` para `apps/desktop/web-dist`.
3. `dotnet publish` self-contained da API para `win-x64`.
4. `electron-forge make` gera instalador Windows.

---

## 3) Pré-requisitos

> Execute todos os comandos a partir da **raiz do monorepo** (`/workspace/test-app`).

### Ferramentas obrigatórias

- `pnpm` (workspace manager)
- `node` (usado pelo build do frontend e Electron Forge)
- `.NET 8 SDK` (`dotnet`)
- Ambiente capaz de gerar pacote Windows com Electron Forge (para setup `.exe`)

### Verificação rápida

```bash
pnpm -v
node -v
dotnet --version
```

### Dependências do monorepo

```bash
pnpm install
dotnet restore apps/api/ExamRunner.sln
```

---

## 4) Comandos de build

### 4.1 Build do frontend para desktop

```bash
pnpm desktop:web:prepare
```

Esse comando executa:

- build do `apps/web` em modo desktop (`--mode desktop`, base relativa);
- cópia dos estáticos para `apps/desktop/web-dist`.

### 4.2 Publish do backend sidecar .NET (Windows x64)

```bash
pnpm api:publish:win-x64
```

Internamente, o publish usa:

- `-c Release`
- `-r win-x64`
- `--self-contained true`
- `PublishSingleFile=true`

### 4.3 Preparar todos os artefatos desktop

```bash
pnpm desktop:artifacts:prepare
```

Equivale a rodar em sequência:

1. `pnpm desktop:web:prepare`
2. `pnpm api:publish:win-x64`

---

## 5) Comandos de package/make

### 5.1 Package (sem instalador)

```bash
pnpm desktop:package
```

Gera pacote do app via Electron Forge (`package`), útil para validação local do app empacotado.

### 5.2 Make (gera instalador/artefatos de distribuição)

```bash
pnpm desktop:make
```

Roda `electron-forge make` após preparar artefatos web + sidecar.

### 5.3 Pipeline único recomendado (aceite)

```bash
pnpm desktop:installer:win
```

Este é o comando **recomendado para devs** porque automatiza o fluxo completo:

1. build React desktop;
2. cópia para `web-dist`;
3. publish da API `win-x64`;
4. geração do setup Windows;
5. cópia do setup final para `dist/desktop/windows` com nome versionado.

---

## 6) Local dos artefatos gerados

### Artefatos intermediários

- Web build original: `apps/web/dist`
- Web build consumido pelo desktop: `apps/desktop/web-dist`
- Backend sidecar publicado: `apps/api/publish/win-x64`
- Saída bruta do Forge make: `apps/desktop/out/make`

### Artefato final para distribuição

- Instalador final versionado:

```text
dist/desktop/windows/ExamRunnerDesktop-<versão>-win-x64-setup.exe
```

Exemplo com versão atual do pacote desktop (`0.1.0`):

```text
dist/desktop/windows/ExamRunnerDesktop-0.1.0-win-x64-setup.exe
```

---

## 7) Local de dados e logs no Windows

O app **não** grava dados em `Program Files`. Tudo vai para AppData do usuário:

- Raiz de dados:
  - `%APPDATA%\ExamRunner`
- Banco SQLite:
  - `%APPDATA%\ExamRunner\data\exam-runner.db`
- Logs:
  - `%APPDATA%\ExamRunner\logs\electron-main-<ISO_TIMESTAMP>.log`
  - `%APPDATA%\ExamRunner\logs\backend-sidecar-<ISO_TIMESTAMP>.log`

O backend sidecar recebe no boot:

- `Desktop__Enabled=true`
- `Desktop__DatabasePath=<caminho sqlite em AppData>`

---

## 8) Troubleshooting comum

### 8.1 `pnpm desktop:installer:win` falha por comando ausente

### Sintoma

Erro indicando falta de `pnpm`, `node` ou `dotnet`.

### Ação

- Validar versões com:

```bash
pnpm -v
node -v
dotnet --version
```

- Instalar ferramenta ausente e repetir.

### 8.2 Instalador não encontrado no final do pipeline

### Sintoma

Script reporta que `Setup.exe` não foi encontrado em `apps/desktop/out/make`.

### Ação

1. Reexecutar:

```bash
pnpm desktop:make
```

2. Verificar estrutura de saída:

```bash
rg --files apps/desktop/out/make
```

3. Se o maker Squirrel não gerar setup no ambiente atual, executar em ambiente Windows compatível com geração de instalador.

### 8.3 Tela de erro: web build não encontrado

### Sintoma

Desktop abre mensagem de que `web-dist/index.html` está ausente.

### Ação

```bash
pnpm desktop:web:prepare
```

Depois, repacotar/regerar o instalador.

### 8.4 Tela de erro: backend sidecar não encontrado no app instalado

### Sintoma

Mensagem de “Artefatos obrigatórios não encontrados” após abrir o app instalado.

### Ação

1. Garantir publish da API:

```bash
pnpm api:publish:win-x64
```

2. Regerar instalador completo:

```bash
pnpm desktop:installer:win
```

3. Conferir se `apps/api/publish/win-x64/ExamRunner.Api.exe` existe antes do `make`.

### 8.5 Backend não sobe (timeout no healthcheck)

### Sintoma

App mostra erro de inicialização do backend (`/health` timeout).

### Ação

- Verificar se a porta local (default `8080`) está livre.
- Se necessário, iniciar app com outra porta:

```bash
EXAM_RUNNER_API_PORT=8081 pnpm dev:desktop
```

- Analisar logs em `%APPDATA%\ExamRunner\logs\`.

### 8.6 Build web quebra por dependências

### Sintoma

Falha durante build do `apps/web`.

### Ação

```bash
pnpm install
pnpm --filter @exam-runner/web build --mode desktop
```

Corrigir erros reportados e repetir pipeline.

---

## 9) Limitações conhecidas

- O pipeline de instalador documentado é para **Windows x64** (`win-x64`), sem alvo ARM neste fluxo.
- O `extraResource` do Electron está apontado para `apps/api/publish/win-x64`; sem esse publish o app instalado não sobe o backend.
- O backend sidecar usa porta local (`8080` por padrão); conflito de porta impede inicialização até correção.
- Não há menção neste fluxo a assinatura de código (code signing) nem auto-update; é um empacotamento para distribuição local/manual.
- O script de build procura instalador Squirrel `*Setup.exe`; se o maker mudar output naming, o script precisará ajuste.

---

## 10) Procedimento recomendado (rápido)

Para cumprir o critério de aceite com menor atrito, use exatamente:

```bash
pnpm install
dotnet restore apps/api/ExamRunner.sln
pnpm desktop:installer:win
```

Ao final, validar presença do instalador em:

```text
dist/desktop/windows/ExamRunnerDesktop-<versão>-win-x64-setup.exe
```

Se esse arquivo existir, o build de distribuição desktop Windows foi concluído com sucesso.
