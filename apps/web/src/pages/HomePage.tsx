import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { PageSection } from '../components/layout/PageSection';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import type { ListExamsResponse } from '../generated/api-contract';
import { listExams } from '../generated/api-contract';

type ExamsState = {
  exams: ListExamsResponse['items'];
};

export function HomePage() {
  const [state, setState] = useState<ExamsState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadExams() {
      const examsResult = await listExams(controller.signal);
      setState({ exams: examsResult.items });
    }

    loadExams().catch((error) => {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      setErrorMessage('Não foi possível carregar as provas importadas da API.');
    });

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <div className="stack-md">
      <PageHeader
        title="Simulados"
        description="Catálogo de provas importadas e prontas para tentativa."
        actions={
          <Link className="ui-button ui-button--default ui-button--default-size" to="/exams/import">
            Importar prova
          </Link>
        }
      />

      <PageSection>
        <div className="inline-links">
          <Link className="ui-button ui-button--outline ui-button--default-size" to="/history">
            Ver histórico de tentativas
          </Link>
          <Link className="ui-button ui-button--outline ui-button--default-size" to="/dashboard">
            Ver dashboard de desempenho
          </Link>
        </div>
      </PageSection>

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Falha ao carregar provas</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : state ? (
        <PageSection ariaLabel="Lista de provas">
          {state.exams.length === 0 ? (
            <Alert>
              <AlertTitle>Nenhuma prova encontrada</AlertTitle>
              <AlertDescription>Importe a primeira prova para começar a estudar.</AlertDescription>
            </Alert>
          ) : (
            <div className="stack-md">
              {state.exams.map((exam) => (
                <Card key={exam.examId}>
                  <CardHeader>
                    <CardTitle>{exam.title}</CardTitle>
                    <CardDescription>{exam.description ?? 'Sem descrição informada.'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <dl className="meta-grid">
                      <div>
                        <dt>Duração</dt>
                        <dd>{exam.durationMinutes} min</dd>
                      </div>
                      <div>
                        <dt>Passing score</dt>
                        <dd>{exam.passingScorePercentage}%</dd>
                      </div>
                      <div>
                        <dt>Questões</dt>
                        <dd>{exam.questionCount ?? '—'}</dd>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd>
                          <Badge variant="secondary">Pronta para tentativa</Badge>
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                  <CardFooter>
                    <Link className="ui-button ui-button--default ui-button--default-size" to={`/exams/${exam.examId}`}>
                      Abrir detalhes
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </PageSection>
      ) : (
        <Alert>
          <AlertTitle>Carregando provas</AlertTitle>
          <AlertDescription>Buscando catálogo de provas importadas...</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
