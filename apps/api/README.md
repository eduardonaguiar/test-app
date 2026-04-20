# API (.NET 8)

Backend modular em `apps/api` com solução .NET e contrato OpenAPI como fonte para geração de clientes frontend.

## Estrutura

- `ExamRunner.sln`: solução da API.
- `src/ExamRunner.Api`: projeto ASP.NET Core (Minimal API).
- `src/ExamRunner.Api/Contracts`: DTOs HTTP explícitos por domínio (`Health`, `Exams`, `Errors`).

## Endpoints disponíveis

- `GET /api/health`
  - Retorna `status`, `timestamp` (UTC) e `version`.
- `GET /api/exams`
  - Retorna `items` com resumo de exames.
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
