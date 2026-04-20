import { readFileSync } from 'node:fs';

const schemaPath = new URL('./exam.schema.json', import.meta.url);

/** @type {import('./index.d.ts').ExamSchema} */
export const examSchema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

/**
 * @typedef {{ success: true; data: import('./index.d.ts').ExamDocument; errors: [] } | { success: false; errors: string[] }} ExamValidationResult
 */

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {string[]} errors
 * @param {string} path
 * @param {string} message
 */
function addError(errors, path, message) {
  errors.push(`${path}: ${message}`);
}

/**
 * @param {unknown} payload
 * @returns {ExamValidationResult}
 */
export function validateExamDocument(payload) {
  const errors = [];

  if (!isRecord(payload)) {
    return { success: false, errors: ['$: expected object'] };
  }

  validateRoot(payload, errors);

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: /** @type {import('./index.d.ts').ExamDocument} */ (payload),
    errors: []
  };
}

/**
 * @param {unknown} payload
 * @returns {payload is import('./index.d.ts').ExamDocument}
 */
export function isExamDocument(payload) {
  return validateExamDocument(payload).success;
}

/**
 * @param {unknown} payload
 * @returns {import('./index.d.ts').ExamDocument}
 */
export function assertValidExamDocument(payload) {
  const result = validateExamDocument(payload);

  if (!result.success) {
    throw new Error(`Invalid exam JSON. ${result.errors.join('; ')}`);
  }

  return result.data;
}

/**
 * @param {Record<string, unknown>} payload
 * @param {string[]} errors
 */
function validateRoot(payload, errors) {
  const requiredKeys = [
    'schemaVersion',
    'metadata',
    'durationMinutes',
    'passingScore',
    'reconnectPolicy',
    'sections'
  ];

  for (const key of requiredKeys) {
    if (!(key in payload)) {
      addError(errors, '$', `missing required property "${key}"`);
    }
  }

  if (payload.schemaVersion !== '1.0.0') {
    addError(errors, '$.schemaVersion', 'must be "1.0.0"');
  }

  if (!Number.isInteger(payload.durationMinutes) || payload.durationMinutes <= 0) {
    addError(errors, '$.durationMinutes', 'must be an integer greater than 0');
  }

  if (typeof payload.passingScore !== 'number' || payload.passingScore < 0 || payload.passingScore > 100) {
    addError(errors, '$.passingScore', 'must be a number between 0 and 100');
  }

  if (!isRecord(payload.metadata)) {
    addError(errors, '$.metadata', 'must be an object');
  } else {
    validateMetadata(payload.metadata, errors);
  }

  if (!isRecord(payload.reconnectPolicy)) {
    addError(errors, '$.reconnectPolicy', 'must be an object');
  } else {
    validateReconnectPolicy(payload.reconnectPolicy, errors);
  }

  if (!Array.isArray(payload.sections) || payload.sections.length === 0) {
    addError(errors, '$.sections', 'must be a non-empty array');
  } else {
    payload.sections.forEach((section, index) => {
      if (!isRecord(section)) {
        addError(errors, `$.sections[${index}]`, 'must be an object');
        return;
      }

      validateSection(section, index, errors);
    });
  }
}

/**
 * @param {Record<string, unknown>} metadata
 * @param {string[]} errors
 */
function validateMetadata(metadata, errors) {
  if (typeof metadata.examId !== 'string' || metadata.examId.length === 0) {
    addError(errors, '$.metadata.examId', 'must be a non-empty string');
  }

  if (typeof metadata.title !== 'string' || metadata.title.length === 0) {
    addError(errors, '$.metadata.title', 'must be a non-empty string');
  }

  if ('description' in metadata && (typeof metadata.description !== 'string' || metadata.description.length === 0)) {
    addError(errors, '$.metadata.description', 'must be a non-empty string when provided');
  }

  if ('language' in metadata && (typeof metadata.language !== 'string' || metadata.language.length < 2)) {
    addError(errors, '$.metadata.language', 'must be a string with at least 2 characters when provided');
  }

  if ('tags' in metadata) {
    if (!Array.isArray(metadata.tags)) {
      addError(errors, '$.metadata.tags', 'must be an array of unique strings');
    } else {
      const uniqueTagCount = new Set(metadata.tags).size;
      if (uniqueTagCount !== metadata.tags.length) {
        addError(errors, '$.metadata.tags', 'must contain unique items');
      }

      metadata.tags.forEach((tag, index) => {
        if (typeof tag !== 'string' || tag.length === 0) {
          addError(errors, `$.metadata.tags[${index}]`, 'must be a non-empty string');
        }
      });
    }
  }
}

/**
 * @param {Record<string, unknown>} reconnectPolicy
 * @param {string[]} errors
 */
function validateReconnectPolicy(reconnectPolicy, errors) {
  if (typeof reconnectPolicy.enabled !== 'boolean') {
    addError(errors, '$.reconnectPolicy.enabled', 'must be a boolean');
  }

  if (!Number.isInteger(reconnectPolicy.maxReconnects) || reconnectPolicy.maxReconnects < 0) {
    addError(errors, '$.reconnectPolicy.maxReconnects', 'must be an integer greater than or equal to 0');
  }

  if (!Number.isInteger(reconnectPolicy.gracePeriodSeconds) || reconnectPolicy.gracePeriodSeconds < 0) {
    addError(errors, '$.reconnectPolicy.gracePeriodSeconds', 'must be an integer greater than or equal to 0');
  }
}

/**
 * @param {Record<string, unknown>} section
 * @param {number} sectionIndex
 * @param {string[]} errors
 */
function validateSection(section, sectionIndex, errors) {
  if (typeof section.sectionId !== 'string' || section.sectionId.length === 0) {
    addError(errors, `$.sections[${sectionIndex}].sectionId`, 'must be a non-empty string');
  }

  if (typeof section.title !== 'string' || section.title.length === 0) {
    addError(errors, `$.sections[${sectionIndex}].title`, 'must be a non-empty string');
  }

  if (!Array.isArray(section.questions) || section.questions.length === 0) {
    addError(errors, `$.sections[${sectionIndex}].questions`, 'must be a non-empty array');
    return;
  }

  section.questions.forEach((question, questionIndex) => {
    if (!isRecord(question)) {
      addError(errors, `$.sections[${sectionIndex}].questions[${questionIndex}]`, 'must be an object');
      return;
    }

    validateQuestion(question, sectionIndex, questionIndex, errors);
  });
}

/**
 * @param {Record<string, unknown>} question
 * @param {number} sectionIndex
 * @param {number} questionIndex
 * @param {string[]} errors
 */
function validateQuestion(question, sectionIndex, questionIndex, errors) {
  const prefix = `$.sections[${sectionIndex}].questions[${questionIndex}]`;

  if (typeof question.questionId !== 'string' || question.questionId.length === 0) {
    addError(errors, `${prefix}.questionId`, 'must be a non-empty string');
  }

  if (typeof question.prompt !== 'string' || question.prompt.length === 0) {
    addError(errors, `${prefix}.prompt`, 'must be a non-empty string');
  }

  if (!Array.isArray(question.options) || question.options.length < 2) {
    addError(errors, `${prefix}.options`, 'must contain at least 2 options');
  } else {
    const optionIds = new Set();

    question.options.forEach((option, optionIndex) => {
      if (!isRecord(option)) {
        addError(errors, `${prefix}.options[${optionIndex}]`, 'must be an object');
        return;
      }

      const optionPath = `${prefix}.options[${optionIndex}]`;

      if (typeof option.optionId !== 'string' || option.optionId.length === 0) {
        addError(errors, `${optionPath}.optionId`, 'must be a non-empty string');
      } else {
        optionIds.add(option.optionId);
      }

      if (typeof option.text !== 'string' || option.text.length === 0) {
        addError(errors, `${optionPath}.text`, 'must be a non-empty string');
      }
    });

    if (typeof question.correctOptionId !== 'string' || question.correctOptionId.length === 0) {
      addError(errors, `${prefix}.correctOptionId`, 'must be a non-empty string');
    } else if (!optionIds.has(question.correctOptionId)) {
      addError(errors, `${prefix}.correctOptionId`, 'must match one of the optionIds');
    }
  }

  if (typeof question.explanationSummary !== 'string' || question.explanationSummary.length === 0) {
    addError(errors, `${prefix}.explanationSummary`, 'must be a non-empty string');
  }

  if (typeof question.explanationDetailed !== 'string' || question.explanationDetailed.length === 0) {
    addError(errors, `${prefix}.explanationDetailed`, 'must be a non-empty string');
  }

  if (typeof question.topic !== 'string' || question.topic.length === 0) {
    addError(errors, `${prefix}.topic`, 'must be a non-empty string');
  }

  if (typeof question.difficulty !== 'string' || !DIFFICULTIES.has(question.difficulty)) {
    addError(errors, `${prefix}.difficulty`, 'must be one of: easy, medium, hard');
  }

  if (typeof question.weight !== 'number' || question.weight <= 0) {
    addError(errors, `${prefix}.weight`, 'must be a number greater than 0');
  }
}
