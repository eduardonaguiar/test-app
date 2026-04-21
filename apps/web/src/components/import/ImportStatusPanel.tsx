import { Link } from 'react-router-dom';
import type { ImportExamFailure, ImportExamSuccess } from '../../services/examImport';
import { ValidationErrorList } from './ValidationErrorList';

type ImportStatusPanelProps = {
  isSubmitting: boolean;
  successResult: ImportExamSuccess | null;
  failure: ImportExamFailure | null;
  onReset: () => void;
};

export function ImportStatusPanel({ isSubmitting, successResult, failure, onReset }: ImportStatusPanelProps) {
  if (isSubmitting) {
    return (
      <section className="exam-card" aria-live="polite" aria-label="Status da importação">
        <h2>Importando...</h2>
        <p>Aguarde enquanto a API valida e persiste a prova.</p>
      </section>
    );
  }

  if (successResult) {
    return (
      <section className="exam-card success-panel" aria-live="polite" aria-label="Importação concluída com sucesso">
        <h2>Prova importada com sucesso</h2>

        <dl className="exam-metadata">
          <div>
            <dt>ID da prova</dt>
            <dd>{successResult.examId}</dd>
          </div>
          <div>
            <dt>Título</dt>
            <dd>{successResult.title}</dd>
          </div>
          <div>
            <dt>Seções</dt>
            <dd>{successResult.sectionCount}</dd>
          </div>
          <div>
            <dt>Questões</dt>
            <dd>{successResult.questionCount}</dd>
          </div>
        </dl>

        <div className="inline-links">
          <Link className="details-button" to={`/exams/${successResult.examId}`}>
            Ver prova
          </Link>
          <Link className="details-button secondary" to="/">
            Voltar para lista
          </Link>
          <button type="button" className="details-button secondary as-button" onClick={onReset}>
            Importar outra
          </button>
        </div>
      </section>
    );
  }

  if (failure) {
    return (
      <section className="exam-card error-panel" aria-live="polite" aria-label="Falha na importação">
        <h2>{failure.kind === 'validation' ? 'Arquivo inválido para importação' : 'Falha técnica na importação'}</h2>
        <p>{failure.message}</p>
        <ValidationErrorList errors={failure.validationErrors} />
      </section>
    );
  }

  return (
    <section className="exam-card" aria-live="polite" aria-label="Status da importação">
      <h2>Aguardando importação</h2>
      <p>Selecione um arquivo JSON e clique em “Importar prova” para iniciar.</p>
    </section>
  );
}
