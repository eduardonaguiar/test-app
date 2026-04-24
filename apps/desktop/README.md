# @exam-runner/desktop

Aplicativo desktop (Electron + Vite) do monorepo.

## Dependências

As dependências do desktop ficam isoladas em `apps/desktop/package.json`.
Isso mantém o escopo do app claro e evita acoplamento com `apps/web`.

## Comandos locais (a partir da raiz)

```bash
pnpm dev:desktop
pnpm build:desktop
pnpm make:desktop
```

## Comandos no próprio pacote

```bash
pnpm --filter @exam-runner/desktop dev
pnpm --filter @exam-runner/desktop package
pnpm --filter @exam-runner/desktop make
```
