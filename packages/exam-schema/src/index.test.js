import test from 'node:test';
import assert from 'node:assert/strict';

import { assertValidExamDocument, isExamDocument, validateExamDocument } from './index.js';

const validExam = {
  schemaVersion: '1.0.0',
  metadata: {
    examId: 'exam-001',
    title: 'Backend Fundamentals',
    description: 'Core API and domain concepts.',
    language: 'pt-BR',
    tags: ['backend', 'dotnet']
  },
  durationMinutes: 90,
  passingScore: 70,
  reconnectPolicy: {
    enabled: true,
    maxReconnects: 2,
    gracePeriodSeconds: 60,
    terminateIfExceeded: true
  },
  sections: [
    {
      sectionId: 'sec-1',
      title: 'Arquitetura',
      questions: [
        {
          questionId: 'q-1',
          prompt: 'Qual camada contém as regras de negócio?',
          options: [
            { optionId: 'a', text: 'Infrastructure' },
            { optionId: 'b', text: 'Domain' }
          ],
          correctOptionId: 'b',
          explanationSummary: 'As regras ficam no domínio.',
          explanationDetailed: 'A camada Domain concentra entidades, VOs e invariantes do negócio.',
          topic: 'Arquitetura',
          difficulty: 'easy',
          weight: 1
        }
      ]
    }
  ]
};

test('validateExamDocument returns success for a valid payload', () => {
  const result = validateExamDocument(validExam);

  assert.equal(result.success, true);
  assert.deepEqual(result.errors, []);
});

test('isExamDocument is false for invalid payload', () => {
  const invalid = structuredClone(validExam);
  invalid.sections[0].questions[0].correctOptionId = 'invalid-option-id';

  assert.equal(isExamDocument(invalid), false);
});

test('assertValidExamDocument throws with detailed errors', () => {
  const invalid = {
    ...validExam,
    schemaVersion: '2.0.0'
  };

  assert.throws(
    () => assertValidExamDocument(invalid),
    /schemaVersion/
  );
});
