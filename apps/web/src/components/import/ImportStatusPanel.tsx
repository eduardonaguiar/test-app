import { Link } from 'react-router-dom';
import { InlineError } from '../feedback/InlineError';
import { PageLoading } from '../feedback/PageLoading';
import { SuccessAlert } from '../feedback/SuccessAlert';
import { Button } from '../ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import type { ImportExamFailure, ImportExamSuccess } from '../../services/examImport';
import { ValidationErrorList } from './ValidationErrorList';

type ImportStatusPanelProps = {
  isSubmitting: boolean;
  successResult: ImportExamSuccess | null;
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
          title="Prova importada com sucesso"
          description="A prova já está disponível no catálogo e pronta para tentativa."
        />

        <Card>
          <CardHeader>
            <CardTitle>Resumo da importação</CardTitle>
          </CardHeader>

          <CardContent>
            <dl className="meta-grid">
              <div>
                <dt>ID da prova</dt>
                <dd>{successResult.examId}</dd>
              </div>
              <div>
                <dt>Título</dt>
                <dd>{successResult.title}</dd>
              </div>
              <div>
                <dt>Seções</dt>
                <dd>{successResult.sectionCount}</dd>
              </div>
              <div>
                <dt>Questões</dt>
                <dd>{successResult.questionCount}</dd>
              </div>
            </dl>
          </CardContent>

          <CardFooter className="inline-links">
            <Link className="ui-button ui-button--default ui-button--default-size" to={`/exams/${successResult.examId}`}>
              Ver prova
            </Link>
            <Link className="ui-button ui-button--outline ui-button--default-size" to="/">
              Voltar para lista
            </Link>
            <Button variant="outline" onClick={onReset}>
              Importar outra
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (failure) {
    return (
      <InlineError
        title={failure.kind === 'validation' ? 'Arquivo inválido para importação' : 'Falha técnica na importação'}
        description={failure.message}
        role="alert"
        aria-live="polite"
        aria-label="Falha na importação"
      >
        <ValidationErrorList errors={failure.validationErrors} />
      </InlineError>
    );
  }

  return (
    <SuccessAlert
      title="Aguardando importação"
      description="Selecione um arquivo JSON e clique em “Importar prova” para iniciar."
      aria-live="polite"
      aria-label="Status da importação"
    />
  );
}
