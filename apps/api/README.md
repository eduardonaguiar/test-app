# API (.NET 8)

Scaffold inicial do backend em `apps/api` com solução .NET e endpoint de saúde.

## Estrutura

- `ExamRunner.sln`: solução da API.
- `src/ExamRunner.Api`: projeto ASP.NET Core (Minimal API).

## Endpoint disponível

- `GET /health`
  - Retorna `status`, `timestamp` (UTC) e `version`.

Exemplo de resposta:

```json
{
  "status": "ok",
  "timestamp": "2026-04-20T12:00:00+00:00",
  "version": "1.0.0"
}
```

## Scripts (raiz do monorepo)

- `pnpm api:dev` → roda API com hot reload (`dotnet watch`).
- `pnpm api:build` → build da solução backend.
- `pnpm api:test` → testes backend.
- `pnpm api:lint` → valida formatação C# com `dotnet format --verify-no-changes`.
