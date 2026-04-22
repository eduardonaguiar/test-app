import { Link } from 'react-router-dom';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import type { AuthoringTestSummary } from '../../services/authoringTests';

type AuthoringTestCardProps = {
  test: AuthoringTestSummary;
};

function getStatusVariant(status: AuthoringTestSummary['status']): 'secondary' | 'success' {
  if (status === 'published') {
    return 'success';
  }

  return 'secondary';
}

function getStatusLabel(status: AuthoringTestSummary['status']): string {
  if (status === 'published') {
    return 'Publicado';
  }

  return 'Rascunho';
}

function formatUpdatedAt(updatedAt?: string | null): string {
  if (!updatedAt) {
    return 'Sem atualização recente';
  }

  const parsedDate = new Date(updatedAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Sem atualização recente';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsedDate);
}

export function AuthoringTestCard({ test }: AuthoringTestCardProps) {
  return (
    <Card className="authoring-test-card">
      <CardHeader className="authoring-test-card__header">
        <div className="authoring-test-card__header-row">
          <CardTitle>{test.title}</CardTitle>
          <Badge variant={getStatusVariant(test.status)}>{getStatusLabel(test.status)}</Badge>
        </div>
        <CardDescription>{test.description || 'Sem descrição editorial no momento.'}</CardDescription>
      </CardHeader>

      <CardContent>
        <dl className="authoring-test-card__meta-grid">
          <div className="authoring-test-card__meta-item">
            <dt>Questões</dt>
            <dd>{test.questionCount}</dd>
          </div>
          <div className="authoring-test-card__meta-item">
            <dt>Seções</dt>
            <dd>{test.sectionCount}</dd>
          </div>
          <div className="authoring-test-card__meta-item authoring-test-card__meta-item--full">
            <dt>Última atualização</dt>
            <dd>{formatUpdatedAt(test.updatedAt)}</dd>
          </div>
        </dl>
      </CardContent>

      <CardFooter className="authoring-test-card__footer">
        <Link className="ui-button ui-button--outline ui-button--default-size" to={`/authoring/tests/${test.examId}/edit`}>
          Continuar edição
        </Link>
      </CardFooter>
    </Card>
  );
}
