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
pnpm contracts:generate
```

> Nesta etapa os pacotes possuem scripts placeholder para validar o setup do workspace.

## Docker Compose (desenvolvimento)

O arquivo `docker-compose.yml` na raiz sobe os dois serviços necessários para desenvolvimento local com um comando.

### Serviços e portas

- `web` (Vite): `http://localhost:5173`
- `api` (ASP.NET Core): `http://localhost:8080`
- `health` da API: `http://localhost:8080/api/health`

### Comunicação entre serviços

- O serviço `web` recebe `VITE_API_BASE_URL=http://api:8080`.
- O Vite usa proxy para `/health`, encaminhando para o serviço `api` na rede interna do Compose.
- Assim, o frontend no navegador consegue consultar saúde do backend sem problema de CORS.

### Volumes

- `./:/workspace`: bind mount do código-fonte para hot reload.
- `web-node-modules`: volume nomeado para `node_modules`.
- `web-pnpm-store`: cache do store do pnpm.
- `api-nuget`: cache de pacotes NuGet.

### Comandos usados

Subir ambiente (com build):

```bash
docker compose up --build
```

Ou via script da raiz:

```bash
pnpm compose:up
```

Derrubar ambiente:

```bash
docker compose down
```

Ou via script:

```bash
pnpm compose:down
pnpm contracts:generate
```

## Objetivo desta etapa (Task 0.1)

- [x] workspace funcional
- [x] install na raiz funcionando
- [x] estrutura inicial criada
- [x] README inicial criado

## Contratos HTTP compartilhados (OpenAPI -> frontend)

- Fonte do contrato OpenAPI: `contracts/openapi/exam-runner.openapi.json`.
- Exportação do contrato via backend: `pnpm api:openapi` (script `scripts/export-openapi.sh`).
- Geração do client/tipos TypeScript: `pnpm web:api:generate` (gera `apps/web/src/generated/api-contract.ts`).
- Pipeline completo: `pnpm contracts:generate`.

Essa abordagem evita duplicação manual de contratos HTTP entre .NET e React/TypeScript.
