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
- `dotnet-ef` instalado para o script `db:migrate`

## Scripts padronizados (raiz)

Os scripts principais do monorepo foram padronizados para um fluxo previsível:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm format
pnpm test
pnpm typecheck
pnpm compose:up
pnpm compose:down
pnpm db:migrate
pnpm db:seed
```

### O que cada script faz

- `pnpm dev`
  - Sobe o frontend (`dev:web`) e backend (`dev:api`) em modo desenvolvimento.
- `pnpm build`
  - Executa build dos pacotes JS/TS e build da solução .NET.
- `pnpm lint`
  - Executa verificação de formatação (JS e C#) e lint dos pacotes JS/TS.
- `pnpm format`
  - Aplica formatação automática em frontend (ESLint --fix) e backend (`dotnet format`).
- `pnpm test`
  - Executa testes JS/TS e testes backend (.NET).
- `pnpm typecheck`
  - Executa typecheck JS/TS e valida compilação .NET sem restore.
- `pnpm compose:up`
  - Sobe ambiente local com Docker Compose.
- `pnpm compose:down`
  - Derruba o ambiente Docker Compose.
- `pnpm db:migrate`
  - Aplica migrations do EF Core no banco SQLite local.
- `pnpm db:seed`
  - Importa o exemplo `contracts/exam-schema/examples/exam-basico-curto.json` para o banco local (quando vazio).

## Scripts de suporte

```bash
pnpm api:openapi
pnpm web:api:generate
pnpm contracts:generate
```

- `pnpm api:openapi`: exporta OpenAPI da API para `contracts/openapi/exam-runner.openapi.json`.
- `pnpm web:api:generate`: gera client/tipos para o frontend.
- `pnpm contracts:generate`: executa export + geração em sequência.

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
```

## Contratos HTTP compartilhados (OpenAPI -> frontend)

- Fonte do contrato OpenAPI: `contracts/openapi/exam-runner.openapi.json`.
- Exportação do contrato via backend: `pnpm api:openapi` (script `scripts/export-openapi.sh`).
- Geração do client/tipos TypeScript: `pnpm web:api:generate` (gera `apps/web/src/generated/api-contract.ts`).
- Pipeline completo: `pnpm contracts:generate`.

Essa abordagem evita duplicação manual de contratos HTTP entre .NET e React/TypeScript.
