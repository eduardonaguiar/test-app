import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

type EditorSidebarProps = {
  status: 'draft' | 'published';
  sectionCount: number;
  questionCount: number;
  errors: string[];
  warnings: string[];
  onPublish: () => void;
  publishDisabled: boolean;
};

function getEditorialState(errors: string[], status: 'draft' | 'published') {
  if (errors.length > 0) {
    return 'Faltam itens obrigatórios';
  }

  if (status === 'published') {
    return 'Publicado';
  }

  return 'Pronto para publicação';
}

export function EditorSidebar({ status, sectionCount, questionCount, errors, warnings, onPublish, publishDisabled }: EditorSidebarProps) {
  return (
    <aside className="editor-sidebar" aria-label="Resumo editorial">
      <section className="editor-sidebar__card">
        <h2>Resumo</h2>
        <div className="editor-sidebar__status-row">
          <Badge variant={status === 'published' ? 'success' : 'secondary'}>{status === 'published' ? 'Publicado' : 'Rascunho'}</Badge>
          <p>{getEditorialState(errors, status)}</p>
        </div>
      </section>

      <section className="editor-sidebar__card">
        <h2>Contagem</h2>
        <dl className="editor-sidebar__count-grid">
          <div>
            <dt>Seções</dt>
            <dd>{sectionCount}</dd>
          </div>
          <div>
            <dt>Questões</dt>
            <dd>{questionCount}</dd>
          </div>
        </dl>
      </section>

      <section className="editor-sidebar__card">
        <h2>Validação</h2>
        {errors.length === 0 && warnings.length === 0 ? <p>Nenhum alerta no momento.</p> : null}

        {errors.length > 0 ? (
          <>
            <strong>Erros</strong>
            <ul>
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </>
        ) : null}

        {warnings.length > 0 ? (
          <>
            <strong>Avisos</strong>
            <ul>
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <Button onClick={onPublish} disabled={publishDisabled} title={publishDisabled ? 'Corrija os erros para publicar.' : undefined}>
        Publicar teste
      </Button>
    </aside>
  );
}
