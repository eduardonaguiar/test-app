# ADR 0001 — Estratégia de monorepo híbrido

- **Status:** Aceito
- **Data:** 2026-04-20

## Contexto

O produto é um simulador local-first com frontend React/TS e backend .NET. O time alvo é pequeno (inclusive 1 dev), com necessidade de:

- onboarding simples;
- evolução coordenada entre API, frontend e contratos;
- baixo custo operacional no ambiente local.

Alternativas consideradas:

1. Repositórios separados (`web`, `api`, `contracts`);
2. Monorepo completo JS-only (inviável pelo backend .NET);
3. Monorepo híbrido com workspace JS/TS e solução .NET.

## Decisão

Adotar **monorepo híbrido**:

- `pnpm-workspace` para frontend e pacotes JS/TS;
- `.NET solution` para projetos backend;
- artefatos de contrato em pastas neutras (`contracts/*`) e pacote utilitário de schema (`packages/exam-schema`).

## Consequências

### Positivas

- fluxo único de versionamento para frontend, backend e contratos;
- scripts raiz padronizados para build/test/dev;
- mudança de contrato HTTP e consumo frontend no mesmo ciclo de commit;
- simplificação de CI para MVP.

### Negativas / trade-offs

- ferramenta híbrida exige familiaridade com ecossistemas Node e .NET;
- pipelines podem crescer em tempo conforme o monorepo aumenta;
- risco de acoplamento acidental entre times/módulos sem governança mínima.

## Guardrails adotados

- contratos HTTP como fronteira estável (OpenAPI exportado);
- schema de importação formal e versionado;
- separação física de apps e packages;
- ADRs para decisões estruturais futuras.

## Plano de revisão

Reavaliar este ADR quando houver:

- necessidade explícita de múltiplos times independentes por domínio;
- aumento relevante de tempo de build/teste que justifique segmentação de pipelines;
- mudança de estratégia de distribuição do produto além do escopo local-first.
