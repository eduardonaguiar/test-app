import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { createAttempt, type ExamSummaryResponse } from '../../generated/api-contract';
import { useToast } from '../../hooks/useToast';

export type ExamCatalogDifficulty = 'easy' | 'medium' | 'hard';
export type ExamCatalogStatus = 'not-started' | 'in-progress' | 'completed';

type ExamCatalogCardProps = {
  exam: ExamSummaryResponse;
  difficulty: ExamCatalogDifficulty;
  status: ExamCatalogStatus;
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

function getDifficultyLabel(difficulty: ExamCatalogDifficulty): string {
  if (difficulty === 'easy') {
    return 'Easy';
  }

  if (difficulty === 'medium') {
    return 'Medium';
  }

  return 'Hard';
}

function getDifficultyVariant(difficulty: ExamCatalogDifficulty): 'success' | 'warning' | 'destructive' {
  if (difficulty === 'easy') {
    return 'success';
  }

  if (difficulty === 'medium') {
    return 'warning';
  }

  return 'destructive';
}

function getStatusLabel(status: ExamCatalogStatus): string {
  if (status === 'in-progress') {
    return 'Em progresso';
  }

  if (status === 'completed') {
    return 'Concluído';
  }

  return 'Não iniciado';
}

function getStatusVariant(status: ExamCatalogStatus): 'secondary' | 'warning' | 'success' {
  if (status === 'in-progress') {
    return 'warning';
  }

  if (status === 'completed') {
    return 'success';
  }

  return 'secondary';
}

export function ExamCatalogCard({ exam, difficulty, status }: ExamCatalogCardProps) {
  const navigate = useNavigate();
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const toast = useToast();

  async function handleStartExam() {
    setIsStarting(true);
    setStartError(null);

    try {
      const attempt = await createAttempt({ examId: exam.examId });
      toast.info({ title: 'Tentativa iniciada', description: 'Ambiente da prova preparado com sucesso.' });
      navigate(`/attempts/${attempt.attemptId}`);
    } catch {
      setStartError('Não foi possível iniciar este simulado agora.');
      toast.error({ title: 'Falha ao iniciar simulado', description: 'Tente novamente em alguns segundos.' });
      setIsStarting(false);
    }
  }

  return (
    <Card className="catalog-card">
      <CardHeader className="catalog-card__header">
        <div className="catalog-card__header-row">
          <CardTitle>{exam.title}</CardTitle>
          <Badge variant={getStatusVariant(status)}>{getStatusLabel(status)}</Badge>
        </div>
        <CardDescription>{exam.description ?? 'Sem descrição disponível para este simulado.'}</CardDescription>
      </CardHeader>

      <CardContent>
        <dl className="catalog-card__meta-grid">
          <div className="catalog-card__meta-item">
            <dt>Duração</dt>
            <dd>{formatDuration(exam.durationMinutes)}</dd>
          </div>
          <div className="catalog-card__meta-item">
            <dt>Questões</dt>
            <dd>{exam.questionCount ?? '—'}</dd>
          </div>
          <div className="catalog-card__meta-item">
            <dt>Dificuldade</dt>
            <dd>
              <Badge variant={getDifficultyVariant(difficulty)}>{getDifficultyLabel(difficulty)}</Badge>
            </dd>
          </div>
          <div className="catalog-card__meta-item">
            <dt>Passing score</dt>
            <dd>{exam.passingScorePercentage}%</dd>
          </div>
        </dl>
      </CardContent>

      <CardFooter className="catalog-card__footer">
        <Button onClick={handleStartExam} isLoading={isStarting} loadingLabel="Iniciando prova...">
          Iniciar
        </Button>
        <Link className="ui-button ui-button--outline ui-button--default-size" to={`/exams/${exam.examId}`}>
          Ver detalhes
        </Link>
      </CardFooter>

      {startError ? <p className="catalog-card__error">{startError}</p> : null}
    </Card>
  );
}
