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
- Na inicialização, a API aplica migrations automaticamente (`Database.Migrate`).
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

## Publicação desktop Windows (self-contained)

Para gerar um executável local da API para Windows sem depender de Docker, use:

```bash
pnpm api:publish:win-x64
```

O script executa:

```bash
dotnet publish apps/api/src/ExamRunner.Api/ExamRunner.Api.csproj \
  -c Release \
  -r win-x64 \
  --self-contained true \
  -p:PublishSingleFile=true \
  -p:IncludeNativeLibrariesForSelfExtract=true \
  -o apps/api/publish/win-x64
```

Saída esperada:

- executável: `apps/api/publish/win-x64/ExamRunner.Api.exe`;
- execução local no Windows (PowerShell):

```powershell
.\apps\api\publish\win-x64\ExamRunner.Api.exe
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

## Seed técnico (dados de demonstração)

Para facilitar onboarding e smoke tests, execute o seed demo que importa todos os arquivos em `contracts/exam-schema/examples/demo`:

```bash
pnpm db:seed
```

O seed valida cada JSON contra o schema oficial e faz importação idempotente por `metadata.examId` (simulados já existentes são ignorados).

Para semear um único arquivo:

```bash
pnpm db:seed:example
```
