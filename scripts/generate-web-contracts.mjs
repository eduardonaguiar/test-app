import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = resolve(new URL('.', import.meta.url).pathname, '..');
const openApiPath = resolve(rootDir, 'contracts/openapi/exam-runner.openapi.json');
const outputPath = resolve(rootDir, 'apps/web/src/generated/api-contract.ts');

const doc = JSON.parse(readFileSync(openApiPath, 'utf8'));
const schemas = doc.components?.schemas ?? {};

function toTypeName(schemaName) {
  return schemaName.replace(/[^a-zA-Z0-9_]/g, '');
}

function resolveRef(ref) {
  const schemaName = ref.split('/').at(-1);
  return toTypeName(schemaName);
}

function mapType(schema) {
  if (!schema) return 'unknown';
  if (schema.$ref) return resolveRef(schema.$ref);

  switch (schema.type) {
    case 'string':
      return 'string';
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return `${mapType(schema.items)}[]`;
    case 'object': {
      const properties = schema.properties ?? {};
      const required = new Set(schema.required ?? []);
      const lines = Object.entries(properties).map(([propName, propSchema]) => {
        const optionalMarker = required.has(propName) ? '' : '?';
        return `  ${propName}${optionalMarker}: ${mapType(propSchema)};`;
      });
      return `\n{\n${lines.join('\n')}\n}`;
    }
    default:
      return 'unknown';
  }
}

const typeBlocks = Object.entries(schemas).map(([schemaName, schema]) => {
  const typeName = toTypeName(schemaName);
  return `export type ${typeName} = ${mapType(schema)};`;
});

const lines = [
  '// Auto-generated file. Do not edit manually.',
  '// Source: contracts/openapi/exam-runner.openapi.json',
  '',
  ...typeBlocks,
  '',
  'async function parseJson<T>(response: Response): Promise<T> {',
  '  return (await response.json()) as T;',
  '}',
  '',
  'export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {',
  "  const response = await fetch('/api/health', { signal });",
  '',
  '  if (!response.ok) {',
  "    throw new Error(`GET /api/health failed with status ${response.status}`);",
  '  }',
  '',
  '  return parseJson<HealthResponse>(response);',
  '}',
  '',
  'export async function listExams(signal?: AbortSignal): Promise<ListExamsResponse> {',
  "  const response = await fetch('/api/exams', { signal });",
  '',
  '  if (!response.ok) {',
  "    throw new Error(`GET /api/exams failed with status ${response.status}`);",
  '  }',
  '',
  '  return parseJson<ListExamsResponse>(response);',
  '}',
  '',
];

writeFileSync(outputPath, lines.join('\n'), 'utf8');
console.log(`Generated frontend API contracts at ${outputPath}`);
