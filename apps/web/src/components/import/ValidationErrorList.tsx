import type { ImportValidationError } from '../../services/examImport';

type ValidationErrorListProps = {
  errors: ImportValidationError[];
};

export function ValidationErrorList({ errors }: ValidationErrorListProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <ul className="validation-error-list">
      {errors.map((error) => (
        <li key={`${error.path}:${error.message}`}>
          <strong>{error.path || 'payload'}</strong>: {error.message}
        </li>
      ))}
    </ul>
  );
}
