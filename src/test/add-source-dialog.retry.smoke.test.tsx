import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  team: {
    currentTeamId: 'team-1',
    currentTeam: {
      id: 'team-1',
      limits: {
        maxSources: 10,
      },
    },
  },
  sourceService: {
    getTeamSourcesList: vi.fn(),
    startWebsiteOnboarding: vi.fn(),
    getWebsiteOnboardingJob: vi.fn(),
  },
}))

import { AddSourceDialog } from '../app/components/AddSourceDialog'

vi.mock('../app/context/TeamContext', () => ({
  useTeam: () => mocks.team,
}))

vi.mock('../app/services/sourceService', () => mocks.sourceService)

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

describe('add source dialog retry smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.sourceService.getTeamSourcesList.mockReturnValue([])
    mocks.sourceService.startWebsiteOnboarding.mockResolvedValue({ ok: true, data: { jobId: 'job-1' } })
    mocks.sourceService.getWebsiteOnboardingJob.mockResolvedValue({
      jobId: 'job-1',
      status: 'pending',
      attempts: 1,
      maxAttempts: 4,
      runAt: '2026-03-17T10:00:00Z',
      progress: 78,
      errorText: null,
      diagnostics: {
        retry: {
          waitingForRetry: true,
          willResume: true,
          nextRunAt: '2026-03-17T10:00:00Z',
          phase: 'review',
          iteration: 1,
          attempts: 1,
          maxAttempts: 4,
        },
      },
      retry: {
        waitingForRetry: true,
        willResume: true,
        nextRunAt: '2026-03-17T10:00:00Z',
        phase: 'review',
        iteration: 1,
        attempts: 1,
        maxAttempts: 4,
      },
      preview: null,
      config: null,
      stages: [],
      liveStages: [
        { id: 'analyze_list', label: 'Анализ списка материалов', status: 'done' },
        { id: 'open_samples', label: 'Открытие примеров', status: 'done' },
        { id: 'generate_config', label: 'Генерация конфигурации', status: 'done' },
        { id: 'dry_run', label: 'Проверка dry-run', status: 'done' },
        { id: 'verdict', label: 'Финальный вердикт', status: 'running' },
      ],
      logs: ['[warn] Job scheduled for retry'],
      logEntries: [],
    })
  })

  it('keeps onboarding in running state and shows waiting retry banner', async () => {
    render(<AddSourceDialog open onOpenChange={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /website/i }))
    fireEvent.change(screen.getByLabelText('URL сайта'), {
      target: { value: 'https://example.com/news' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Запустить onboarding' }))

    expect(await screen.findByText('Ждем окно квоты и продолжим с сохраненного шага')).toBeInTheDocument()
    expect(screen.queryByText('Не удалось настроить парсинг')).not.toBeInTheDocument()
    expect(screen.getByText(/Фаза: review/)).toBeInTheDocument()
  })
})
