import { useRef } from 'react';
import type { EditorExamQuestion, EditorExamSection } from '../../services/authoringEditor';
import { createEmptyEditorQuestion } from '../../services/authoringEditor';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogRoot, DialogTitle, DialogTrigger } from '../ui/dialog';
import { QuestionEditor } from './QuestionEditor';

type QuestionListProps = {
  sections: EditorExamSection[];
  onAddQuestion: (sectionId: string, question: EditorExamQuestion) => void;
  onUpdateQuestion: (sectionId: string, question: EditorExamQuestion) => void;
  onRemoveQuestion: (sectionId: string, questionId: string) => void;
};

function getQuestionStatus(question: EditorExamQuestion): { label: string; variant: 'success' | 'warning' | 'destructive' } {
  const hasPrompt = question.prompt.trim().length >= 20;
  const validOptions = question.options.filter((option) => option.text.trim().length > 0);
  const hasValidOptions = validOptions.length >= 2;
  const hasCorrect = question.options.some((option) => option.optionId === question.correctOptionId);

  if (hasPrompt && hasValidOptions && hasCorrect) {
    return { label: 'Válida', variant: 'success' };
  }

  if (question.prompt.trim() || validOptions.length > 0) {
    return { label: 'Incompleta', variant: 'warning' };
  }

  return { label: 'Inválida', variant: 'destructive' };
}

export function QuestionList({ sections, onAddQuestion, onUpdateQuestion, onRemoveQuestion }: QuestionListProps) {
  return (
    <section className="questions-editor">
      <header className="sections-editor__header">
        <div>
          <h2>Questões por seção</h2>
          <p>Gerencie enunciado, alternativas, gabarito e explicações sem sair do editor.</p>
        </div>
      </header>

      <div className="questions-editor__sections">
        {sections.map((section) => (
          <article key={section.sectionId} className="questions-editor__section-card">
            <header className="questions-editor__section-header">
              <div>
                <h3>{section.title || 'Seção sem título'}</h3>
                <p>{section.description || 'Sem descrição.'}</p>
              </div>

              <QuestionEditorDialog
                triggerLabel="Adicionar questão"
                triggerClassName="ui-button ui-button--default ui-button--default-size"
                initialQuestion={createEmptyEditorQuestion()}
                sectionTitle={section.title}
                onSave={(question) => onAddQuestion(section.sectionId, question)}
              />
            </header>

            {section.questions.length === 0 ? <p className="is-muted">Nenhuma questão criada nesta seção.</p> : null}

            <ol className="questions-editor__items">
              {section.questions.map((question, index) => {
                const status = getQuestionStatus(question);
                return (
                  <li key={question.questionId} className="questions-editor__item">
                    <div>
                      <p className="questions-editor__item-title">
                        Questão {index + 1} <Badge variant={status.variant}>{status.label}</Badge>
                      </p>
                      <p className="questions-editor__item-preview">{question.prompt.trim() || 'Enunciado ainda não definido.'}</p>
                    </div>

                    <div className="questions-editor__item-actions">
                      <QuestionEditorDialog
                        triggerLabel="Editar"
                        triggerClassName="ui-button ui-button--outline ui-button--sm"
                        initialQuestion={question}
                        sectionTitle={section.title}
                        onSave={(nextQuestion) => onUpdateQuestion(section.sectionId, nextQuestion)}
                      />

                      <DialogRoot>
                        <DialogTrigger className="ui-button ui-button--destructive ui-button--sm">Remover</DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Remover questão</DialogTitle>
                            <DialogDescription>Deseja remover esta questão? Essa ação não pode ser desfeita.</DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <DialogClose className="ui-button ui-button--ghost ui-button--default-size">Cancelar</DialogClose>
                            <Button type="button" variant="destructive" onClick={() => onRemoveQuestion(section.sectionId, question.questionId)}>
                              Confirmar remoção
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </DialogRoot>
                    </div>
                  </li>
                );
              })}
            </ol>
          </article>
        ))}
      </div>
    </section>
  );
}

type QuestionEditorDialogProps = {
  triggerLabel: string;
  triggerClassName: string;
  initialQuestion: EditorExamQuestion;
  sectionTitle: string;
  onSave: (question: EditorExamQuestion) => void;
};

function QuestionEditorDialog({ triggerLabel, triggerClassName, initialQuestion, sectionTitle, onSave }: QuestionEditorDialogProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  return (
    <DialogRoot>
      <DialogTrigger className={triggerClassName}>{triggerLabel}</DialogTrigger>
      <DialogContent className="question-editor-drawer">
        <QuestionEditor
          initialQuestion={initialQuestion}
          sectionTitle={sectionTitle}
          onCancel={() => closeRef.current?.click()}
          onSave={(question) => {
            onSave(question);
            closeRef.current?.click();
          }}
        />
        <DialogClose ref={closeRef} className="sr-only">
          Fechar
        </DialogClose>
      </DialogContent>
    </DialogRoot>
  );
}
