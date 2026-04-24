import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExamDetailsPage } from '../ExamDetailsPage';
import { createAttempt } from '../../generated/api-contract';

vi.mock('../../generated/api-contract', async () => {
  const actual = await vi.importActual('../../generated/api-contract');

  return {
    ...actual,
    createAttempt: vi.fn(),
  };
});

const mockedCreateAttempt = vi.mocked(createAttempt);

describe('ExamDetailsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    mockedCreateAttempt.mockResolvedValue({
      attemptId: 'attempt-123',
      examId: 'exam-1',
      status: 'InProgress',
      startedAt: '2026-04-01T12:00:00Z',
      deadlineAt: '2026-04-01T13:00:00Z',
      lastSeenAt: '2026-04-01T12:00:00Z',
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        examId: 'exam-1',
        title: 'Simulado de Certificação',
        description: 'Fluxo completo de teste.',
        durationMinutes: 90,
        passingScorePercentage: 70,
        schemaVersion: '1.0.0',
        difficulty: 'Intermediário',
        reconnectPolicy: {
          enabled: true,
          maxReconnectAttempts: 2,
          gracePeriodSeconds: 120,
        },
        sections: [
          {
            sectionId: 's-1',
            title: 'Seção 1',
            questionCount: 10,
          },
        ],
      }),
    } as Response);
  });

  it('starts an attempt and navigates to attempt execution route', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/exams/exam-1']}>
        <Routes>
          <Route path="/exams/:examId" element={<ExamDetailsPage />} />
          <Route path="/attempts/:attemptId" element={<div>Tela de tentativa</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Simulado de Certificação')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Iniciar prova' }));

    expect(await screen.findByText('Tela de tentativa')).toBeInTheDocument();
    expect(mockedCreateAttempt).toHaveBeenCalledWith({ examId: 'exam-1' });
  });
});
