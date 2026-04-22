# Arquitetura do Exam Runner

## 1) Objetivo arquitetural

Este repositório implementa um **simulador local-first de provas** com foco em:

- importação de exames via JSON validado por schema oficial;
- execução cronometrada de tentativas;
- política de reconexão por exame;
- submissão e correção automática;
- revisão final com explicações e histórico local.

A arquitetura prioriza simplicidade operacional para desenvolvimento local e evolução incremental do MVP.

---

## 2) Visão geral da solução

A solução é um **monorepo híbrido** com duas frentes principais:

- **Frontend** em React + Vite + TypeScript (`apps/web`);
- **Backend** em ASP.NET Core Minimal APIs (`apps/api/src/ExamRunner.Api`) com persistência EF Core + SQLite (`apps/api/src/ExamRunner.Infrastructure`).

Também existem artefatos de contrato em:

- `contracts/exam-schema` (exemplos JSON);
- `packages/exam-schema` (schema oficial + utilitários JS para validação);
- `contracts/openapi` (contrato HTTP exportado da API).

---

## 3) Estrutura atual (as-built)

```text
/
  apps/
    web/
    api/
      src/
        ExamRunner.Api/
        ExamRunner.Application/
        ExamRunner.Domain/
        ExamRunner.Infrastructure/
      tests/
        ExamRunner.UnitTests/
  contracts/
    exam-schema/
      examples/
    openapi/
  packages/
    exam-schema/
    shared-types/
    ui/
  infra/
    docker/
```

### Observação importante sobre camadas

A direção arquitetural alvo inclui `Application` e `Domain`. No estado atual, a extração foi iniciada de forma incremental: contratos e orquestração de casos de uso de tentativas já vivem em `ExamRunner.Application`, enquanto regras centrais de ciclo de vida (timeout e reconexão) foram movidas para `ExamRunner.Domain`.

A importação e parte das regras de negócio ainda permanecem em `ExamRunner.Infrastructure`, como etapa intermediária planejada para manter o sistema estável durante a migração por fatias.

---

## 4) Backend: responsabilidades por módulo

## 4.1 `ExamRunner.Api`

Responsável por:

- bootstrap da aplicação;
- DI e middlewares;
- Swagger/OpenAPI em desenvolvimento;
- mapeamento de endpoints em `/api/*`;
- conversão de exceções de domínio técnico para `ProblemDetails`.

Endpoints implementados:

- `GET /api/health`
- `POST /api/exams/import`
- `GET /api/exams`
- `GET /api/exams/{examId}`
- `POST /api/attempts`
- `GET /api/attempts/{attemptId}`
- `PUT /api/attempts/{attemptId}/answers/{questionId}`
- `POST /api/attempts/{attemptId}/reconnect`
- `POST /api/attempts/{attemptId}/submit`
- `GET /api/attempts/{attemptId}/result`
- `GET /api/history`

## 4.2 `ExamRunner.Application`

Responsável por:

- contratos de casos de uso de tentativas (commands, snapshots e interfaces);
- fronteira estável para consumo pela camada `Api`.

## 4.3 `ExamRunner.Domain`

Responsável por:

- regras puras de ciclo de vida da tentativa (deadline e reconexão);
- status canônicos da tentativa.

## 4.4 `ExamRunner.Infrastructure`

Responsável por:

- contexto EF Core e mapeamento de entidades SQLite;
- migrations e inicialização de banco;
- importação de exame (schema + consistência + persistência);
- implementação concreta dos serviços de aplicação;
- cálculo de score objetivo e breakdown por tópico;
- leitura de exames para listagem/detalhes.

---

## 5) Fluxos críticos do MVP

## 5.1 Importação de exame

1. Cliente envia JSON em `POST /api/exams/import`.
2. Backend valida payload contra schema oficial (`packages/exam-schema/src/exam.schema.json`).
3. Backend valida consistência semântica adicional (ex.: integridade entre seções, questões e opções).
4. Estrutura do exame é persistida em SQLite.

## 5.2 Ciclo de tentativa

1. `POST /api/attempts` cria tentativa com `StartedAtUtc`, `DeadlineAtUtc` e status `in_progress`.
2. `PUT /answers/{questionId}` salva/atualiza resposta por questão (idempotente por questão).
3. Leituras de estado (`GET /attempts/{id}`) calculam `remainingSeconds` com base no relógio do backend.
4. `POST /reconnect` registra evento de reconexão e aplica política do exame.
5. `POST /submit` finaliza tentativa, calcula score e persiste snapshot de revisão (questões + tópicos).
6. `GET /attempts/{id}/result` retorna resultado completo de tentativa submetida.

## 5.3 Timeout automático

Não há job externo no MVP. A transição temporal é aplicada **sob demanda** em operações de leitura/escrita da tentativa: se `now >= DeadlineAtUtc`, a tentativa é finalizada no ato da requisição.

---

## 6) Modelo de dados (núcleo)

Entidades persistidas principais:

- `Exam`, `ExamSection`, `Question`, `QuestionOption`;
- `Attempt`, `AttemptAnswer`, `AttemptResult`, `ReconnectEvent`.

Decisão relevante:

- o resultado persiste snapshots JSON (`QuestionReviewsJson`, `TopicAnalysisJson`) para revisão histórica estável, evitando depender de recálculo frágil após mudanças futuras de regra.

---

## 7) Frontend

O frontend consome a API HTTP e implementa páginas de:

- listagem de exames;
- detalhe de exame;
- execução de tentativa;
- resultado da tentativa;
- histórico.

A integração com backend usa contratos gerados a partir de OpenAPI (`apps/web/src/generated/api-contract.ts`).

---

## 8) Ambiente local e operação

- `docker-compose.yml` sobe `web` (Vite) e `api` (ASP.NET Core com `dotnet watch`);
- código é montado por bind mount para feedback rápido;
- SQLite local é inicializado por migrations no startup da API;
- há seed automático inicial e script dedicado para seed de exemplo.

---

## 9) Trade-offs e débitos técnicos conscientes

1. **Migração parcial para `Application` e `Domain`**
   - Prós: menor acoplamento nos fluxos de tentativa já migrados.
   - Contras: importação e outros fluxos ainda concentrados em `Infrastructure`.

2. **Sem FluentValidation no backend (ainda)**
   - O projeto usa validações explícitas e exceções de domínio técnico.
   - Evolução recomendada: mover validações de request/command para FluentValidation.

3. **Sem suite de integração com `WebApplicationFactory` (ainda)**
   - Existem testes unitários robustos para importação, scoring e ciclo de tentativa.
   - Evolução recomendada: adicionar testes de contrato/endpoints cobrindo fluxos principais.

4. **Sem Vitest no frontend (ainda)**
   - MVP priorizou implementação de telas e integração HTTP.
   - Evolução recomendada: cobrir fluxos críticos de execução e apresentação de resultado.

---

## 10) Escopo do MVP (estado atual)

Atendido:

- importação de exame JSON com schema oficial;
- listagem e detalhe de exames;
- criação de tentativa;
- timer com fonte oficial no backend;
- salvamento de respostas;
- reconexão com política configurável por exame;
- submissão e score;
- revisão de resultado;
- histórico de tentativas finalizadas;
- OpenAPI exportável e consumo via frontend.

Fora do MVP atual:

- multi-tenant;
- autenticação/iam complexa;
- infraestrutura distribuída;
- banco servidor externo;
- microserviços/event bus.

---

## 11) Próximos passos arquiteturais sugeridos

1. Continuar extraindo gradualmente importação e consultas para `ExamRunner.Application` e regras puras para `ExamRunner.Domain`.
2. Adotar FluentValidation para requests/commands críticos.
3. Adicionar testes de integração com `WebApplicationFactory`.
4. Incluir Vitest para fluxos críticos do frontend.
5. Versionar evolução de regras em ADRs adicionais.
