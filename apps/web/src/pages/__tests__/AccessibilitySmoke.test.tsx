import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from '../HomePage';
import { ExamDetailsPage } from '../ExamDetailsPage';
import { createAttempt, listExams } from '../../generated/api-contract';
import { ToastProvider } from '../../hooks/ToastProvider';

vi.mock('../../generated/api-contract', async () => {
  const actual = await vi.importActual('../../generated/api-contract');

  return {
    ...actual,
    createAttempt: vi.fn(),
    listExams: vi.fn(),
  };
});

const mockedCreateAttempt = vi.mocked(createAttempt);
const mockedListExams = vi.mocked(listExams);

function renderWithProviders(ui: ReactElement) {
  return render(
    <ToastProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </ToastProvider>,
  );
}

describe('Accessibility smoke checks on core pages', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    mockedListExams.mockResolvedValue({
      items: [
        {
          examId: 'exam-1',
          title: 'Simulado AWS',
          description: 'Arquitetura e redes',
          durationMinutes: 60,
          passingScorePercentage: 70,
          questionCount: 30,
        },
      ],
    });

    mockedCreateAttempt.mockResolvedValue({
      attemptId: 'attempt-123',
      examId: 'exam-1',
      status: 'InProgress',
      startedAt: '2026-04-01T12:00:00Z',
      deadlineAt: '2026-04-01T13:00:00Z',
      lastSeenAt: '2026-04-01T12:00:00Z',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps home filters accessible by role and label', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    } as Response);

    renderWithProviders(<HomePage />);

    expect(await screen.findByRole('heading', { name: 'Simulados' })).toBeInTheDocument();

    const searchInput = screen.getByRole('textbox', { name: 'Busca' });
    const statusSelect = screen.getByRole('combobox', { name: 'Status' });

    expect(searchInput).toHaveAccessibleName('Busca');
    expect(statusSelect).toHaveAccessibleName('Status');
  });

  it('supports keyboard-only start flow in exam details', async () => {
    const user = userEvent.setup();

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

    render(
      <ToastProvider>
        <MemoryRouter initialEntries={['/exams/exam-1']}>
          <Routes>
            <Route path="/exams/:examId" element={<ExamDetailsPage />} />
            <Route path="/attempts/:attemptId" element={<div>Tela de tentativa</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Simulado de Certificação' })).toBeInTheDocument();

    const [primaryStartButton] = await screen.findAllByRole('button', { name: 'Iniciar prova' });

    primaryStartButton.focus();
    expect(primaryStartButton).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(await screen.findByText('Tela de tentativa')).toBeInTheDocument();
  });
});
