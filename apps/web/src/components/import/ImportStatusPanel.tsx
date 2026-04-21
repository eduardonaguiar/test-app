import { Link } from 'react-router-dom';
import { InlineError } from '../feedback/InlineError';
import { PageLoading } from '../feedback/PageLoading';
import { SuccessAlert } from '../feedback/SuccessAlert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import type { ImportExamFailure, ImportedExamSummary } from '../../services/examImport';
import { ValidationErrorList } from './ValidationErrorList';

type ImportStatusPanelProps = {
  isSubmitting: boolean;
  successResult: ImportedExamSummary | null;
  failure: ImportExamFailure | null;
  onReset: () => void;
};

export function ImportStatusPanel({ isSubmitting, successResult, failure, onReset }: ImportStatusPanelProps) {
  if (isSubmitting) {
    return <PageLoading message="Importando prova" description="Aguarde enquanto a API valida e persiste o arquivo." />;
  }

  if (successResult) {
    return (
      <div className="stack-md" aria-live="polite" aria-label="Importação concluída com sucesso">
        <SuccessAlert
          title="Simulado importado com sucesso"
          description="A prova foi validada e já está disponível para iniciar tentativas."
        />

        <Card>
          <CardHeader>
            <CardTitle>{successResult.title}</CardTitle>
            <p className="subtitle import-success-summary__subtitle">
              {successResult.questionCount} questões · {successResult.durationMinutes} min · {successResult.sectionCount} seções ·
              aprovação: {successResult.passingScorePercentage}%
            </p>
          </CardHeader>

          <CardContent>
            <dl className="meta-grid">
              <div>
                <dt>ID da prova</dt>
                <dd>{successResult.examId}</dd>
              </div>
              <div>
                <dt>Versão do schema</dt>
                <dd>
                  <Badge variant="outline">{successResult.schemaVersion}</Badge>
                </dd>
              </div>
              <div>
                <dt>Descrição</dt>
                <dd>{successResult.description || 'Sem descrição informada.'}</dd>
              </div>
            </dl>
          </CardContent>

          <CardFooter className="inline-links">
            <Link className="ui-button ui-button--default ui-button--default-size" to={`/exams/${successResult.examId}`}>
              Ver simulado
            </Link>
            <Link className="ui-button ui-button--outline ui-button--default-size" to="/">
              Voltar ao catálogo
            </Link>
            <Button variant="outline" onClick={onReset}>
              Importar outro
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (failure) {
    return (
      <InlineError
        title={failure.kind === 'validation' ? 'Validação da prova falhou' : 'Falha técnica na importação'}
        description={
          failure.kind === 'validation'
            ? 'O arquivo foi lido, mas não está compatível com o formato oficial esperado.'
            : failure.message
        }
        role="alert"
        aria-live="polite"
        aria-label="Falha na importação"
      >
        {failure.kind === 'validation' ? <ValidationErrorList errors={failure.validationErrors} /> : null}
      </InlineError>
    );
  }

  return (
    <SuccessAlert
      title="Fluxo de importação pronto"
      description="Selecione o arquivo, aguarde a validação local e depois clique em “Importar prova”."
      aria-live="polite"
      aria-label="Status da importação"
    />
  );
}
