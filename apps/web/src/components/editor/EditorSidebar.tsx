import { Badge } from '../ui/badge';
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import type { EditorialValidationResult } from '../../services/editorialValidation';

type EditorSidebarProps = {
  status: 'draft' | 'published';
  validation: EditorialValidationResult;
  onPublish: () => void;
  publishDisabled: boolean;
  publishBlockedReason?: string;
};

function getEditorialState(validation: EditorialValidationResult, status: 'draft' | 'published') {
  if (validation.summary.blockingErrorCount > 0) {
    return 'Faltam itens obrigatórios';
  }

  if (status === 'published') {
    return 'Publicado';
  }

  return 'Pronto para publicação';
}

export function EditorSidebar({ status, validation, onPublish, publishDisabled, publishBlockedReason }: EditorSidebarProps) {
  return (
    <aside className="editor-sidebar" aria-label="Resumo editorial">
      <section className="editor-sidebar__card">
        <h2>Resumo</h2>
        <div className="editor-sidebar__status-row">
          <Badge variant={status === 'published' ? 'success' : 'secondary'}>{status === 'published' ? 'Publicado' : 'Rascunho'}</Badge>
          <p>{getEditorialState(validation, status)}</p>
          <p>Publicável: {validation.isPublishable ? 'Sim' : 'Não'}</p>
        </div>
      </section>

      <section className="editor-sidebar__card">
        <h2>Contagem</h2>
        <dl className="editor-sidebar__count-grid">
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
      </section>

      <section className="editor-sidebar__card">
        <h2>Validação</h2>
        {validation.summary.blockingErrorCount === 0 && validation.summary.warningCount === 0 ? <p>Nenhum alerta no momento.</p> : null}

        {validation.blockingErrors.length > 0 ? (
          <>
            <strong>Erros impeditivos: {validation.summary.blockingErrorCount}</strong>
            <ul>
              {validation.blockingErrors.slice(0, 4).map((error) => (
                <li key={`${error.code}:${error.path ?? error.message}`}>{error.message}</li>
              ))}
            </ul>
          </>
        ) : null}

        {validation.warnings.length > 0 ? (
          <>
            <strong>Avisos: {validation.summary.warningCount}</strong>
            <ul>
              {validation.warnings.slice(0, 4).map((warning) => (
                <li key={`${warning.code}:${warning.path ?? warning.message}`}>{warning.message}</li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <DialogRoot>
        <DialogTrigger
          className="ui-button ui-button--default ui-button--default-size"
          disabled={publishDisabled}
          title={publishDisabled ? publishBlockedReason ?? 'Corrija os erros impeditivos para publicar.' : undefined}
        >
          Publicar teste
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar publicação</DialogTitle>
            <DialogDescription>A prova será disponibilizada no catálogo de simulados após esta ação.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className="ui-button ui-button--outline ui-button--default-size">Cancelar</DialogClose>
            <DialogClose className="ui-button ui-button--default ui-button--default-size" onClick={onPublish}>
              Confirmar publicação
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </aside>
  );
}
