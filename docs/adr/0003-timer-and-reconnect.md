# ADR 0003 — Timer e política de reconnect no backend

- **Status:** Aceito
- **Data:** 2026-04-20

## Contexto

O simulador precisa reproduzir comportamento de prova real:

- tempo oficial inviolável;
- retomada controlada quando usuário perde conexão/sessão;
- finalização automática quando regras forem violadas;
- histórico auditável para revisão.

Principais riscos de desenho:

- confiar no relógio do frontend;
- permitir reconexões ilimitadas sem rastreio;
- recalcular resultado de forma frágil no futuro.

## Decisão

## 1) Timer: backend como fonte de verdade

Ao criar tentativa:

- persistir `StartedAtUtc` com `TimeProvider` do backend;
- persistir `DeadlineAtUtc = StartedAtUtc + DurationMinutes`.

Em operações de tentativa (leitura/salvar resposta/reconnect/submit):

- aplicar transição temporal sob demanda;
- se `now >= DeadlineAtUtc` e status era `in_progress`, finalizar tentativa (`finalized`) e registrar `SubmittedAtUtc`.

A UI pode exibir countdown, mas não determina estado oficial.

## 2) Reconnect por política do exame

Cada exame define:

- `ReconnectEnabled`;
- `MaxReconnectAttempts`;
- `ReconnectGracePeriodSeconds`;
- `ReconnectTerminateIfExceeded`.

A cada reconnect:

- calcular `offlineDurationSeconds = now - LastSeenAtUtc`;
- avaliar respeito ao grace period e ao limite de tentativas;
- persistir `ReconnectEvent` com sequência e flags de conformidade;
- se política excedida **e** `ReconnectTerminateIfExceeded = true`, finalizar tentativa.

## 3) Persistência de resultado para revisão estável

Na submissão:

- calcular score objetivo;
- persistir `AttemptResult`;
- persistir snapshots JSON para revisão por questão e análise por tópico.

Isso garante consulta histórica robusta sem depender de recálculo com regras futuras.

## Consequências

### Positivas

- comportamento consistente e auditável de tempo e reconexão;
- menor superfície de fraude/manipulação por relógio cliente;
- possibilidade de explicar reprovação por violação de reconnect;
- histórico de revisão preservado ao longo do tempo.

### Negativas / trade-offs

- timeout automático é lazy (ocorre no próximo acesso), não por scheduler ativo;
- maior carga de regra no serviço de tentativa;
- necessidade de atenção a concorrência caso existam múltiplas sessões simultâneas no futuro.

## Alternativas consideradas

1. **Timer no frontend:** rejeitada por falta de confiabilidade.
2. **Scheduler/worker para timeout hard em tempo real:** adiado para evitar complexidade operacional no MVP local-first.
3. **Não persistir snapshots de revisão:** rejeitada por risco de inconsistência histórica após evolução de regras.

## Escopo coberto por esta decisão

- ciclo de vida de tentativa com `in_progress`, `submitted`, `finalized`;
- aplicação de timeout e reconnect na API de tentativas;
- histórico de tentativas finalizadas e resultado detalhado.

## Revisão futura

Reavaliar esta ADR se houver:

- necessidade de timeout com SLA estrito em tempo real;
- múltiplos dispositivos concorrentes por tentativa com locking explícito;
- mudança para arquitetura distribuída (fora do escopo atual).
