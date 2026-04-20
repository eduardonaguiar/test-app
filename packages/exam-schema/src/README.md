# @exam-runner/exam-schema

Pacote com o schema oficial (`exam.schema.json`) e validadores runtime para o arquivo de importação de provas.

## Exports

- `examSchema`: objeto JSON Schema oficial (Draft 2020-12).
- `validateExamDocument(payload)`: valida e retorna `{ success, errors }`.
- `isExamDocument(payload)`: type guard para uso em código TypeScript/JavaScript.
- `assertValidExamDocument(payload)`: lança erro com mensagens detalhadas quando inválido.

## Uso rápido

```ts
import { assertValidExamDocument, examSchema } from '@exam-runner/exam-schema';

const exam = JSON.parse(input);
assertValidExamDocument(exam);
```

Também é possível importar o JSON bruto:

```ts
import schema from '@exam-runner/exam-schema/schema';
```
