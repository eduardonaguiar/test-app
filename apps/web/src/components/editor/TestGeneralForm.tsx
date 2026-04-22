import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import type { EditorExamDraft } from '../../services/authoringEditor';
import {
  DESCRIPTION_MAX_LENGTH,
  MAX_DURATION_MINUTES,
  MIN_DURATION_MINUTES,
  type GeneralMetadataValidation,
} from './generalMetadataValidation';

type TestGeneralFormProps = {
  draft: EditorExamDraft;
  fieldErrors: GeneralMetadataValidation['fieldErrors'];
  onChange: (nextDraft: EditorExamDraft) => void;
};

function toPositiveInteger(value: string) {
  if (value.trim() === '') {
    return 0;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isNaN(parsedValue) ? 0 : parsedValue;
}

export function TestGeneralForm({ draft, fieldErrors, onChange }: TestGeneralFormProps) {
  return (
    <section className="editor-form-section">
      <article className="editor-form-block">
        <h2>Identidade da prova</h2>
        <p className="editor-form-block__description">Defina como a prova será identificada no catálogo e no editor.</p>
        <div className="stack-xs">
          <Label htmlFor="exam-title">Título da prova</Label>
          <Input
            id="exam-title"
            placeholder="Ex: DDD Avançado — Simulado Conceitual"
            value={draft.title}
            onChange={(event) => onChange({ ...draft, title: event.target.value })}
            aria-invalid={Boolean(fieldErrors.title)}
          />
          {fieldErrors.title ? <p className="editor-field-error">{fieldErrors.title}</p> : null}
        </div>

        <div className="stack-xs">
          <Label htmlFor="exam-description">Descrição</Label>
          <Textarea
            id="exam-description"
            rows={5}
            placeholder="Descreva o objetivo e o conteúdo da prova…"
            value={draft.description}
            onChange={(event) => onChange({ ...draft, description: event.target.value })}
            aria-invalid={Boolean(fieldErrors.description)}
          />
          <p className="editor-helper-text">{draft.description.length}/{DESCRIPTION_MAX_LENGTH} caracteres</p>
          {fieldErrors.description ? <p className="editor-field-error">{fieldErrors.description}</p> : null}
        </div>
      </article>

      <article className="editor-form-block">
        <h2>Configuração de tempo</h2>
        <p className="editor-form-block__description">Tempo total disponível para realização da prova.</p>
        <div className="stack-xs">
          <Label htmlFor="exam-duration">Duração da prova (minutos)</Label>
          <Input
            id="exam-duration"
            type="number"
            min={MIN_DURATION_MINUTES}
            max={MAX_DURATION_MINUTES}
            value={draft.durationMinutes}
            onChange={(event) => onChange({ ...draft, durationMinutes: toPositiveInteger(event.target.value) })}
            aria-invalid={Boolean(fieldErrors.durationMinutes)}
          />
          <p className="editor-helper-text">Tempo total disponível para realização.</p>
          {fieldErrors.durationMinutes ? <p className="editor-field-error">{fieldErrors.durationMinutes}</p> : null}
        </div>
      </article>

      <article className="editor-form-block">
        <h2>Critério de aprovação</h2>
        <p className="editor-form-block__description">Percentual mínimo de acertos necessário para aprovação.</p>
        <div className="stack-xs">
          <Label htmlFor="exam-passing-score">Nota mínima para aprovação (%)</Label>
          <div className="editor-input-with-unit">
            <Input
              id="exam-passing-score"
              type="number"
              min={0}
              max={100}
              value={draft.passingScorePercentage}
              onChange={(event) => onChange({ ...draft, passingScorePercentage: toPositiveInteger(event.target.value) })}
              aria-invalid={Boolean(fieldErrors.passingScorePercentage)}
            />
            <span>%</span>
          </div>
          <p className="editor-helper-text">Percentual mínimo de acertos para aprovação.</p>
          {fieldErrors.passingScorePercentage ? <p className="editor-field-error">{fieldErrors.passingScorePercentage}</p> : null}
        </div>
      </article>

      <article className="editor-form-block">
        <h2>Política de reconexão</h2>
        <p className="editor-form-block__description">
          Define como o sistema se comporta caso a conexão do usuário seja interrompida durante a prova.
        </p>

        <label className="editor-switch-row">
          <input
            type="checkbox"
            checked={draft.reconnectPolicy.enabled}
            onChange={(event) =>
              onChange({
                ...draft,
                reconnectPolicy: {
                  ...draft.reconnectPolicy,
                  enabled: event.target.checked,
                },
              })
            }
          />
          <span>Permitir reconexão</span>
        </label>

        {draft.reconnectPolicy.enabled ? (
          <div className="editor-form-grid">
            <div className="stack-xs">
              <Label htmlFor="exam-max-reconnects">Número máximo de reconexões</Label>
              <Input
                id="exam-max-reconnects"
                type="number"
                min={0}
                value={draft.reconnectPolicy.maxReconnectAttempts}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    reconnectPolicy: {
                      ...draft.reconnectPolicy,
                      maxReconnectAttempts: toPositiveInteger(event.target.value),
                    },
                  })
                }
                aria-invalid={Boolean(fieldErrors['reconnectPolicy.maxReconnectAttempts'])}
              />
              {fieldErrors['reconnectPolicy.maxReconnectAttempts'] ? (
                <p className="editor-field-error">{fieldErrors['reconnectPolicy.maxReconnectAttempts']}</p>
              ) : null}
            </div>

            <div className="stack-xs">
              <Label htmlFor="exam-grace-period">Tempo de tolerância por reconexão (segundos)</Label>
              <Input
                id="exam-grace-period"
                type="number"
                min={0}
                value={draft.reconnectPolicy.gracePeriodSeconds}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    reconnectPolicy: {
                      ...draft.reconnectPolicy,
                      gracePeriodSeconds: toPositiveInteger(event.target.value),
                    },
                  })
                }
                aria-invalid={Boolean(fieldErrors['reconnectPolicy.gracePeriodSeconds'])}
              />
              {fieldErrors['reconnectPolicy.gracePeriodSeconds'] ? (
                <p className="editor-field-error">{fieldErrors['reconnectPolicy.gracePeriodSeconds']}</p>
              ) : null}
            </div>

            <label className="editor-switch-row">
              <input
                type="checkbox"
                checked={draft.reconnectPolicy.terminateIfExceeded}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    reconnectPolicy: {
                      ...draft.reconnectPolicy,
                      terminateIfExceeded: event.target.checked,
                    },
                  })
                }
              />
              <span>Encerrar prova ao exceder limite de reconexões</span>
            </label>
          </div>
        ) : null}
      </article>
    </section>
  );
}
