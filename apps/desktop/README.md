# @exam-runner/desktop

Aplicativo desktop (Electron + Vite) do monorepo.

## Dependências

As dependências do desktop ficam isoladas em `apps/desktop/package.json`.
Isso mantém o escopo do app claro e evita acoplamento com `apps/web`.

## Fluxo de build para produção

No empacotamento, o desktop usa o bundle estático gerado pelo `apps/web`.
O comando raiz `desktop:web:prepare` executa:

1. `apps/web` build com base relativa (`VITE_WEB_BASE_PATH=./`);
2. cópia do output para `apps/desktop/web-dist`.

No runtime de produção, `src/main.ts` tenta carregar `web-dist/index.html`.
No desenvolvimento, o Electron continua usando `MAIN_WINDOW_VITE_DEV_SERVER_URL` normalmente.

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
