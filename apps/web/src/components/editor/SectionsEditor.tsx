import { useState } from 'react';
import type { EditorExamSection } from '../../services/authoringEditor';
import { EmptyState } from '../feedback/EmptyState';
import { Button } from '../ui/button';
import { SectionCard } from './SectionCard';
import { SectionForm } from './SectionForm';

type SectionsEditorProps = {
  sections: EditorExamSection[];
  onAddSection: (payload: Pick<EditorExamSection, 'title' | 'description'>) => void;
  onUpdateSection: (sectionId: string, payload: Pick<EditorExamSection, 'title' | 'description'>) => void;
  onRemoveSection: (sectionId: string) => void;
};

export function SectionsEditor({ sections, onAddSection, onUpdateSection, onRemoveSection }: SectionsEditorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const orderedSections = [...sections].sort((left, right) => left.displayOrder - right.displayOrder);

  return (
    <section className="sections-editor">
      <header className="sections-editor__header">
        <div>
          <h2>Seções da prova</h2>
          <p>Organize a prova em blocos temáticos ou pedagógicos.</p>
        </div>
        <Button type="button" onClick={() => setIsCreating((current) => !current)}>
          {isCreating ? 'Cancelar' : 'Adicionar seção'}
        </Button>
      </header>

      {isCreating ? (
        <article className="sections-editor__create-panel">
          <h3>Nova seção</h3>
          <SectionForm
            initialValues={{ title: '', description: '' }}
            submitLabel="Criar seção"
            onSubmit={(values) => {
              onAddSection({
                title: values.title,
                description: values.description || null,
              });
              setIsCreating(false);
            }}
            onCancel={() => setIsCreating(false)}
          />
        </article>
      ) : null}

      {orderedSections.length === 0 ? (
        <EmptyState
          title="Nenhuma seção criada ainda"
          description="Crie a primeira seção para começar a estruturar sua prova."
          action={
            <Button type="button" onClick={() => setIsCreating(true)}>
              Adicionar seção
            </Button>
          }
        />
      ) : (
        <div className="sections-editor__list">
          {orderedSections.map((section) => (
            <SectionCard key={section.sectionId} section={section} onUpdate={onUpdateSection} onRemove={onRemoveSection} />
          ))}
        </div>
      )}
    </section>
  );
}
