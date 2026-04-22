import { Link } from 'react-router-dom';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

type EditorHeaderProps = {
  title: string;
  status: 'draft' | 'published';
  saveState: 'saved' | 'saving' | 'error';
  onPublish: () => void;
  publishDisabled: boolean;
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

export function EditorHeader({ title, status, saveState, onPublish, publishDisabled }: EditorHeaderProps) {
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
          <Button variant="outline">Preview</Button>
          <Button onClick={onPublish} disabled={publishDisabled}>
            Publicar
          </Button>
        </div>
      </div>
    </header>
  );
}
