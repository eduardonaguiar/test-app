import type { EditorExamDraft } from '../../services/authoringEditor';

export const TITLE_MIN_LENGTH = 5;
export const TITLE_MAX_LENGTH = 150;
export const DESCRIPTION_MAX_LENGTH = 1000;
export const MIN_DURATION_MINUTES = 5;
export const MAX_DURATION_MINUTES = 300;

type FieldErrors = Partial<
  Record<
    | 'title'
    | 'description'
    | 'durationMinutes'
    | 'passingScorePercentage'
    | 'reconnectPolicy.maxReconnectAttempts'
    | 'reconnectPolicy.gracePeriodSeconds',
    string
  >
>;

export type GeneralMetadataValidation = {
  errors: string[];
  warnings: string[];
  fieldErrors: FieldErrors;
};

export function validateGeneralMetadata(draft: EditorExamDraft): GeneralMetadataValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fieldErrors: FieldErrors = {};

  const title = draft.title.trim();
  if (!title) {
    errors.push('O teste precisa de um título.');
    fieldErrors.title = 'Informe o título da prova.';
  } else if (title.length < TITLE_MIN_LENGTH) {
    errors.push(`Título com menos de ${TITLE_MIN_LENGTH} caracteres.`);
    fieldErrors.title = `Use ao menos ${TITLE_MIN_LENGTH} caracteres.`;
  } else if (title.length > TITLE_MAX_LENGTH) {
    errors.push(`Título excede o máximo de ${TITLE_MAX_LENGTH} caracteres.`);
    fieldErrors.title = `Use no máximo ${TITLE_MAX_LENGTH} caracteres.`;
  }

  const descriptionLength = draft.description.trim().length;
  if (descriptionLength > DESCRIPTION_MAX_LENGTH) {
    errors.push(`Descrição excede o máximo de ${DESCRIPTION_MAX_LENGTH} caracteres.`);
    fieldErrors.description = `Use no máximo ${DESCRIPTION_MAX_LENGTH} caracteres.`;
  }

  if (!Number.isInteger(draft.durationMinutes) || draft.durationMinutes < MIN_DURATION_MINUTES || draft.durationMinutes > MAX_DURATION_MINUTES) {
    errors.push(`Duração inválida. Use um valor inteiro entre ${MIN_DURATION_MINUTES} e ${MAX_DURATION_MINUTES} minutos.`);
    fieldErrors.durationMinutes = `Informe um valor entre ${MIN_DURATION_MINUTES} e ${MAX_DURATION_MINUTES} minutos.`;
  } else if (draft.durationMinutes < 10) {
    warnings.push('Duração menor que 10 minutos pode ser curta para revisão.');
  }

  if (!Number.isInteger(draft.passingScorePercentage) || draft.passingScorePercentage < 0 || draft.passingScorePercentage > 100) {
    errors.push('Nota de corte inválida. Use um valor inteiro entre 0 e 100.');
    fieldErrors.passingScorePercentage = 'Informe um percentual entre 0 e 100.';
  } else {
    if (draft.passingScorePercentage < 40) {
      warnings.push('Pontuação de aprovação abaixo de 40% é incomum.');
    }

    if (draft.passingScorePercentage > 95) {
      warnings.push('Pontuação de aprovação acima de 95% pode tornar a aprovação rara.');
    }
  }

  if (draft.reconnectPolicy.enabled) {
    if (!Number.isInteger(draft.reconnectPolicy.maxReconnectAttempts) || draft.reconnectPolicy.maxReconnectAttempts < 0) {
      errors.push('Número máximo de reconexões inválido.');
      fieldErrors['reconnectPolicy.maxReconnectAttempts'] = 'Informe um valor inteiro maior ou igual a 0.';
    }

    if (!Number.isInteger(draft.reconnectPolicy.gracePeriodSeconds) || draft.reconnectPolicy.gracePeriodSeconds < 0) {
      errors.push('Tempo de tolerância por reconexão inválido.');
      fieldErrors['reconnectPolicy.gracePeriodSeconds'] = 'Informe um valor inteiro maior ou igual a 0.';
    }
  }

  return { errors, warnings, fieldErrors };
}
