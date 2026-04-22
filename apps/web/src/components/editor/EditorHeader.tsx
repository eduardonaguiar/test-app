import { Link } from 'react-router-dom';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
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

type EditorHeaderProps = {
  title: string;
  status: 'draft' | 'published';
  saveState: 'saved' | 'saving' | 'error';
  warningCount: number;
  sectionCount?: number;
  questionCount?: number;
  blockingErrorCount?: number;
  onPublish: () => void;
  publishDisabled: boolean;
  publishBlockedReason?: string;
  isPublished?: boolean;
};

function getStatusLabel(status: EditorHeaderProps['status']) {
  return status === 'published' ? 'Publicado' : 'Rascunho';
}

function getSaveLabel(saveState: EditorHeaderProps['saveState']) {
  if (saveState === 'saving') {
    return 'Salvando...';
  }

  if (saveState === 'error') {
    return 'Erro ao salvar';
  }

  return 'Salvo';
}

export function EditorHeader({
  title,
  status,
  saveState,
  warningCount,
  sectionCount = 0,
  questionCount = 0,
  blockingErrorCount = 0,
  onPublish,
  publishDisabled,
  publishBlockedReason,
  isPublished = false,
}: EditorHeaderProps) {
  return (
    <header className="editor-header">
      <div className="editor-header__content">
        <div className="editor-header__meta">
          <Link to="/authoring/tests" className="ui-button ui-button--ghost ui-button--sm">
            Voltar
          </Link>
          <div className="stack-xs">
            <strong className="editor-header__title">{title || 'Sem título'}</strong>
            <div className="editor-header__status-row">
              <Badge variant={status === 'published' ? 'success' : 'secondary'}>{getStatusLabel(status)}</Badge>
              <span className={`editor-header__save-indicator is-${saveState}`}>{getSaveLabel(saveState)}</span>
            </div>
          </div>
        </div>

        <div className="editor-header__actions">
          {warningCount > 0 && !publishDisabled ? (
            <span className="editor-header__warning-hint">Publicável com {warningCount} aviso(s).</span>
          ) : null}
          <Button variant="outline">Preview</Button>
          <DialogRoot>
            <DialogTrigger className="ui-button ui-button--default ui-button--default-size" disabled={publishDisabled} title={publishBlockedReason}>
              {isPublished ? 'Publicado' : 'Publicar'}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar publicação</DialogTitle>
                <DialogDescription>
                  Revise o resumo da prova antes de publicar. Após confirmar, ela ficará disponível no catálogo.
                </DialogDescription>
              </DialogHeader>
              <dl className="editor-publish-dialog__summary">
                <div>
                  <dt>Prova</dt>
                  <dd>{title || 'Sem título'}</dd>
                </div>
                <div>
                  <dt>Seções</dt>
                  <dd>{sectionCount}</dd>
                </div>
                <div>
                  <dt>Questões</dt>
                  <dd>{questionCount}</dd>
                </div>
                <div>
                  <dt>Erros impeditivos</dt>
                  <dd>{blockingErrorCount}</dd>
                </div>
                <div>
                  <dt>Avisos</dt>
                  <dd>{warningCount}</dd>
                </div>
              </dl>
              <DialogFooter>
                <DialogClose className="ui-button ui-button--outline ui-button--default-size">Cancelar</DialogClose>
                <DialogClose className="ui-button ui-button--default ui-button--default-size" onClick={onPublish}>
                  Confirmar publicação
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </DialogRoot>
        </div>
      </div>
    </header>
  );
}
