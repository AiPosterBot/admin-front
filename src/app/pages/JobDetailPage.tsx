import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  ImageOff,
  Loader2,
  RefreshCcw,
  Send,
  Square,
} from 'lucide-react'

import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible'
import { useTeam } from '../context/TeamContext'
import { cancelJob, getJobById, subscribeToJob, type JobView } from '../services/jobService'

function getJobTypeLabel(type: string) {
  switch (type) {
    case 'refresh_channel_metadata':
      return 'Обновление метаданных канала'
    case 'publish_to_channel':
      return 'Публикация в канал'
    case 'fetch_rss':
      return 'Скан RSS'
    case 'fetch_rss_hybrid':
      return 'Скан RSS + HTML'
    case 'fetch_telegram':
      return 'Скан Telegram'
    case 'fetch_website':
      return 'Скан сайта'
    case 'onboard_website':
      return 'Онбординг сайта'
    case 'onboard_rss_article':
      return 'Онбординг RSS article-agent'
    case 'ads_campaign':
      return 'Рекламная рассылка'
    default:
      return type.replace(/_/g, ' ')
  }
}

function getJobStatusLabel(status: string) {
  switch (status) {
    case 'success':
      return 'Выполнено'
    case 'failed':
      return 'Ошибка'
    case 'running':
      return 'В работе'
    case 'pending':
      return 'Ожидает'
    case 'canceled':
      return 'Отменена'
    case 'timed_out':
      return 'Таймаут'
    default:
      return status
  }
}

function getJobStatusVariant(status: string): 'default' | 'destructive' | 'secondary' | 'outline' {
  switch (status) {
    case 'success':
      return 'default'
    case 'failed':
    case 'timed_out':
      return 'destructive'
    case 'running':
      return 'secondary'
    case 'canceled':
      return 'outline'
    default:
      return 'outline'
  }
}

function getJobStatusIcon(status: string) {
  switch (status) {
    case 'success':
      return <CheckCircle className="size-6 text-green-500" />
    case 'failed':
    case 'timed_out':
      return <AlertCircle className="size-6 text-red-500" />
    case 'running':
      return <Clock className="size-6 animate-pulse text-blue-500" />
    default:
      return <Clock className="size-6 text-gray-400 dark:text-gray-500" />
  }
}

function getDeliveryStatusLabel(job: JobView) {
  const delivery = job.delivery
  if (!delivery) {
    return 'Нет данных'
  }

  if (delivery.outboxStatus === 'sent' || delivery.postedItemStatus === 'success') {
    return 'Доставлено'
  }
  if (delivery.outboxStatus === 'failed' || delivery.postedItemStatus === 'failed') {
    return 'Ошибка доставки'
  }
  if (delivery.outboxStatus === 'sending' || delivery.postedItemStatus === 'publishing') {
    return 'Отправляется'
  }
  if (delivery.outboxStatus === 'pending' || delivery.postedItemStatus === 'queued') {
    return 'В очереди'
  }
  if (delivery.outboxStatus === 'unknown') {
    return 'Состояние неизвестно'
  }

  return 'Подготовлено'
}

function getDeliveryStatusVariant(job: JobView): 'default' | 'destructive' | 'secondary' | 'outline' {
  const delivery = job.delivery
  if (!delivery) {
    return 'outline'
  }

  if (delivery.outboxStatus === 'sent' || delivery.postedItemStatus === 'success') {
    return 'default'
  }
  if (delivery.outboxStatus === 'failed' || delivery.postedItemStatus === 'failed' || delivery.outboxStatus === 'unknown') {
    return 'destructive'
  }
  if (delivery.outboxStatus === 'sending' || delivery.postedItemStatus === 'publishing') {
    return 'secondary'
  }

  return 'outline'
}

function getMediaSkippedReasonLabel(reason: string | null | undefined) {
  switch (reason) {
    case 'caption_too_long_for_sendPhoto':
      return 'Фото не прикреплено: текст слишком длинный для caption Telegram'
    default:
      return reason ?? '—'
  }
}

function getLlmTraceStageLabel(stage: string) {
  switch (stage) {
    case 'candidate_selection':
      return 'Выбор материала'
    case 'post_generation':
      return 'Генерация поста'
    default:
      return 'Основной вызов'
  }
}

function isTerminalStatus(status: string) {
  return status === 'success' || status === 'failed' || status === 'canceled' || status === 'timed_out'
}

function formatLogLine(ts: string, level: string, message: string) {
  return `[${new Date(ts).toLocaleTimeString('ru-RU')}] [${level}] ${message}`
}

function formatUsd(value: number) {
  return `$${value.toFixed(6)}`
}

function formatOptionalDate(value?: string | null) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ru-RU')
}

export function JobDetailPage() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { currentTeamId } = useTeam()
  const [job, setJob] = useState<JobView | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [isCanceling, setIsCanceling] = useState(false)

  const loadJob = useCallback(async () => {
    if (!jobId || !currentTeamId) {
      setJob(null)
      setIsLoading(false)
      return
    }

    try {
      const nextJob = await getJobById(jobId, currentTeamId)
      setJob(nextJob)
      setError(nextJob ? null : 'Задача не найдена или недоступна в текущей команде')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Не удалось загрузить задачу')
    } finally {
      setIsLoading(false)
    }
  }, [currentTeamId, jobId])

  useEffect(() => {
    void loadJob()
  }, [loadJob])

  useEffect(() => {
    if (!jobId || !currentTeamId || !job || isTerminalStatus(job.status)) {
      return
    }

    const abortController = new AbortController()
    let pollingTimer: number | undefined

    void subscribeToJob(jobId, {
      signal: abortController.signal,
      onSnapshot: (snapshot) => {
        setJob((current) => ({
          ...(current ?? snapshot),
          ...snapshot,
          logs: current?.logs ?? snapshot.logs,
          logEntries: current?.logEntries ?? snapshot.logEntries,
        }))
      },
      onProgress: ({ progress, status }) => {
        setJob((current) => (current ? { ...current, progress, status } : current))
      },
      onLog: (log) => {
        setJob((current) => {
          if (!current || current.logEntries.some((entry) => entry.id === log.id)) {
            return current
          }

          const nextLogEntries = [...current.logEntries, log]
          return {
            ...current,
            logEntries: nextLogEntries,
            logs: nextLogEntries.map((entry) => formatLogLine(entry.ts, entry.level, entry.message)),
          }
        })
      },
      onDone: () => {
        void loadJob()
      },
      onError: (nextError) => {
        setStreamError(nextError instanceof Error ? nextError.message : 'SSE недоступен, включен polling')
        pollingTimer = window.setInterval(() => {
          void loadJob()
        }, 2000)
      },
    })

    return () => {
      abortController.abort()
      if (pollingTimer) {
        window.clearInterval(pollingTimer)
      }
    }
  }, [currentTeamId, job, jobId, loadJob])

  const canCancel = useMemo(() => job && (job.status === 'pending' || job.status === 'running'), [job])
  const llmTotalCost = useMemo(
    () => (job?.llmTraces ?? []).reduce((sum, trace) => sum + Number(trace.costUsd ?? 0), 0),
    [job?.llmTraces],
  )

  const handleCancel = async () => {
    if (!jobId) {
      return
    }

    try {
      setIsCanceling(true)
      const canceledJob = await cancelJob(jobId)
      setJob((current) => ({
        ...(current ?? canceledJob),
        ...canceledJob,
      }))
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Не удалось отменить задачу')
    } finally {
      setIsCanceling(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-gray-400 dark:text-gray-500" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="space-y-4">
        <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400">
          <ArrowLeft className="size-3.5" />
          Задачи
        </Link>
        <div className="rounded-lg border border-red-200 bg-white p-6 text-sm text-red-600 dark:border-red-800/50 dark:bg-gray-900 dark:text-red-400">{error ?? 'Задача не найдена'}</div>
      </div>
    )
  }

  const delivery = job.delivery ?? null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link to="/jobs" className="inline-flex items-center gap-1 transition-colors hover:text-blue-600 dark:hover:text-blue-400">
          <ArrowLeft className="size-3.5" />
          Задачи
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">{getJobTypeLabel(job.type)}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{getJobTypeLabel(job.type)}</h1>
            <Badge variant={getJobStatusVariant(job.status)} className={job.status === 'running' ? 'border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : ''}>
              {getJobStatusLabel(job.status)}
            </Badge>
            {delivery ? (
              <Badge variant={getDeliveryStatusVariant(job)}>
                {getDeliveryStatusLabel(job)}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Job ID: <code>{job.id}</code>
          </p>
          {streamError ? <p className="mt-1 text-xs text-amber-600">{streamError}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          {canCancel ? (
            <Button variant="outline" size="sm" className="gap-1.5" disabled={isCanceling} onClick={handleCancel}>
              {isCanceling ? <Loader2 className="size-3.5 animate-spin" /> : <Square className="size-3.5" />}
              Отменить
            </Button>
          ) : null}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void loadJob()}>
            <RefreshCcw className="size-3.5" />
            Обновить
          </Button>
          {getJobStatusIcon(job.status)}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Выполнение задачи</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Metric label="Статус" value={getJobStatusLabel(job.status)} />
            <Metric label="Прогресс" value={`${job.progress}%`} />
            <Metric
              label="Попытки"
              value={
                typeof job.attempts === 'number' && typeof job.maxAttempts === 'number' ? `${job.attempts}/${job.maxAttempts}` : '—'
              }
            />
            <Metric label="Следующий запуск" value={formatOptionalDate(job.diagnostics?.retry?.nextRunAt ?? job.runAt)} />
            <Metric label="Создана" value={new Date(job.createdAt).toLocaleString('ru-RU')} />
            <Metric label="Завершена" value={job.completedAt ? new Date(job.completedAt).toLocaleString('ru-RU') : '—'} />
          </CardContent>
        </Card>

        {delivery ? (
          <Card>
            <CardHeader>
              <CardTitle>Доставка в Telegram</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Metric label="Статус доставки" value={getDeliveryStatusLabel(job)} />
                <Metric label="Метод" value={delivery.deliveryMethod ?? '—'} />
                <Metric label="Outbox" value={delivery.outboxStatus ?? '—'} />
                <Metric label="Telegram message id" value={delivery.telegramMessageId ? String(delivery.telegramMessageId) : '—'} />
              </div>

              {delivery.mediaSkippedReason ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-200">
                  <div className="mb-1 flex items-center gap-2 font-medium">
                    <ImageOff className="size-4" />
                    Media пропущено
                  </div>
                  <div>{getMediaSkippedReasonLabel(delivery.mediaSkippedReason)}</div>
                </div>
              ) : null}

              {delivery.deliveryError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-300">
                  <div className="mb-1 flex items-center gap-2 font-medium">
                    <AlertCircle className="size-4" />
                    Ошибка доставки
                  </div>
                  <div>{delivery.deliveryError}</div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>

      {job.diagnostics?.retry?.waitingForRetry ? (
        <Card>
          <CardHeader>
            <CardTitle>Retry / Resume</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-200">
              Джоба поставлена на паузу до следующего окна квоты и будет продолжена с checkpoint state, а не запущена с нуля.
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Metric label="Следующий запуск" value={formatOptionalDate(job.diagnostics.retry.nextRunAt)} />
              <Metric label="Фаза" value={job.diagnostics.retry.phase ?? '—'} />
              <Metric
                label="Итерация"
                value={typeof job.diagnostics.retry.iteration === 'number' ? String(job.diagnostics.retry.iteration) : '—'}
              />
              <Metric
                label="Прогресс checkpoint"
                value={typeof job.diagnostics.retry.progress === 'number' ? `${job.diagnostics.retry.progress}%` : '—'}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {job.llmTraces.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>LLM сводка</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Metric label="Вызовов" value={String(job.llmTraces.length)} />
            <Metric
              label="Токенов всего"
              value={job.llmTraces.reduce((sum, trace) => sum + (trace.totalTokens ?? 0), 0).toLocaleString('ru-RU')}
            />
            <Metric label="Стоимость всего" value={formatUsd(llmTotalCost)} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Связанные сущности</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {job.related?.source ? (
            <div>
              Источник:{' '}
              <Link to={`/sources/${job.related.source.id}`} className="text-blue-600 hover:underline dark:text-blue-400">
                {job.related.source.name}
              </Link>
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400">Источник: —</div>
          )}

          {job.related?.channel ? (
            <div>
              Канал:{' '}
              <Link to={`/channels/${job.related.channel.id}`} className="text-blue-600 hover:underline dark:text-blue-400">
                {job.related.channel.name}
              </Link>
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400">Канал: —</div>
          )}

          {job.related?.campaign ? (
            <div>Кампания: {job.related.campaign.name}</div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400">Кампания: —</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Входные параметры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded bg-gray-100 p-4 dark:bg-gray-900">
            <pre className="overflow-x-auto text-sm">{JSON.stringify(job.params, null, 2)}</pre>
          </div>
        </CardContent>
      </Card>

      {job.result ? (
        <Card>
          <CardHeader>
            <CardTitle>Результат</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded border border-green-200 bg-green-50 p-4">
              <pre className="overflow-x-auto text-sm">{JSON.stringify(job.result, null, 2)}</pre>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {job.error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-700">Ошибка выполнения</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-300">{job.error}</div>
          </CardContent>
        </Card>
      ) : null}

      {job.diagnostics?.lastError ? (
        <Card>
          <CardHeader>
            <CardTitle>Последняя ошибка провайдера</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Metric label="Сообщение" value={job.diagnostics.lastError.message} />
            <Metric label="Код" value={job.diagnostics.lastError.code ?? '—'} />
            <Metric
              label="HTTP / provider status"
              value={job.diagnostics.lastError.providerStatus !== null ? String(job.diagnostics.lastError.providerStatus) : '—'}
            />
            <Metric label="Retry-After" value={job.diagnostics.lastError.retryAfterSec !== null ? `${job.diagnostics.lastError.retryAfterSec}s` : '—'} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Логи выполнения</CardTitle>
        </CardHeader>
        <CardContent>
          {job.logs.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">Логи пока не появились.</div>
          ) : (
            <>
              <div className="space-y-1">
                {job.logs.slice(0, 5).map((log, index) => (
                  <div key={`${index}_${log}`} className="py-0.5 font-mono text-sm text-gray-700 dark:text-gray-300">
                    {log}
                  </div>
                ))}
              </div>
              {job.logs.length > 5 ? (
                <Collapsible className="mt-3">
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm">
                      Все логи ({job.logs.length})
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="max-h-80 overflow-y-auto rounded bg-gray-900 p-4 text-gray-100 dark:bg-black">
                      {job.logs.map((log, index) => (
                        <div key={`${index}_${log}`} className="py-0.5 font-mono text-xs">
                          {log}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {job.llmTraces.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>LLM traces</CardTitle>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Всего потрачено: <span className="tabular-nums text-gray-900 dark:text-gray-100">{formatUsd(llmTotalCost)}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {job.llmTraces.map((trace) => (
                <button
                  key={trace.id}
                  type="button"
                  onClick={() => navigate(`/llm-traces/${trace.id}`)}
                  className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/60"
                >
                  <div className="flex items-center gap-3">
                    <Activity className="size-5 text-purple-500" />
                    <div>
                      <div className="text-sm font-medium">{trace.model}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {(trace.totalTokens ?? 0).toLocaleString('ru-RU')} токенов · {trace.costUsd === null ? '—' : `$${Number(trace.costUsd).toFixed(6)}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {getLlmTraceStageLabel(trace.stage)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {trace.operation}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  )
}
