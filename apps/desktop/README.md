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

## Fluxo de build para produção

No empacotamento, o desktop usa o bundle estático gerado pelo `apps/web`.
O comando raiz `desktop:web:prepare` executa:

1. `apps/web` build com base relativa (`VITE_WEB_BASE_PATH=./`);
2. cópia do output para `apps/desktop/web-dist`.

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
