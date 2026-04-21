import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
    <main className="page">
      <h1>Provas importadas</h1>
      <p className="subtitle">Listagem carregada diretamente do backend.</p>

      <div className="page-actions inline-links">
        <Link className="details-button" to="/exams/import">
          Importar nova prova
        </Link>
        <Link className="details-button secondary" to="/history">
          Ver histórico de tentativas
        </Link>
      </div>

      {errorMessage ? (
        <p>{errorMessage}</p>
      ) : state ? (
        <section aria-label="Lista de provas" className="exam-list">
          {state.exams.length === 0 ? (
            <p>Nenhuma prova importada até o momento.</p>
          ) : (
            state.exams.map((exam) => (
              <article key={exam.examId} className="exam-card">
                <header>
                  <h2>{exam.title}</h2>
                  <p className="exam-description">{exam.description ?? 'Sem descrição informada.'}</p>
                </header>

                <dl className="exam-metadata">
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
                </dl>

                <Link className="details-button" to={`/exams/${exam.examId}`}>
                  Abrir detalhes
                </Link>
              </article>
            ))
          )}
        </section>
      ) : (
        <p>Carregando provas…</p>
      )}
    </main>
  );
}
