import { useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

export type SectionFormValues = {
  title: string;
  description: string;
};

type SectionFormProps = {
  initialValues: SectionFormValues;
  submitLabel: string;
  onSubmit: (values: SectionFormValues) => void;
  onCancel: () => void;
};

const MIN_TITLE_LENGTH = 2;
const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 240;

export function SectionForm({ initialValues, submitLabel, onSubmit, onCancel }: SectionFormProps) {
  const [values, setValues] = useState<SectionFormValues>(initialValues);
  const [touched, setTouched] = useState(false);

  const titleError = useMemo(() => {
    const trimmedTitle = values.title.trim();

    if (trimmedTitle.length === 0) {
      return 'Informe um título para a seção.';
    }

    if (trimmedTitle.length < MIN_TITLE_LENGTH) {
      return `Use pelo menos ${MIN_TITLE_LENGTH} caracteres no título.`;
    }

    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      return `Use no máximo ${MAX_TITLE_LENGTH} caracteres no título.`;
    }

    return null;
  }, [values.title]);

  const descriptionError = values.description.length > MAX_DESCRIPTION_LENGTH ? `Use no máximo ${MAX_DESCRIPTION_LENGTH} caracteres na descrição.` : null;

  const hasErrors = Boolean(titleError || descriptionError);

  return (
    <form
      className="sections-editor__form"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);

        if (hasErrors) {
          return;
        }

        onSubmit({
          title: values.title.trim(),
          description: values.description.trim(),
        });
      }}
    >
      <label className="stack-xs">
        <span>Título da seção</span>
        <Input
          value={values.title}
          onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
          placeholder="Ex.: Fundamentos"
          required
        />
        {touched && titleError ? <p className="editor-field-error">{titleError}</p> : null}
      </label>

      <label className="stack-xs">
        <span>Descrição (opcional)</span>
        <Textarea
          value={values.description}
          onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
          placeholder="Objetivo editorial da seção"
          rows={3}
        />
        <p className="editor-helper-text">Até {MAX_DESCRIPTION_LENGTH} caracteres.</p>
        {descriptionError ? <p className="editor-field-error">{descriptionError}</p> : null}
      </label>

      <div className="sections-editor__form-actions">
        <Button type="submit">{submitLabel}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
