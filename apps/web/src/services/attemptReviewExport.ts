export type AttemptResultQuestionReviewExportModel = {
  questionId: string;
  sectionId: string;
  sectionTitle: string;
  questionCode: string;
  prompt: string;
  topic: string;
  difficulty: string;
  userSelectedOptionId?: string;
  userSelectedOptionCode?: string;
  userSelectedOptionText?: string;
  correctOptionCode: string;
  correctOptionText: string;
  isCorrect: boolean;
  explanationSummary: string;
  explanationDetails: string;
};

export type AttemptResultExportModel = {
  attemptId: string;
  examId: string;
  score: number;
  percentage: number;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
  submittedAt: string;
  questionReviews: AttemptResultQuestionReviewExportModel[];
};

export type AttemptReviewExportMetadata = {
  examTitle?: string;
  startedAt?: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function formatDateForFileName(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return 'data-indisponivel';
  }

  return parsed.toISOString().slice(0, 10);
}

function formatPercentage(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0;
  return `${normalized.toFixed(1)}%`;
}

function formatTimeSpent(startedAt: string | undefined, submittedAt: string): string {
  if (!startedAt) {
    return 'Não disponível';
  }

  const started = new Date(startedAt).getTime();
  const submitted = new Date(submittedAt).getTime();

  if (Number.isNaN(started) || Number.isNaN(submitted) || submitted < started) {
    return 'Não disponível';
  }

  const totalSeconds = Math.round((submitted - started) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function buildFileName(result: AttemptResultExportModel, examTitle?: string): string {
  const titleSlug = slugify(examTitle?.trim() || result.examId) || 'exam-review';
  const dateSlug = formatDateForFileName(result.submittedAt);

  return `review-${titleSlug}-${dateSlug}.html`;
}

function getQuestionStatusTag(review: AttemptResultQuestionReviewExportModel): string {
  if (!review.userSelectedOptionId) {
    return '<span class="status unanswered">Sem resposta</span>';
  }

  if (review.isCorrect) {
    return '<span class="status correct">Correta</span>';
  }

  return '<span class="status incorrect">Incorreta</span>';
}

export function buildAttemptReviewHtml(result: AttemptResultExportModel, metadata: AttemptReviewExportMetadata): string {
  const examTitle = metadata.examTitle?.trim() || `Prova ${result.examId}`;
  const attemptedAt = formatDateTime(result.submittedAt);
  const exportedAt = formatDateTime(new Date().toISOString());
  const timeSpent = formatTimeSpent(metadata.startedAt, result.submittedAt);

  const questionItems = result.questionReviews
    .map((review) => {
      const userAnswer = review.userSelectedOptionCode && review.userSelectedOptionText
        ? `${review.userSelectedOptionCode}) ${review.userSelectedOptionText}`
        : 'Não respondida';

      return `
        <article class="question-card">
          <header>
            <h3>${escapeHtml(review.questionCode)} · ${escapeHtml(review.sectionTitle)}</h3>
            ${getQuestionStatusTag(review)}
          </header>

          <p><strong>Enunciado:</strong> ${escapeHtml(review.prompt)}</p>
          <p class="meta"><strong>Tópico:</strong> ${escapeHtml(review.topic || 'Não informado')} · <strong>Dificuldade:</strong> ${escapeHtml(review.difficulty || 'Não informada')}</p>

          <div class="answer-grid">
            <div>
              <h4>Sua resposta</h4>
              <p>${escapeHtml(userAnswer)}</p>
            </div>
            <div>
              <h4>Resposta correta</h4>
              <p>${escapeHtml(`${review.correctOptionCode}) ${review.correctOptionText}`)}</p>
            </div>
          </div>

          <p><strong>Resumo:</strong> ${escapeHtml(review.explanationSummary)}</p>
          <p><strong>Comentário detalhado:</strong> ${escapeHtml(review.explanationDetails)}</p>
        </article>
      `;
    })
    .join('');

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Revisão - ${escapeHtml(examTitle)}</title>
    <style>
      body { font-family: Inter, Arial, sans-serif; color: #111827; margin: 24px; line-height: 1.5; }
      h1, h2, h3, h4 { margin: 0; }
      h1 { margin-bottom: 8px; }
      .subtitle { margin: 0 0 16px; color: #4b5563; }
      .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin: 16px 0 20px; }
      .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px 12px; }
      .card h3 { font-size: 13px; color: #4b5563; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 4px; }
      .card p { margin: 0; font-size: 18px; font-weight: 700; }
      .question-list { display: grid; gap: 14px; }
      .question-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; page-break-inside: avoid; }
      .question-card header { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
      .question-card h3 { font-size: 16px; }
      .meta { color: #374151; }
      .answer-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; }
      .answer-grid h4 { font-size: 14px; margin-bottom: 4px; color: #4b5563; }
      .status { border-radius: 999px; padding: 2px 10px; font-size: 12px; font-weight: 700; }
      .status.correct { background: #dcfce7; color: #166534; }
      .status.incorrect { background: #fee2e2; color: #b91c1c; }
      .status.unanswered { background: #f3f4f6; color: #374151; }
      footer { margin-top: 24px; color: #4b5563; font-size: 13px; }
      @media print {
        body { margin: 12mm; }
      }
    </style>
  </head>
  <body>
    <header>
      <h1>Revisão comentada da tentativa</h1>
      <p class="subtitle">${escapeHtml(examTitle)} · Tentativa ${escapeHtml(result.attemptId)}</p>
      <p><strong>Data da tentativa:</strong> ${escapeHtml(attemptedAt)}</p>
      <p><strong>Tempo gasto:</strong> ${escapeHtml(timeSpent)}</p>
      <p><strong>Score:</strong> ${result.score} · <strong>Percentual:</strong> ${escapeHtml(formatPercentage(result.percentage))} · <strong>Status:</strong> ${result.passed ? 'Aprovado' : 'Reprovado'}</p>
    </header>

    <section class="summary" aria-label="Resumo geral">
      <div class="card"><h3>Total de questões</h3><p>${result.totalQuestions}</p></div>
      <div class="card"><h3>Acertos</h3><p>${result.correctAnswers}</p></div>
      <div class="card"><h3>Erros</h3><p>${result.incorrectAnswers}</p></div>
      <div class="card"><h3>Sem resposta</h3><p>${result.unansweredQuestions}</p></div>
      <div class="card"><h3>Taxa de acerto</h3><p>${escapeHtml(formatPercentage(result.percentage))}</p></div>
    </section>

    <section>
      <h2>Revisão detalhada por questão</h2>
      <div class="question-list">${questionItems}</div>
    </section>

    <footer>
      <p>Exportado por Study Certification Simulator em ${escapeHtml(exportedAt)}.</p>
    </footer>
  </body>
</html>`;
}

export function exportAttemptReviewHtml(result: AttemptResultExportModel, metadata: AttemptReviewExportMetadata): string {
  const html = buildAttemptReviewHtml(result, metadata);
  const fileName = buildFileName(result, metadata.examTitle);

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';

  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  return fileName;
}
