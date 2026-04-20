# Formato oficial do arquivo JSON de prova

Este documento descreve o contrato oficial para importação de provas no ExamRunner.

## 1) Propósito

O formato JSON de prova existe para garantir que a importação seja:

- **consistente** entre diferentes provas;
- **validável automaticamente** antes de persistir no banco;
- **fácil de gerar por humanos e por IA**;
- **compatível com o fluxo do simulador** (execução cronometrada, reconexão, pontuação e revisão final).

A validação deve ser feita com base no schema oficial em `contracts/exam-schema`.

---

## 2) Campos obrigatórios

A estrutura abaixo representa os campos mínimos esperados para uma prova válida.

### Raiz do documento

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `schemaVersion` | `string` | Sim | Versão do contrato JSON (ex.: `1.0`). |
| `exam` | `object` | Sim | Objeto principal com metadados e conteúdo da prova. |

### Objeto `exam`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | `string` | Sim | Identificador único da prova. |
| `title` | `string` | Sim | Título da prova. |
| `description` | `string` | Sim | Descrição curta para contexto. |
| `durationMinutes` | `integer` | Sim | Duração total da prova em minutos. |
| `passingScore` | `number` | Sim | Nota mínima para aprovação (0 a 100). |
| `reconnectPolicy` | `object` | Sim | Regras de reconexão durante tentativa. |
| `sections` | `array` | Sim | Lista de seções da prova (mínimo 1). |

### Objeto `reconnectPolicy`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `enabled` | `boolean` | Sim | Se reconexão é permitida. |
| `maxReconnects` | `integer` | Sim | Máximo de reconexões permitidas. |
| `gracePeriodSeconds` | `integer` | Sim | Tempo máximo offline por reconexão. |

### Objeto `section`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | `string` | Sim | Identificador da seção. |
| `title` | `string` | Sim | Nome da seção. |
| `questions` | `array` | Sim | Lista de questões da seção (mínimo 1). |

### Objeto `question`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | `string` | Sim | Identificador da questão. |
| `prompt` | `string` | Sim | Enunciado da questão. |
| `options` | `array` | Sim | Alternativas possíveis (mínimo 2). |
| `correctOptionId` | `string` | Sim | ID da alternativa correta. |
| `explanationSummary` | `string` | Sim | Explicação curta da resposta correta. |
| `explanationDetails` | `string` | Sim | Explicação detalhada para revisão. |
| `topic` | `string` | Sim | Tema da questão (ex.: Networking, Security). |
| `difficulty` | `string` | Sim | Dificuldade (ex.: `easy`, `medium`, `hard`). |
| `weight` | `number` | Sim | Peso da questão para cálculo da nota. |

### Objeto `option`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | `string` | Sim | Identificador da alternativa. |
| `label` | `string` | Sim | Texto exibido para o usuário. |

---

## 3) Exemplo completo

```json
{
  "schemaVersion": "1.0",
  "exam": {
    "id": "exam-az900-core-ptbr",
    "title": "Simulado AZ-900 - Fundamentos",
    "description": "Simulado introdutório com foco em conceitos centrais de nuvem.",
    "durationMinutes": 45,
    "passingScore": 70,
    "reconnectPolicy": {
      "enabled": true,
      "maxReconnects": 2,
      "gracePeriodSeconds": 120
    },
    "sections": [
      {
        "id": "section-cloud-concepts",
        "title": "Conceitos de Nuvem",
        "questions": [
          {
            "id": "q-001",
            "prompt": "Qual é uma característica de escalabilidade elástica em nuvem?",
            "options": [
              { "id": "a", "label": "Capacidade de crescer e reduzir recursos sob demanda" },
              { "id": "b", "label": "Aquisição obrigatória de hardware físico próprio" },
              { "id": "c", "label": "Dependência de um único datacenter local" },
              { "id": "d", "label": "Aumento fixo de custos independentemente do uso" }
            ],
            "correctOptionId": "a",
            "explanationSummary": "Escalabilidade elástica ajusta recursos conforme demanda.",
            "explanationDetails": "Em ambientes de nuvem, recursos podem ser provisionados e liberados rapidamente para responder à variação de carga, reduzindo desperdício e melhorando custo-benefício.",
            "topic": "Cloud Concepts",
            "difficulty": "easy",
            "weight": 1
          },
          {
            "id": "q-002",
            "prompt": "Qual modelo de responsabilidade compartilhada descreve corretamente o IaaS?",
            "options": [
              { "id": "a", "label": "Cliente gerencia dados, apps e SO; provedor gerencia infraestrutura física" },
              { "id": "b", "label": "Provedor gerencia tudo, inclusive identidade e dados do cliente" },
              { "id": "c", "label": "Cliente gerencia somente o prédio do datacenter" },
              { "id": "d", "label": "Não existe divisão de responsabilidades" }
            ],
            "correctOptionId": "a",
            "explanationSummary": "No IaaS, o cliente ainda administra camadas lógicas importantes.",
            "explanationDetails": "O provedor assume rede, armazenamento físico e computação base. O cliente continua responsável por sistema operacional, aplicações, configuração e proteção dos próprios dados.",
            "topic": "Shared Responsibility",
            "difficulty": "medium",
            "weight": 1.5
          }
        ]
      }
    ]
  }
}
```

---

## 4) Regras de validação

As regras abaixo devem ser aplicadas na importação.

### Estrutura e tipos

1. O JSON deve ser um objeto válido.
2. `schemaVersion` deve existir e corresponder a uma versão suportada.
3. Todos os campos obrigatórios devem existir com o tipo correto.

### Cardinalidade

1. `sections` deve conter pelo menos 1 seção.
2. Cada seção deve conter pelo menos 1 questão.
3. Cada questão deve conter pelo menos 2 opções.

### Integridade referencial

1. `exam.id`, `section.id`, `question.id` e `option.id` devem ser únicos dentro de seus escopos.
2. `correctOptionId` deve existir dentro de `options` da própria questão.

### Regras de negócio mínimas

1. `durationMinutes` deve ser maior que 0.
2. `passingScore` deve estar no intervalo de 0 a 100.
3. `weight` deve ser maior que 0.
4. Se `reconnectPolicy.enabled = false`, o backend pode ignorar `maxReconnects` e `gracePeriodSeconds`.
5. Se `reconnectPolicy.enabled = true`, `maxReconnects` e `gracePeriodSeconds` devem ser maiores ou iguais a 0.

### Conteúdo textual

1. `title`, `prompt`, `explanationSummary` e `explanationDetails` não devem ser vazios.
2. Recomenda-se limite prático de tamanho para evitar payloads excessivos e textos truncados em UI.

---

## 5) Boas práticas para gerar JSON com IA

Para melhorar qualidade e reduzir erros de importação:

1. **Forneça instruções explícitas para a IA**
   - Exija a saída em JSON puro (sem markdown).
   - Inclua o schema alvo (`schemaVersion`) no prompt.

2. **Peça IDs estáveis e previsíveis**
   - Use padrões como `exam-...`, `section-...`, `q-...`, `a/b/c/d`.
   - Evite IDs aleatórios longos sem necessidade.

3. **Imponha consistência semântica**
   - Garanta que `correctOptionId` exista em `options`.
   - Garanta coerência entre enunciado, alternativa correta e explicações.

4. **Padronize dificuldade e tópicos**
   - Defina previamente valores aceitos para `difficulty`.
   - Use taxonomia de tópicos consistente para relatórios de desempenho.

5. **Valide sempre antes de importar**
   - Execute validação de schema.
   - Execute validações de negócio (tempo, peso, pontuação, cardinalidade).

6. **Versione seus arquivos de prova**
   - Mantenha `schemaVersion` atualizado.
   - Armazene arquivos em repositório com histórico para auditoria e reuso.

7. **Prefira lotes pequenos na geração inicial**
   - Gere primeiro uma seção curta para validar formato.
   - Só depois expanda para prova completa.

---

## 6) Reutilização e evolução do contrato

- Trate este formato como **contrato oficial** entre geração de conteúdo e backend.
- Alterações estruturais devem ser versionadas e refletidas no schema em `contracts/exam-schema`.
- Em caso de mudança incompatível, incremente versão e documente migração.
