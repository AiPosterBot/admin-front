import { Link } from 'react-router'
import { useEffect, useMemo, useState } from 'react'
import { Activity, Clock, DollarSign, RefreshCw, Workflow, Zap } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import {
  getAdminLlmAnalytics,
  type AdminLlmAnalyticsData,
  type AdminLlmTraceSummary,
} from '../services/adminService'
import { getLlmOperationLabel, getLlmTraceStageLabel } from '../services/llmTraceService'

const RECENT_TRACES_LIMIT = 12

function formatMoney(value: number) {
  return `$${value.toFixed(4)}`
}

function getJobTypeLabel(type: string) {
  switch (type) {
    case 'publish_to_channel':
      return 'Публикация в канал'
    case 'onboard_website':
      return 'Онбординг сайта'
    case 'onboard_rss_article':
      return 'RSS article-agent'
    case 'ads_campaign':
      return 'Рекламная кампания'
    default:
      return type.replace(/_/g, ' ')
  }
}

function getJobStatusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'running':
      return 'Running'
    case 'success':
      return 'Success'
    case 'failed':
      return 'Failed'
    case 'canceled':
      return 'Canceled'
    case 'timed_out':
      return 'Timed out'
    default:
      return status
  }
}

function getJobStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'success':
      return 'default'
    case 'failed':
    case 'timed_out':
      return 'destructive'
    case 'running':
      return 'secondary'
    default:
      return 'outline'
  }
}

export function AdminLLMAnalyticsPage() {
  const [data, setData] = useState<AdminLlmAnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const load = async () => {
    setIsLoading(true)
    try {
      const response = await getAdminLlmAnalytics({ limit: RECENT_TRACES_LIMIT })
      setData(response)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить LLM аналитику')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const expensiveTraces = useMemo(() => {
    return [...(data?.recentTraces ?? [])].sort((left, right) => (right.costUsd ?? 0) - (left.costUsd ?? 0)).slice(0, 5)
  }, [data])

  const slowTraces = useMemo(() => {
    return [...(data?.recentTraces ?? [])].sort((left, right) => (right.latencyMs ?? 0) - (left.latencyMs ?? 0)).slice(0, 5)
  }, [data])

  if (isLoading && !data) {
    return <div className="text-sm text-gray-500">Загрузка LLM аналитики...</div>
  }

  if (!data) {
    return <div className="text-sm text-red-500">Не удалось загрузить LLM аналитику</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">LLM аналитика</h1>
          <p className="text-gray-600">Глобальная статистика по Gemini-запросам и parser/posting операциям.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/llm-traces">
            <Button variant="outline">Все traces</Button>
          </Link>
          <Button variant="outline" onClick={() => void load()} disabled={isLoading}>
            <RefreshCw className={`mr-2 size-4 ${isLoading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Всего запросов</CardTitle>
            <Activity className="size-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{data.summary.totalRequests}</div>
            <p className="mt-1 text-xs text-gray-500">В выборке: {data.summary.shownRequests}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Общая стоимость</CardTitle>
            <DollarSign className="size-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{formatMoney(data.summary.totalCostUsd)}</div>
            <p className="mt-1 text-xs text-gray-500">Средняя: {formatMoney(data.summary.avgCostUsd)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Всего токенов</CardTitle>
            <Zap className="size-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{data.summary.totalTokens.toLocaleString('ru-RU')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Средняя задержка</CardTitle>
            <Clock className="size-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{Math.round(data.summary.avgLatencyMs)} ms</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Статистика по моделям</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.byModel.map((model) => (
              <div key={model.model} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium text-gray-900">{model.model}</div>
                  <div className="text-xs text-gray-500">{model.count} запросов</div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium text-gray-900">{model.totalTokens.toLocaleString('ru-RU')} токенов</div>
                  <div className="text-gray-500">{formatMoney(model.costUsd)}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Последние {data.recentTraces.length} trace</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.recentTraces.map((trace) => (
              <TraceRow key={trace.id} trace={trace} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>LLM по задачам</CardTitle>
            <div className="mt-1 text-sm text-gray-500">Топ задач по суммарной стоимости LLM-вызовов.</div>
          </div>
          <Workflow className="size-5 text-slate-500" />
        </CardHeader>
        <CardContent>
          {data.byJob.length === 0 ? (
            <div className="text-sm text-gray-500">Нет trace, привязанных к задачам.</div>
          ) : (
            <div className="space-y-3">
              {data.byJob.map((job) => (
                <Link
                  key={job.jobId}
                  to={`/admin/jobs/${job.jobId}`}
                  state={{ backTo: '/admin/llm-analytics' }}
                  className="block rounded-lg border p-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium text-gray-900">{getJobTypeLabel(job.jobType)}</div>
                        <Badge variant={getJobStatusBadgeVariant(job.jobStatus)}>{getJobStatusLabel(job.jobStatus)}</Badge>
                        <Badge variant="outline">Team {job.teamId.slice(0, 8)}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Job ID: {job.jobId.slice(0, 8)}... · Последний trace: {new Date(job.latestTraceAt).toLocaleString('ru-RU')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">{formatMoney(job.totalCostUsd)}</div>
                      <div className="text-xs text-gray-500">{job.requestCount} trace</div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <div className="text-xs text-gray-500">Токены</div>
                      <div className="font-medium text-gray-900">{job.totalTokens.toLocaleString('ru-RU')}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Запросы</div>
                      <div className="font-medium text-gray-900">{job.requestCount}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Средняя цена trace</div>
                      <div className="font-medium text-gray-900">{formatMoney(job.requestCount > 0 ? job.totalCostUsd / job.requestCount : 0)}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Самые дорогие запросы</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expensiveTraces.map((trace) => (
                <CompactTraceRow key={trace.id} trace={trace} right={formatMoney(trace.costUsd ?? 0)} sub={`${(trace.totalTokens ?? 0).toLocaleString('ru-RU')} токенов`} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Самые медленные запросы</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {slowTraces.map((trace) => (
                <CompactTraceRow key={trace.id} trace={trace} right={`${trace.latencyMs ?? 0} ms`} sub={formatMoney(trace.costUsd ?? 0)} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function TraceRow({ trace }: { trace: AdminLlmTraceSummary }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="outline">{trace.model}</Badge>
        <Badge variant="secondary">{getLlmOperationLabel(trace.operation)}</Badge>
        <Badge variant="outline">{getLlmTraceStageLabel(trace.stage)}</Badge>
        <span className="text-xs text-gray-500">{new Date(trace.createdAt).toLocaleString('ru-RU')}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <div className="text-xs text-gray-500">Токены</div>
          <div className="font-medium">{(trace.totalTokens ?? 0).toLocaleString('ru-RU')}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Стоимость</div>
          <div className="font-medium">{formatMoney(trace.costUsd ?? 0)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Задержка</div>
          <div className="font-medium">{trace.latencyMs ?? 0} ms</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Команда</div>
          <div className="font-medium">{trace.teamId.slice(0, 8)}...</div>
        </div>
      </div>
      <Link
        to={`/admin/llm-traces/${trace.id}`}
        state={{ backTo: '/admin/llm-analytics' }}
        className="mt-3 inline-flex text-sm text-blue-600 hover:underline"
      >
        Открыть trace
      </Link>
    </div>
  )
}

function CompactTraceRow({
  trace,
  right,
  sub,
}: {
  trace: AdminLlmTraceSummary
  right: string
  sub: string
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-gray-900">{trace.model}</div>
        <div className="text-xs text-gray-500">{sub}</div>
      </div>
      <div className="text-right text-sm font-medium text-gray-900">{right}</div>
    </div>
  )
}
