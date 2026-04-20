# Exam Runner Monorepo

Estrutura inicial do monorepo para uma aplicação local-first de simulados.

## Estrutura

```text
.
├── apps/
│   ├── api/
│   │   ├── src/
│   │   └── tests/
│   └── web/
├── docs/
│   └── adr/
├── infra/
│   └── docker/
└── packages/
    ├── exam-schema/
    ├── shared-types/
    └── ui/
```

## Pré-requisitos

- Node.js 20+
- pnpm 10+
- .NET 8 SDK
- Docker + Docker Compose (opcional)

## Comandos de raiz

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
pnpm lint
pnpm typecheck
pnpm api:build
pnpm api:test
pnpm compose:up
pnpm compose:down
```

> Nesta etapa os pacotes possuem scripts placeholder para validar o setup do workspace.

## Docker (desenvolvimento)

Os serviços de desenvolvimento foram configurados para fluxo iterativo com bind mount:

- `apps/web/Dockerfile`: container Node + pnpm para Vite com hot reload.
- `apps/api/Dockerfile`: container .NET SDK para `dotnet watch`.
- `infra/docker/docker-compose.yml`: sobe `web` (porta `5173`) e `api` (porta `8080`) com volumes persistentes para cache de dependências.

Subir ambiente:

```bash
pnpm compose:up
```

Derrubar ambiente:

```bash
pnpm compose:down
```

## Objetivo desta etapa (Task 0.1)

- [x] workspace funcional
- [x] install na raiz funcionando
- [x] estrutura inicial criada
- [x] README inicial criado
