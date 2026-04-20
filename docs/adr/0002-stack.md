# ADR 0002 — Stack tecnológica do MVP

- **Status:** Aceito
- **Data:** 2026-04-20

## Contexto

Precisamos entregar um MVP local-first com:

- UI web para execução de simulados;
- API backend com regras de timer, reconnect e scoring;
- persistência local simples;
- validação robusta de arquivo de importação JSON;
- documentação de contrato HTTP.

Alternativas avaliadas incluíam backend Node e banco servidor, mas essas opções aumentariam complexidade operacional sem ganho proporcional para o MVP.

## Decisão

Fixar a stack do MVP em:

### Frontend

- React
- Vite
- TypeScript

### Backend

- .NET 8
- ASP.NET Core (Minimal APIs modulares)

### Persistência

- SQLite
- Entity Framework Core (migrations)

### Contratos e validação

- OpenAPI/Swagger para contrato HTTP
- JSON Schema oficial para importação de exames
- validações backend via regras explícitas e validadores dedicados de importação

### Testes (estado atual + direção)

- Atual: xUnit + FluentAssertions (backend)
- Direção prevista: integração com `WebApplicationFactory` e Vitest no frontend

### Dev environment

- Docker + Docker Compose
- `pnpm` para workspace JS/TS
- solução .NET para backend

## Consequências

### Positivas

- stack pragmática e amplamente suportada;
- setup local previsível;
- baixo custo operacional com SQLite;
- tipagem forte em frontend e backend;
- contratos explícitos para integração front-back.

### Negativas / trade-offs

- ausência atual de FluentValidation gera validações distribuídas em endpoints/serviços;
- backend ainda não separado em `Application`/`Domain` dedicados;
- sem testes de integração HTTP no estado atual;
- frontend ainda sem suíte Vitest.

## O que esta decisão evita no MVP

- backend substituído por Node.js;
- banco servidor externo;
- microserviços e mensageria;
- padrões de escala prematuros (CQRS/event sourcing pesado).

## Critérios para revisão

Reabrir este ADR somente se houver requisito explícito de:

- escala/disponibilidade que o modelo local-first não suporte;
- integração com serviços externos que exijam outro modelo de persistência;
- mudanças de produto que invalidem o escopo de MVP local.
