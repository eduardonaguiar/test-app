# Exam Runner Monorepo (MVP)

Simulador local-first de provas para estudo e retenção de conhecimento.

## Visão do produto

O **Exam Runner** é um simulador de exames pensado para uso local (single developer / uso individual), com foco em fluxos realistas de certificação:

- importação de provas a partir de JSON estruturado;
- execução com tempo controlado pelo backend;
- política de reconnect/rejoin por prova;
- persistência local de progresso, respostas e resultados;
- revisão final com score, gabarito e explicações;
- histórico local de tentativas.

> Escopo do MVP: produto local, sem multi-tenant, sem infraestrutura distribuída e sem dependências cloud obrigatórias.

## Stack

### Frontend
- React
- Vite
- TypeScript

### Backend
- .NET 8
- ASP.NET Core (Minimal APIs)
- FluentValidation

### Persistência
- SQLite
- Entity Framework Core

### Contratos e validação
- OpenAPI/Swagger para contrato HTTP
- JSON Schema para contrato de importação de provas

### Testes
- Backend: xUnit + FluentAssertions + WebApplicationFactory
- Frontend: Vitest

### Dev environment
- Docker
- Docker Compose
- Monorepo híbrido: `pnpm` (JS/TS) + solution `.NET`

## Estrutura do monorepo

```text
.
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── ExamRunner.Api/
│   │   │   ├── ExamRunner.Application/
│   │   │   ├── ExamRunner.Domain/
│   │   │   └── ExamRunner.Infrastructure/
│   │   └── tests/
│   │       ├── ExamRunner.UnitTests/
│   │       └── ExamRunner.IntegrationTests/
│   └── web/
├── contracts/
│   ├── exam-schema/
│   │   └── examples/
│   └── openapi/
├── docs/
│   └── adr/
├── infra/
│   └── docker/
├── packages/
│   ├── exam-schema/
│   ├── shared-types/
│   └── ui/
└── scripts/
```

## Estado atual vs alvo arquitetural (por milestone)

### Milestone atual (as-built)

- a solução roda de ponta a ponta com `Api`, `Infrastructure`, `Application` e `Domain` presentes no monorepo;
- os fluxos críticos de tentativa já usam contratos em `Application` e regras centrais de ciclo de vida em `Domain`;
- parte relevante da importação e da orquestração de persistência ainda está concentrada em `Infrastructure`.

### Alvo dos próximos milestones

- continuar movendo regras de negócio e orquestrações para `Application`/`Domain`;
- manter `Api` focada em HTTP (endpoints, DI, middleware e contratos);
- manter `Infrastructure` focada em EF Core/SQLite, adapters e detalhes técnicos.

> Referência detalhada: `docs/architecture.md` contém o mapa de “estado atual” e “estado alvo” para reduzir drift de documentação.

## Onboarding rápido (novo desenvolvedor)

### 1) Pré-requisitos

- Node.js 20+
- pnpm 10+
- .NET 8 SDK
- Docker + Docker Compose

### 2) Instalar dependências

Gerenciador JS/TS oficial deste monorepo: **pnpm**.

```bash
pnpm install
dotnet restore apps/api/ExamRunner.sln
```

> `npm install` e `yarn install` podem ser executados no ambiente, mas o fluxo suportado do repositório é com `pnpm` (definido em `packageManager` no `package.json` raiz).

### 3) Subir ambiente com Docker Compose

Opção recomendada para onboarding:

```bash
docker compose up --build
```

ou via script de atalho:

```bash
pnpm compose:up
```

Serviços disponíveis:

- Web (Vite): `http://localhost:5173`
- API (.NET): `http://localhost:8080`
- Healthcheck API: `http://localhost:8080/api/health`

Padrão operacional de desenvolvimento em Compose:

- o serviço `api` roda com `dotnet run` (comportamento atual do `docker-compose.yml`);
- hot reload (`dotnet watch`) fica como fluxo opcional fora do Compose via `pnpm api:dev`/`pnpm dev`.

Para derrubar:

```bash
docker compose down
```

ou:

```bash
pnpm compose:down
```

## Desktop app (Electron)

Comandos básicos do desktop a partir da raiz do monorepo:

```bash
pnpm dev:desktop
pnpm build:desktop
pnpm make:desktop
```

Os scripts acima usam o workspace `@exam-runner/desktop` (`apps/desktop`) e mantêm as dependências do app desktop isoladas no próprio pacote.

## Como importar provas

A API expõe `POST /api/exams/import` para importar JSON de prova.

### Opção A — seed de exemplo (mais simples)

Importa automaticamente todos os simulados de demonstração em `contracts/exam-schema/examples/demo`:

```bash
pnpm db:seed
```

O comando é idempotente: se o `metadata.examId` já tiver sido importado, o simulado é ignorado.

### Opção B — import manual via cURL

```bash
curl -X POST "http://localhost:8080/api/exams/import" \
  -H "Content-Type: application/json" \
  --data-binary @contracts/exam-schema/examples/exam-completo-multissecao.json
```

Após importar, valide listagem:

```bash
curl "http://localhost:8080/api/exams"
```

> Dica: o formato oficial do JSON está em `contracts/exam-schema/`, os simulados demo ficam em `contracts/exam-schema/examples/demo/` e há exemplos avulsos em `contracts/exam-schema/examples/`.

### Reset e recarga dos seeds demo

Para resetar a base local e recarregar os simulados de demonstração:

```bash
rm -f apps/api/src/ExamRunner.Api/App_Data/exam-runner.db
pnpm db:seed
```

Se quiser semear apenas um arquivo isolado (modo legado):

```bash
pnpm db:seed:example
```

## Como rodar testes

### Testes do monorepo (JS/TS + .NET)

```bash
pnpm test
```

### Testes por camada

```bash
pnpm test:js
pnpm test:js:a11y
pnpm test:api
pnpm --filter @exam-runner/web test
```

### Outros checks úteis

```bash
pnpm lint
pnpm lint:js:a11y
pnpm typecheck
```

## Fluxo de desenvolvimento local (sem Docker)

```bash
pnpm dev
```

Esse comando sobe:

- backend com `dotnet watch`;
- frontend com Vite.

Para publicar a API como executável self-contained para Windows (modo desktop, sem Docker):

```bash
pnpm api:publish:win-x64
```

O artefato é gerado em `apps/api/publish/win-x64/ExamRunner.Api.exe`.

> Observação: para evitar ambiguidades de operação, o padrão no Compose é `dotnet run`, enquanto `dotnet watch` é o padrão do fluxo local sem Compose.

## Próximos passos (pós-MVP)

- Evoluir cobertura de testes dos fluxos críticos (import, timer, reconnect, scoring).
- Expandir documentação funcional do formato JSON (casos válidos/invalidos).
- Melhorar UX de revisão (filtros por tópico/dificuldade e navegação de erros).
- Publicar checklist de release local (migrations + seed + smoke tests).
- Consolidar guias operacionais em `docs/` (troubleshooting de ambiente e dados).

## Guias de referência

- Arquitetura: `docs/architecture.md`
- Formato de prova JSON: `docs/exam-json-format.md`
- Acessibilidade prática (UX-9): `docs/accessibility-guidelines.md`

---

Se você está chegando agora no projeto, siga a ordem recomendada:

1. subir com Compose;
2. validar health da API;
3. importar prova de exemplo;
4. abrir frontend e executar tentativa;
5. rodar testes.

Com isso você já percorre o ciclo essencial do MVP ponta a ponta.
