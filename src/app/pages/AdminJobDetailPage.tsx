import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  ImageOff,
  Loader2,
  RefreshCcw,
} from 'lucide-react'

import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible'
import { getAdminJobById } from '../services/adminService'
import type { JobView } from '../services/jobService'

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
      return <Clock className="size-6 text-muted-foreground" />
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

function formatOptionalDate(value?: string | null) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ru-RU')
}

function formatUsd(value: number) {
  return `$${value.toFixed(6)}`
}

export function AdminJobDetailPage() {
  const { jobId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [job, setJob] = useState<JobView | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      if (!jobId) {
        setJob(null)
        setIsLoading(false)
        return
      }

      try {
        const nextJob = await getAdminJobById(jobId)
        if (!isMounted) {
          return
        }
        setJob(nextJob)
        setError(null)
      } catch (nextError) {
        if (!isMounted) {
          return
        }
        setJob(null)
        setError(nextError instanceof Error ? nextError.message : 'Не удалось загрузить задачу')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    setIsLoading(true)
    void load()

    return () => {
      isMounted = false
    }
  }, [jobId])

  const llmTotalCost = useMemo(
    () => (job?.llmTraces ?? []).reduce((sum, trace) => sum + Number(trace.costUsd ?? 0), 0),
    [job?.llmTraces],
  )

  const backTo = typeof location.state === 'object' && location.state && 'backTo' in location.state ? String(location.state.backTo) : null
  const backHref = backTo ?? '/admin/dashboard'
  const isTraceBackHref = backHref.startsWith('/admin/llm-traces')
  const backLabel = backHref === '/admin/llm-analytics' ? 'LLM аналитика' : backHref === '/admin/llm-traces' ? 'LLM traces' : 'Админка'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="space-y-4">
        <Link to={backHref} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-3.5" />
          {isTraceBackHref ? 'LLM traces' : backHref === '/admin/dashboard' ? 'Dashboard' : backLabel}
        </Link>
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-destructive">{error ?? 'Задача не найдена'}</div>
      </div>
    )
  }

  const delivery = job.delivery ?? null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to={backHref} className="inline-flex items-center gap-1 hover:text-primary">
          <ArrowLeft className="size-3.5" />
          {isTraceBackHref ? 'LLM traces' : backHref === '/admin/dashboard' ? 'Dashboard' : backLabel}
        </Link>
        <span>/</span>
        <span className="text-foreground">{getJobTypeLabel(job.type)}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{getJobTypeLabel(job.type)}</h1>
            <Badge variant={getJobStatusVariant(job.status)} className={job.status === 'running' ? 'border-blue-200 bg-blue-100 text-blue-700' : ''}>
              {getJobStatusLabel(job.status)}
            </Badge>
            {delivery ? (
              <Badge variant={getDeliveryStatusVariant(job)}>
                {getDeliveryStatusLabel(job)}
              </Badge>
            ) : null}
            <Badge variant="outline">Team {job.teamId.slice(0, 8)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Job ID: <code>{job.id}</code>
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.location.reload()}>
          <RefreshCcw className="size-3.5" />
          Обновить
        </Button>
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
              value={typeof job.attempts === 'number' && typeof job.maxAttempts === 'number' ? `${job.attempts}/${job.maxAttempts}` : '—'}
            />
            <Metric label="Следующий запуск" value={formatOptionalDate(job.diagnostics?.retry?.nextRunAt ?? job.runAt)} />
            <Metric label="Создана" value={new Date(job.createdAt).toLocaleString('ru-RU')} />
            <Metric label="Завершена" value={formatOptionalDate(job.completedAt)} />
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
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <div className="mb-1 flex items-center gap-2 font-medium">
                    <ImageOff className="size-4" />
                    Media пропущено
                  </div>
                  <div>{getMediaSkippedReasonLabel(delivery.mediaSkippedReason)}</div>
                </div>
              ) : null}

              {delivery.deliveryError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
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
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
              Джоба поставлена на паузу до следующего окна квоты и будет продолжена с checkpoint state, а не запущена с нуля.
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Metric label="Следующий запуск" value={formatOptionalDate(job.diagnostics.retry.nextRunAt)} />
              <Metric label="Фаза" value={job.diagnostics.retry.phase ?? '—'} />
              <Metric label="Итерация" value={typeof job.diagnostics.retry.iteration === 'number' ? String(job.diagnostics.retry.iteration) : '—'} />
              <Metric label="Прогресс checkpoint" value={typeof job.diagnostics.retry.progress === 'number' ? `${job.diagnostics.retry.progress}%` : '—'} />
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
            <Metric label="Токенов всего" value={job.llmTraces.reduce((sum, trace) => sum + (trace.totalTokens ?? 0), 0).toLocaleString('ru-RU')} />
            <Metric label="Стоимость всего" value={formatUsd(llmTotalCost)} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Связанные сущности</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="text-gray-700">Источник: {job.related?.source ? `${job.related.source.name} (${job.related.source.type})` : '—'}</div>
          <div className="text-gray-700">Канал: {job.related?.channel ? job.related.channel.name : '—'}</div>
          <div className="text-gray-700">Кампания: {job.related?.campaign ? job.related.campaign.name : '—'}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Входные параметры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded bg-gray-100 p-4">
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
            <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{job.error}</div>
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
            <Metric
              label="Retry-After"
              value={job.diagnostics.lastError.retryAfterSec !== null ? `${job.diagnostics.lastError.retryAfterSec}s` : '—'}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Логи выполнения</CardTitle>
        </CardHeader>
        <CardContent>
          {job.logs.length === 0 ? (
            <div className="text-sm text-muted-foreground">Логи пока не появились.</div>
          ) : (
            <>
              <div className="space-y-1">
                {job.logs.slice(0, 5).map((log, index) => (
                  <div key={`${index}_${log}`} className="py-0.5 font-mono text-sm text-gray-700">
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
                    <div className="max-h-80 overflow-y-auto rounded bg-gray-900 p-4 text-gray-100">
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
              <div className="text-sm font-medium text-muted-foreground">
                Всего потрачено: <span className="tabular-nums text-foreground">{formatUsd(llmTotalCost)}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {job.llmTraces.map((trace) => (
                <button
                  key={trace.id}
                  type="button"
                  onClick={() => navigate(`/admin/llm-traces/${trace.id}`, { state: { backTo: location.pathname } })}
                  className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <Activity className="size-5 text-purple-500" />
                    <div>
                      <div className="text-sm font-medium">{trace.model}</div>
                      <div className="text-xs text-muted-foreground">
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
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  )
}
