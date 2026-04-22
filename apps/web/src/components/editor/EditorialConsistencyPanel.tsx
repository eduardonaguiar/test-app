import type { EditorialValidationResult, ValidationIssue } from '../../services/editorialValidation';
import { Badge } from '../ui/badge';

type EditorialConsistencyPanelProps = {
  validation: EditorialValidationResult;
};

function ValidationList({ issues, emptyMessage }: { issues: ValidationIssue[]; emptyMessage: string }) {
  if (issues.length === 0) {
    return <p className="editor-consistency-panel__empty">{emptyMessage}</p>;
  }

  return (
    <ul className="editor-consistency-panel__issue-list">
      {issues.map((issue) => (
        <li key={`${issue.code}:${issue.path ?? issue.message}`}>{issue.message}</li>
      ))}
    </ul>
  );
}

export function EditorialConsistencyPanel({ validation }: EditorialConsistencyPanelProps) {
  const statusText = validation.isPublishable ? 'Pronta para publicação' : 'Não pronta para publicação';

  return (
    <section className="editor-consistency-panel" aria-label="Painel de consistência editorial">
      <header className="editor-consistency-panel__header">
        <div>
          <h2>Consistência da prova</h2>
          <p>{statusText}</p>
        </div>
        <Badge variant={validation.isPublishable ? 'success' : 'destructive'}>
          {validation.isPublishable ? 'Publicável' : 'Bloqueada'}
        </Badge>
      </header>

      <dl className="editor-consistency-panel__summary-grid">
        <div>
          <dt>Erros impeditivos</dt>
          <dd>{validation.summary.blockingErrorCount}</dd>
        </div>
        <div>
          <dt>Avisos</dt>
          <dd>{validation.summary.warningCount}</dd>
        </div>
        <div>
          <dt>Seções</dt>
          <dd>{validation.summary.sectionCount}</dd>
        </div>
        <div>
          <dt>Questões</dt>
          <dd>{validation.summary.questionCount}</dd>
        </div>
        <div>
          <dt>Questões válidas</dt>
          <dd>{validation.summary.validQuestionCount}</dd>
        </div>
      </dl>

      <section className="editor-consistency-panel__issues editor-consistency-panel__issues--blocking">
        <h3>Erros impeditivos</h3>
        <ValidationList issues={validation.blockingErrors} emptyMessage="Nenhum erro impeditivo encontrado." />
      </section>

      <section className="editor-consistency-panel__issues editor-consistency-panel__issues--warning">
        <h3>Avisos editoriais</h3>
        <ValidationList issues={validation.warnings} emptyMessage="Nenhum aviso editorial pendente." />
      </section>

      {validation.isPublishable && validation.warnings.length === 0 ? (
        <p className="editor-consistency-panel__all-good">Tudo consistente. Sua prova está pronta para publicação.</p>
      ) : null}
    </section>
  );
}
