import type { ImportValidationError } from '../../services/examImport';

type ValidationErrorListProps = {
  errors: ImportValidationError[];
};

export function ValidationErrorList({ errors }: ValidationErrorListProps) {
  if (errors.length === 0) {
    return <p className="subtitle">Nenhum detalhe de validação foi informado pela API.</p>;
  }

  return (
    <div className="stack-xs">
      <p className="subtitle">Corrija os itens abaixo no JSON e tente novamente:</p>
      <ul className="validation-error-list">
        {errors.map((error) => (
          <li key={`${error.path}:${error.message}`}>
            <strong>{error.path || 'payload'}</strong>
            <span>{error.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
