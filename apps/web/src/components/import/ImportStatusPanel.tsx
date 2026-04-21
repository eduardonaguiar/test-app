import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
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
    return (
      <Alert aria-live="polite" variant="warning" aria-label="Status da importação">
        <AlertTitle>Importando...</AlertTitle>
        <AlertDescription>Aguarde enquanto a API valida e persiste a prova.</AlertDescription>
      </Alert>
    );
  }

  if (successResult) {
    return (
      <Card aria-live="polite" aria-label="Importação concluída com sucesso">
        <CardHeader>
          <CardTitle>Prova importada com sucesso</CardTitle>
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
    );
  }

  if (failure) {
    return (
      <Alert variant="destructive" aria-live="polite" aria-label="Falha na importação">
        <AlertTitle>{failure.kind === 'validation' ? 'Arquivo inválido para importação' : 'Falha técnica na importação'}</AlertTitle>
        <AlertDescription>{failure.message}</AlertDescription>
        <ValidationErrorList errors={failure.validationErrors} />
      </Alert>
    );
  }

  return (
    <Alert aria-live="polite" aria-label="Status da importação">
      <AlertTitle>Aguardando importação</AlertTitle>
      <AlertDescription>Selecione um arquivo JSON e clique em “Importar prova” para iniciar.</AlertDescription>
    </Alert>
  );
}
