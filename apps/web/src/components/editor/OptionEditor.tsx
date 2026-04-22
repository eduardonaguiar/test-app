import { Button } from '../ui/button';
import { Input } from '../ui/input';

type OptionValue = {
  optionId: string;
  text: string;
};

type OptionEditorProps = {
  options: OptionValue[];
  correctOptionId: string;
  onChangeOption: (optionId: string, text: string) => void;
  onAddOption: () => void;
  onRemoveOption: (optionId: string) => void;
  onChangeCorrect: (optionId: string) => void;
};

export function OptionEditor({
  options,
  correctOptionId,
  onChangeOption,
  onAddOption,
  onRemoveOption,
  onChangeCorrect,
}: OptionEditorProps) {
  return (
    <fieldset className="question-editor__fieldset">
      <legend>Alternativas</legend>
      <p className="editor-helper-text">Adicione pelo menos 2 alternativas e marque apenas uma como correta.</p>

      <div className="question-editor__options-list">
        {options.map((option, index) => {
          const optionLabelId = `option-label-${option.optionId}`;
          return (
            <div key={option.optionId} className="question-editor__option-item">
              <label className="question-editor__option-radio" htmlFor={`correct-${option.optionId}`}>
                <input
                  id={`correct-${option.optionId}`}
                  type="radio"
                  name="correct-option"
                  checked={correctOptionId === option.optionId}
                  onChange={() => onChangeCorrect(option.optionId)}
                />
                <span className="sr-only" id={optionLabelId}>
                  Marcar alternativa {index + 1} como correta
                </span>
              </label>

              <Input
                value={option.text}
                onChange={(event) => onChangeOption(option.optionId, event.target.value)}
                placeholder={`Alternativa ${index + 1}`}
                aria-label={`Texto da alternativa ${index + 1}`}
              />

              <Button type="button" variant="ghost" onClick={() => onRemoveOption(option.optionId)} disabled={options.length <= 2}>
                Remover
              </Button>
            </div>
          );
        })}
      </div>

      <Button type="button" variant="outline" onClick={onAddOption}>
        Adicionar alternativa
      </Button>
    </fieldset>
  );
}
