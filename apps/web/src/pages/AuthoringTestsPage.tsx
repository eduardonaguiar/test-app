import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthoringTestCard } from '../components/exams/AuthoringTestCard';
import { CardSkeleton } from '../components/feedback/CardSkeleton';
import { EmptyState } from '../components/feedback/EmptyState';
import { InlineError } from '../components/feedback/InlineError';
import { PageHeader } from '../components/layout/PageHeader';
import { PageSection } from '../components/layout/PageSection';
import { listAuthoringTests, type AuthoringTestSummary } from '../services/authoringTests';

type AuthoringTestsState = {
  items: AuthoringTestSummary[];
};

export function AuthoringTestsPage() {
  const [state, setState] = useState<AuthoringTestsState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTests() {
      setErrorMessage(null);
      const response = await listAuthoringTests(controller.signal);
      setState({ items: response.items });
    }

    loadTests().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      setErrorMessage('Não foi possível carregar os testes autoráveis no momento.');
    });

    return () => {
      controller.abort();
    };
  }, [refreshToken]);

  return (
    <div className="stack-md">
      <PageHeader
        title="Meus testes"
        description="Crie, edite e publique simulados para uso na aplicação."
        actions={
          <Link className="ui-button ui-button--default ui-button--default-size" to="/authoring/tests/new">
            Criar novo teste
          </Link>
        }
      />

      {errorMessage ? (
        <InlineError
          title="Falha ao carregar testes"
          description={errorMessage}
          onRetry={() => {
            setState(null);
            setRefreshToken((current) => current + 1);
          }}
        />
      ) : null}

      {!state && !errorMessage ? (
        <CardSkeleton count={3} minHeight={170} />
      ) : null}

      {state ? (
        <PageSection title="Listagem editorial" ariaLabel="Listagem editorial de testes">
          {state.items.length === 0 ? (
            <EmptyState
              title="Você ainda não criou nenhum teste"
              description="Crie seu primeiro simulado manualmente para começar a montar provas dentro da aplicação."
              action={
                <Link className="ui-button ui-button--default ui-button--default-size" to="/authoring/tests/new">
                  Criar novo teste
                </Link>
              }
            />
          ) : (
            <div className="authoring-test-grid">
              {state.items.map((test) => (
                <AuthoringTestCard key={test.examId} test={test} />
              ))}
            </div>
          )}
        </PageSection>
      ) : null}
    </div>
  );
}
