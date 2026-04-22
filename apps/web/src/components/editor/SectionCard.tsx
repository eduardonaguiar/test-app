import { useState } from 'react';
import type { EditorExamSection } from '../../services/authoringEditor';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogRoot, DialogTitle, DialogTrigger } from '../ui/dialog';
import { SectionForm } from './SectionForm';

type SectionCardProps = {
  section: EditorExamSection;
  onUpdate: (sectionId: string, changes: Pick<EditorExamSection, 'title' | 'description'>) => void;
  onRemove: (sectionId: string) => void;
};

export function SectionCard({ section, onUpdate, onRemove }: SectionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const questionCount = section.questions.length;

  return (
    <article className="sections-editor__card">
      <header className="sections-editor__card-header">
        <div>
          <h3>{section.title || 'Seção sem título'}</h3>
          {section.description ? <p>{section.description}</p> : <p className="is-muted">Sem descrição.</p>}
        </div>

        <div className="sections-editor__card-actions">
          <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing((current) => !current)}>
            {isEditing ? 'Fechar edição' : 'Editar'}
          </Button>

          <DialogRoot>
            <DialogTrigger className="ui-button ui-button--destructive ui-button--sm">Remover</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Remover seção</DialogTitle>
                <DialogDescription>
                  {questionCount > 0
                    ? `Esta seção contém ${questionCount} questão(ões). Remover a seção também removerá esse conteúdo.`
                    : 'Remover esta seção da estrutura da prova?'}
                </DialogDescription>
              </DialogHeader>

              <DialogFooter>
                <DialogClose className="ui-button ui-button--ghost ui-button--default-size">Cancelar</DialogClose>
                <Button type="button" variant="destructive" onClick={() => onRemove(section.sectionId)}>
                  Confirmar remoção
                </Button>
              </DialogFooter>
            </DialogContent>
          </DialogRoot>
        </div>
      </header>

      <dl className="sections-editor__card-meta">
        <div>
          <dt>Ordem</dt>
          <dd>Seção {section.displayOrder}</dd>
        </div>
        <div>
          <dt>Questões</dt>
          <dd>
            <Badge variant={questionCount > 0 ? 'secondary' : 'outline'}>{questionCount}</Badge>
          </dd>
        </div>
      </dl>

      {isEditing ? (
        <SectionForm
          initialValues={{ title: section.title, description: section.description ?? '' }}
          submitLabel="Salvar seção"
          onSubmit={(values) => {
            onUpdate(section.sectionId, {
              title: values.title,
              description: values.description || null,
            });
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
        />
      ) : null}
    </article>
  );
}
