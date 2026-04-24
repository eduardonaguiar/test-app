import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from '../HomePage';
import { ToastProvider } from '../../hooks/ToastProvider';
import { listExams } from '../../generated/api-contract';

vi.mock('../../generated/api-contract', async () => {
  const actual = await vi.importActual('../../generated/api-contract');

  return {
    ...actual,
    listExams: vi.fn(),
  };
});

const mockedListExams = vi.mocked(listExams);

describe('HomePage', () => {
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
        {
          examId: 'exam-2',
          title: 'Simulado Azure',
          description: 'Serviços básicos',
          durationMinutes: 45,
          passingScorePercentage: 75,
          questionCount: 25,
        },
      ],
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            examId: 'exam-1',
            status: 'Completed',
            attemptedAt: '2026-03-10T10:00:00Z',
          },
          {
            examId: 'exam-1',
            status: 'InProgress',
            attemptedAt: '2026-03-12T10:00:00Z',
          },
        ],
      }),
    } as Response);
  });

  it('loads exams and applies status + search filters', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </ToastProvider>,
    );

    expect(await screen.findByText('Simulado AWS')).toBeInTheDocument();
    expect(screen.getByText('Simulado Azure')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Status'), 'in-progress');

    expect(screen.getByText('Simulado AWS')).toBeInTheDocument();
    expect(screen.queryByText('Simulado Azure')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Busca'), 'inexistente');

    await waitFor(() => {
      expect(screen.getByText('Nenhum simulado corresponde aos filtros')).toBeInTheDocument();
    });
  });
});
