# API (.NET 8)

Backend modular em `apps/api` com solução .NET e contrato OpenAPI como fonte para geração de clientes frontend.

## Estrutura

- `ExamRunner.sln`: solução da API.
- `src/ExamRunner.Api`: projeto ASP.NET Core (Minimal API).
- `src/ExamRunner.Infrastructure`: camada de persistência com EF Core + SQLite.
- `src/ExamRunner.Api/Contracts`: DTOs HTTP explícitos por domínio (`Health`, `Exams`, `Errors`).

## Persistência local (SQLite)

- String de conexão padrão em `src/ExamRunner.Api/appsettings.json`:
  - `Data Source=App_Data/exam-runner.db`
- Na inicialização, a API aplica migrations automaticamente (`Database.Migrate`) e executa seed inicial caso o catálogo esteja vazio.
- Migrations ficam em `src/ExamRunner.Infrastructure/Data/Migrations`.

### Comandos úteis de migração

Executar a partir da raiz do monorepo:

```bash
dotnet ef migrations add <NomeMigracao> \
  --project apps/api/src/ExamRunner.Infrastructure/ExamRunner.Infrastructure.csproj \
  --startup-project apps/api/src/ExamRunner.Api/ExamRunner.Api.csproj \
  --output-dir Data/Migrations

dotnet ef database update \
  --project apps/api/src/ExamRunner.Infrastructure/ExamRunner.Infrastructure.csproj \
  --startup-project apps/api/src/ExamRunner.Api/ExamRunner.Api.csproj
```

## Endpoints disponíveis

- `GET /api/health`
  - Retorna `status`, `timestamp` (UTC) e `version`.
- `GET /api/exams`
  - Retorna `items` com resumo de exames (SQLite).
- `GET /api/exams/{examId}`
  - Retorna detalhes de exame e usa `ProblemDetails` padronizado para `404`.

## OpenAPI e contratos compartilhados

- Swagger/OpenAPI é publicado pela API em `GET /swagger/v1/swagger.json` (ambiente `Development`).
- Artefato versionado no monorepo: `contracts/openapi/exam-runner.openapi.json`.
- Script de exportação: `pnpm api:openapi`.

## Scripts (raiz do monorepo)

- `pnpm api:dev` → roda API com hot reload (`dotnet watch`).
- `pnpm api:build` → build da solução backend.
- `pnpm api:test` → testes backend.
- `pnpm api:lint` → valida formatação C# com `dotnet format --verify-no-changes`.
- `pnpm api:openapi` → publica artefato OpenAPI para `contracts/openapi`.

## Seed técnico (importação de exemplo)

Para facilitar testes locais, execute o seed que importa automaticamente o arquivo `contracts/exam-schema/examples/exam-basico-curto.json` para o SQLite local:

```bash
pnpm api:seed
```

> O seed só insere dados se a tabela de exames estiver vazia.
