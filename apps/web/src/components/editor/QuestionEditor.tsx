import { useMemo, useState } from 'react';
import type { EditorExamQuestion } from '../../services/authoringEditor';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { OptionEditor } from './OptionEditor';

type QuestionEditorProps = {
  initialQuestion: EditorExamQuestion;
  sectionTitle: string;
  onSave: (question: EditorExamQuestion) => void;
  onCancel: () => void;
};

type FieldErrorMap = {
  prompt?: string;
  options?: string;
  correctOptionId?: string;
  weight?: string;
};

function validateQuestion(question: EditorExamQuestion): { errors: FieldErrorMap; warnings: string[] } {
  const errors: FieldErrorMap = {};
  const warnings: string[] = [];

  if (question.prompt.trim().length < 20) {
    errors.prompt = 'O enunciado deve ter pelo menos 20 caracteres.';
  }

  if (question.options.length < 2 || question.options.filter((option) => option.text.trim()).length < 2) {
    errors.options = 'Cadastre ao menos 2 alternativas com texto.';
  }

  if (!question.options.some((option) => option.optionId === question.correctOptionId)) {
    errors.correctOptionId = 'Selecione uma alternativa correta válida.';
  }

  if (!Number.isFinite(question.weight) || question.weight <= 0) {
    errors.weight = 'O peso deve ser maior que zero.';
  } else if (question.weight > 10) {
    warnings.push('Peso acima do padrão recomendado (1-10).');
  }

  if (!question.topic?.trim()) {
    warnings.push('Tópico não informado.');
  }

  if (!question.explanationSummary.trim() || !question.explanationDetailed.trim()) {
    warnings.push('Inclua explicações para fortalecer a revisão final.');
  }

  return { errors, warnings };
}

export function QuestionEditor({ initialQuestion, sectionTitle, onSave, onCancel }: QuestionEditorProps) {
  const [question, setQuestion] = useState<EditorExamQuestion>(initialQuestion);
  const validation = useMemo(() => validateQuestion(question), [question]);

  return (
    <form
      className="question-editor"
      onSubmit={(event) => {
        event.preventDefault();
        if (Object.keys(validation.errors).length > 0) {
          return;
        }

        onSave(question);
      }}
    >
      <header className="question-editor__header">
        <h2>{initialQuestion.prompt.trim() ? 'Editar questão' : 'Nova questão'}</h2>
        <p>Seção: {sectionTitle || 'Seção sem título'}</p>
      </header>

      <section className="question-editor__block">
        <h3>Enunciado</h3>
        <Label htmlFor="question-prompt">Enunciado</Label>
        <Textarea
          id="question-prompt"
          value={question.prompt}
          onChange={(event) => setQuestion((current) => ({ ...current, prompt: event.target.value }))}
          rows={5}
          placeholder="Descreva a pergunta de forma clara."
        />
        {validation.errors.prompt ? <p className="editor-field-error">{validation.errors.prompt}</p> : null}
      </section>

      <section className="question-editor__block">
        <h3>Metadados</h3>
        <div className="editor-form-grid">
          <label>
            <span className="ui-label">Tópico</span>
            <Input
              value={question.topic ?? ''}
              onChange={(event) => setQuestion((current) => ({ ...current, topic: event.target.value }))}
              placeholder="Ex: Aggregate, Bounded Context"
            />
          </label>

          <label>
            <span className="ui-label">Dificuldade</span>
            <select
              className="ui-input"
              value={question.difficulty ?? 'medium'}
              onChange={(event) =>
                setQuestion((current) => ({ ...current, difficulty: event.target.value as EditorExamQuestion['difficulty'] }))
              }
            >
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </label>

          <label>
            <span className="ui-label">Peso</span>
            <Input
              type="number"
              value={question.weight}
              min={1}
              step={1}
              onChange={(event) => setQuestion((current) => ({ ...current, weight: Number(event.target.value) }))}
            />
            {validation.errors.weight ? <p className="editor-field-error">{validation.errors.weight}</p> : null}
          </label>
        </div>
      </section>

      <section className="question-editor__block">
        <OptionEditor
          options={question.options}
          correctOptionId={question.correctOptionId}
          onChangeOption={(optionId, text) =>
            setQuestion((current) => ({
              ...current,
              options: current.options.map((option) => (option.optionId === optionId ? { ...option, text } : option)),
            }))
          }
          onAddOption={() =>
            setQuestion((current) => ({
              ...current,
              options: [...current.options, { optionId: crypto.randomUUID(), text: '' }],
            }))
          }
          onRemoveOption={(optionId) =>
            setQuestion((current) => {
              if (current.options.length <= 2) {
                return current;
              }

              const remaining = current.options.filter((option) => option.optionId !== optionId);
              const nextCorrectOptionId =
                current.correctOptionId === optionId ? (remaining[0]?.optionId ?? current.correctOptionId) : current.correctOptionId;

              return {
                ...current,
                options: remaining,
                correctOptionId: nextCorrectOptionId,
              };
            })
          }
          onChangeCorrect={(optionId) => setQuestion((current) => ({ ...current, correctOptionId: optionId }))}
        />
        {validation.errors.options ? <p className="editor-field-error">{validation.errors.options}</p> : null}
        {validation.errors.correctOptionId ? <p className="editor-field-error">{validation.errors.correctOptionId}</p> : null}
      </section>

      <section className="question-editor__block">
        <h3>Explicações</h3>
        <label>
          <span className="ui-label">Explicação resumida</span>
          <Textarea
            value={question.explanationSummary}
            onChange={(event) => setQuestion((current) => ({ ...current, explanationSummary: event.target.value }))}
            rows={3}
            placeholder="Resumo para feedback rápido."
          />
        </label>

        <label>
          <span className="ui-label">Explicação detalhada</span>
          <Textarea
            value={question.explanationDetailed}
            onChange={(event) => setQuestion((current) => ({ ...current, explanationDetailed: event.target.value }))}
            rows={6}
            placeholder="Detalhe o raciocínio e a justificativa da resposta correta."
          />
        </label>
      </section>

      {validation.warnings.length > 0 ? (
        <ul className="question-editor__warnings">
          {validation.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      <footer className="question-editor__actions">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={Object.keys(validation.errors).length > 0}>
          Salvar questão
        </Button>
      </footer>
    </form>
  );
}
