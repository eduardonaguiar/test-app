# @exam-runner/desktop

Aplicativo desktop (Electron + Vite) do monorepo.

## Dependências

As dependências do desktop ficam isoladas em `apps/desktop/package.json`.
Isso mantém o escopo do app claro e evita acoplamento com `apps/web`.

## Fluxo de carregamento da UI React

O `main` do Electron sempre prioriza a UI React de `apps/web`:

- **Desenvolvimento**: tenta carregar o Vite dev server do web app (`EXAM_RUNNER_WEB_DEV_SERVER_URL`, `VITE_WEB_DEV_SERVER_URL` ou `http://localhost:5173`).
- **Fallback local em desenvolvimento**: se o servidor web não estiver disponível, usa o renderer de desenvolvimento do próprio Electron (`MAIN_WINDOW_VITE_DEV_SERVER_URL`).
- **Produção**: carrega os arquivos estáticos em `web-dist/index.html`.
- **Erro explícito**: se o build estático não existir, a janela mostra uma mensagem indicando o caminho esperado e o comando para preparar os arquivos.

A configuração de segurança do renderer permanece com `contextIsolation: true`, preload dedicado e `nodeIntegration: false`.

## Hardening básico de segurança (Electron)

Decisões aplicadas no processo principal/preload:

- `contextIsolation: true` e `nodeIntegration: false` no `BrowserWindow`;
- `sandbox: true` habilitado no renderer;
- preload mínimo via `contextBridge`, expondo apenas `window.desktopRuntimeConfig` (`apiBaseUrl` + `isDesktop`);
- porta da API enviada para o preload por `additionalArguments` (evitando leitura direta de variáveis de ambiente no renderer);
- bloqueio de navegação inesperada com `will-navigate` (somente `file:`, `data:` e localhost no fluxo previsto);
- `window.open` sempre negado no renderer, com abertura externa explícita somente para `http/https` via `shell.openExternal`;
- permissões do Chromium negadas por padrão (`setPermissionRequestHandler` e `setPermissionCheckHandler`);
- sem exposição de APIs de filesystem ao renderer.

Resultado esperado:

- renderer sem acesso direto a Node.js;
- superfície de API do preload reduzida ao mínimo necessário para integração com o backend local.

## Fluxo de build para produção

No empacotamento, o desktop usa o bundle estático gerado pelo `apps/web`.
O comando raiz `desktop:web:prepare` executa:

1. `apps/web` build com base relativa (`VITE_WEB_BASE_PATH=./`);
2. cópia do output para `apps/desktop/web-dist`.

Para o pacote final instalado, o Electron Forge copia como `extraResource`:

- `apps/desktop/web-dist` (frontend estático);
- `apps/api/publish/win-x64` (backend sidecar publicado, com runtime/config).

O comando raiz `desktop:artifacts:prepare` garante os dois artefatos antes de `desktop:package` e `desktop:make`.

## Instalador Windows em um único comando

Pipeline completo a partir da raiz do monorepo:

```bash
pnpm desktop:installer:win
```

Esse comando chama `scripts/build-desktop-installer-win.sh` e executa:

1. build do `apps/web` em modo desktop;
2. cópia dos arquivos estáticos para `apps/desktop/web-dist`;
3. `dotnet publish` da API em `apps/api/publish/win-x64`;
4. `electron-forge make --platform win32 --arch x64`.

Pré-requisitos:

- `pnpm`;
- `.NET 8 SDK`;
- ambiente com toolchain para gerar instalador Windows.

Saída final previsível:

- `dist/desktop/windows/ExamRunnerDesktop-<versão>-win-x64-setup.exe`

## Comandos locais (a partir da raiz)

```bash
pnpm dev:desktop
pnpm desktop:web:prepare
pnpm desktop:package
pnpm desktop:make
```

## Comandos no próprio pacote

```bash
pnpm --filter @exam-runner/desktop dev
pnpm --filter @exam-runner/desktop package
pnpm --filter @exam-runner/desktop make
```


## Persistência local no Windows (AppData)

Ao iniciar o backend sidecar, o Electron sempre resolve um diretório de dados no AppData do usuário:

- raiz de dados: `%APPDATA%\ExamRunner`
- SQLite: `%APPDATA%\ExamRunner\data\exam-runner.db`
- logs: `%APPDATA%\ExamRunner\logs\`
  - main process: `electron-main-<ISO_TIMESTAMP>.log`
  - backend sidecar: `backend-sidecar-<ISO_TIMESTAMP>.log`

Com isso:

- a aplicação não grava banco/arquivos em `Program Files` nem na pasta de instalação;
- reinstalações não removem os dados locais por padrão, pois eles ficam fora do diretório do app;
- o backend .NET recebe esse caminho no boot via `Desktop__Enabled=true` e `Desktop__DatabasePath=<caminho-resolvido-no-AppData>`.
- erros de inicialização do backend ficam registrados no log de backend da execução atual.

## Como localizar os logs (usuário/desenvolvedor)

O diretório de logs é sempre resolvido pelo `app.getPath('appData')` do Electron:

- Windows: `%APPDATA%\ExamRunner\logs\`
- Linux: `~/.config/ExamRunner/logs/`
- macOS: `~/Library/Application Support/ExamRunner/logs/`

Ao abrir o app, um novo par de arquivos é criado (main + backend), facilitando rastrear cada execução separadamente.
