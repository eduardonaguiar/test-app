import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { InlineError } from '../components/feedback/InlineError';
import { PageLoading } from '../components/feedback/PageLoading';
import { PageHeader } from '../components/layout/PageHeader';
import { PageSection } from '../components/layout/PageSection';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { createAttempt, type ExamDetailResponse } from '../generated/api-contract';

type ReconnectPolicyViewModel = {
  enabled: boolean;
  maxReconnectAttempts: number;
  gracePeriodSeconds: number;
  terminateAttemptIfExceeded?: boolean;
};

type ExamDetailsViewModel = {
  exam: ExamDetailResponse;
  reconnectPolicy: ReconnectPolicyViewModel | null;
  difficulty: string | null;
};

function formatDuration(durationMinutes: number): string {
  if (durationMinutes < 60) {
    return `${durationMinutes} min`;
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}min`;
}

function extractReconnectPolicy(payload: unknown): ReconnectPolicyViewModel | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = (payload as { reconnectPolicy?: unknown }).reconnectPolicy;

  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const normalized = candidate as {
    enabled?: unknown;
    maxReconnectAttempts?: unknown;
    gracePeriodSeconds?: unknown;
    terminateAttemptIfExceeded?: unknown;
  };

  if (
    typeof normalized.enabled !== 'boolean' ||
    typeof normalized.maxReconnectAttempts !== 'number' ||
    typeof normalized.gracePeriodSeconds !== 'number'
  ) {
    return null;
  }

  return {
    enabled: normalized.enabled,
    maxReconnectAttempts: normalized.maxReconnectAttempts,
    gracePeriodSeconds: normalized.gracePeriodSeconds,
    terminateAttemptIfExceeded:
      typeof normalized.terminateAttemptIfExceeded === 'boolean'
        ? normalized.terminateAttemptIfExceeded
        : undefined,
  };
}

function extractDifficulty(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = (payload as { difficulty?: unknown }).difficulty;

  return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate.trim() : null;
}

function formatGracePeriod(gracePeriodSeconds: number): string {
  if (gracePeriodSeconds < 60) {
    return `${gracePeriodSeconds}s`;
  }

  const minutes = Math.floor(gracePeriodSeconds / 60);
  const seconds = gracePeriodSeconds % 60;
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds}s`;
}

export function ExamDetailsPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<ExamDetailsViewModel | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [startMessage, setStartMessage] = useState<string | null>(null);
  const [isStartingAttempt, setIsStartingAttempt] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!examId) {
      setErrorMessage('ID da prova inválido.');
      return;
    }

    const controller = new AbortController();

    async function loadExamDetails() {
      setErrorMessage(null);
      setState(null);
      const response = await fetch(`/api/exams/${examId}`, {
        signal: controller.signal,
      });

      if (response.status === 404) {
        setErrorMessage('Prova não encontrada.');
        return;
      }

      if (!response.ok) {
        throw new Error(`GET /api/exams/${examId} failed with status ${response.status}`);
      }

      const payload = (await response.json()) as unknown;
      const exam = payload as ExamDetailResponse;
      const reconnectPolicy = extractReconnectPolicy(payload);
      const difficulty = extractDifficulty(payload);

      setState({ exam, reconnectPolicy, difficulty });
    }

    loadExamDetails().catch((error) => {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      setErrorMessage('Não foi possível carregar os detalhes da prova.');
    });

    return () => {
      controller.abort();
    };
  }, [examId, refreshToken]);

  const totalQuestions = useMemo(
    () => state?.exam.sections.reduce((accumulator, section) => accumulator + section.questionCount, 0) ?? 0,
    [state],
  );
  const avgTimePerQuestion = useMemo(() => {
    if (!state || totalQuestions <= 0) {
      return null;
    }

    return Math.round(state.exam.durationMinutes / totalQuestions);
  }, [state, totalQuestions]);

  async function handleStartAttempt() {
    if (!state?.exam.examId) {
      return;
    }

    setIsStartingAttempt(true);
    setStartMessage('Iniciando tentativa...');

    try {
      const attempt = await createAttempt({ examId: state.exam.examId });
      navigate(`/attempts/${attempt.attemptId}`);
    } catch {
      setStartMessage('Não foi possível iniciar a tentativa neste momento.');
    } finally {
      setIsStartingAttempt(false);
    }
  }

  return (
    <div className="stack-md">
      {errorMessage ? (
        <InlineError
          title="Falha ao carregar detalhes da prova"
          description={errorMessage}
          onRetry={() => {
            setRefreshToken((value) => value + 1);
          }}
        />
      ) : state ? (
        <>
          <PageHeader
            title={state.exam.title}
            description={state.exam.description}
            breadcrumbs={[{ label: 'Simulados', to: '/' }, { label: state.exam.title }]}
            actions={
              <>
                <Link to="/" className="ui-button ui-button--outline ui-button--default-size">
                  Voltar para simulados
                </Link>
                <Button onClick={handleStartAttempt} disabled={isStartingAttempt}>
                  {isStartingAttempt ? 'Iniciando...' : 'Iniciar prova'}
                </Button>
              </>
            }
          />

          <PageSection ariaLabel="Resumo geral da prova">
            <div className="exam-details-overview">
              <Badge variant="outline">Schema {state.exam.schemaVersion}</Badge>
              {state.difficulty ? <Badge variant="secondary">Dificuldade: {state.difficulty}</Badge> : null}
              <p>
                Esta é uma prova preparatória com foco em execução cronometrada, revisão no final e regras de reconexão
                definidas antes do início.
              </p>
            </div>
          </PageSection>

          <PageSection title="Estatísticas da prova" ariaLabel="Estatísticas da prova">
            <div className="exam-stats-grid">
              <Card>
                <CardHeader>
                  <CardDescription>Duração</CardDescription>
                  <CardTitle>{formatDuration(state.exam.durationMinutes)}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Questões</CardDescription>
                  <CardTitle>{totalQuestions}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Seções</CardDescription>
                  <CardTitle>{state.exam.sections.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Aprovação</CardDescription>
                  <CardTitle>{state.exam.passingScorePercentage}%</CardTitle>
                </CardHeader>
              </Card>
              {avgTimePerQuestion ? (
                <Card>
                  <CardHeader>
                    <CardDescription>Tempo médio por questão</CardDescription>
                    <CardTitle>{avgTimePerQuestion} min</CardTitle>
                  </CardHeader>
                </Card>
              ) : null}
              {state.difficulty ? (
                <Card>
                  <CardHeader>
                    <CardDescription>Dificuldade</CardDescription>
                    <CardTitle>{state.difficulty}</CardTitle>
                  </CardHeader>
                </Card>
              ) : null}
            </div>
          </PageSection>

          <PageSection title="Instruções" ariaLabel="Instruções da prova">
            <Card>
              <CardContent>
                <ul className="instruction-list">
                  <li>O cronômetro começa assim que você iniciar a tentativa.</li>
                  <li>Leia cada questão com atenção e navegue entre seções conforme necessário.</li>
                  <li>Suas respostas são salvas durante a realização.</li>
                  <li>Revise suas respostas antes de enviar para correção final.</li>
                  <li>Ao terminar, você verá o resultado com comentários e explicações.</li>
                </ul>
              </CardContent>
            </Card>
          </PageSection>

          <PageSection title="Política de reconexão" ariaLabel="Política de reconexão">
            {state.reconnectPolicy ? (
              <Alert variant={state.reconnectPolicy.enabled ? 'warning' : 'default'}>
                <AlertTitle>{state.reconnectPolicy.enabled ? 'Reconexão habilitada' : 'Reconexão desativada'}</AlertTitle>
                <AlertDescription>
                  {state.reconnectPolicy.enabled
                    ? `Você pode reconectar até ${state.reconnectPolicy.maxReconnectAttempts} vezes, retornando em até ${formatGracePeriod(state.reconnectPolicy.gracePeriodSeconds)} por tentativa. O tempo oficial continua correndo no backend durante interrupções.`
                    : 'Esta prova não permite retomada após desconexão.'}
                </AlertDescription>
                {state.reconnectPolicy.enabled && state.reconnectPolicy.terminateAttemptIfExceeded !== false ? (
                  <AlertDescription>
                    Se os limites forem excedidos, a tentativa é encerrada automaticamente.
                  </AlertDescription>
                ) : null}
              </Alert>
            ) : (
              <Alert>
                <AlertTitle>Política não informada</AlertTitle>
                <AlertDescription>Esta prova não informou política de reconexão na API.</AlertDescription>
              </Alert>
            )}
          </PageSection>

          <PageSection title="Seções resumidas" ariaLabel="Resumo das seções">
            <ol className="section-summary-list">
              {state.exam.sections.map((section) => (
                <li key={section.sectionId} className="section-summary-item">
                  <div>
                    <strong>{section.title}</strong>
                    <p>ID: {section.sectionId}</p>
                  </div>
                  <span>{section.questionCount} questões</span>
                </li>
              ))}
            </ol>
          </PageSection>

          <Card>
            <CardHeader>
              <CardTitle>Próximo passo</CardTitle>
              <CardDescription>Se você já revisou as regras, pode iniciar agora ou voltar para o catálogo.</CardDescription>
            </CardHeader>
            <CardFooter className="exam-actions">
              <Button onClick={handleStartAttempt} disabled={isStartingAttempt}>
                {isStartingAttempt ? 'Iniciando...' : 'Iniciar prova'}
              </Button>
              <Link to="/" className="ui-button ui-button--outline ui-button--default-size">
                Voltar para simulados
              </Link>
              {startMessage ? <p className="start-hint">{startMessage}</p> : null}
            </CardFooter>
          </Card>
        </>
      ) : (
        <PageLoading
          message="Carregando briefing da prova"
          description="Estamos preparando os detalhes, instruções e regras antes do início."
        />
      )}
    </div>
  );
}
