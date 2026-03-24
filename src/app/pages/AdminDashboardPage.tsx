import { Link } from 'react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertCircle,
  Brain,
  Database,
  DollarSign,
  LayoutDashboard,
  Play,
  Radio,
  RefreshCw,
  Rss,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  getAdminDashboard,
  getAdminSchedulerStatus,
  runAdminSchedulerNow,
  type AdminDashboardData,
  type AdminSchedulerStatus,
} from '../services/adminService'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString('ru-RU')
}

export function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null)
  const [scheduler, setScheduler] = useState<AdminSchedulerStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRunningScheduler, setIsRunningScheduler] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      const [dashboardData, schedulerData] = await Promise.all([getAdminDashboard(), getAdminSchedulerStatus()])
      setDashboard(dashboardData)
      setScheduler(schedulerData)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить admin dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const metrics = useMemo(() => {
    if (!dashboard) {
      return []
    }

    return [
      {
        label: 'Пользователи',
        value: String(dashboard.kpi.users),
        caption: 'Всего в системе',
        icon: Users,
        tone: 'text-blue-600',
      },
      {
        label: 'Команды',
        value: `${dashboard.kpi.activeTeams}/${dashboard.kpi.teams}`,
        caption: 'Активные / всего',
        icon: LayoutDashboard,
        tone: 'text-green-600',
      },
      {
        label: 'Каналы',
        value: `${dashboard.kpi.activeChannels}/${dashboard.kpi.channels}`,
        caption: 'Активные / всего',
        icon: Radio,
        tone: 'text-purple-600',
      },
      {
        label: 'Источники',
        value: `${dashboard.kpi.activeSources}/${dashboard.kpi.sources}`,
        caption: 'Активные / всего',
        icon: Rss,
        tone: 'text-amber-600',
      },
      {
        label: 'Материалы за 24ч',
        value: String(dashboard.kpi.items24h),
        caption: 'Новые items',
        icon: Database,
        tone: 'text-sky-600 dark:text-sky-400',
      },
      {
        label: 'Посты за 24ч',
        value: String(dashboard.kpi.posts24h),
        caption: 'Опубликовано',
        icon: Play,
        tone: 'text-emerald-600',
      },
      {
        label: 'LLM токены за 24ч',
        value: dashboard.kpi.llmTokens24h.toLocaleString('ru-RU'),
        caption: `${dashboard.kpi.llmRequests24h} запросов`,
        icon: Brain,
        tone: 'text-pink-600 dark:text-pink-400',
      },
      {
        label: 'Ошибки задач за 24ч',
        value: String(dashboard.kpi.failedJobs24h),
        caption: `${dashboard.kpi.runningJobs} running`,
        icon: AlertCircle,
        tone: 'text-red-600',
      },
    ]
  }, [dashboard])

  const handleRunScheduler = async () => {
    setIsRunningScheduler(true)
    try {
      const schedulerData = await runAdminSchedulerNow()
      setScheduler(schedulerData)
      const dashboardData = await getAdminDashboard()
      setDashboard(dashboardData)
      toast.success('Планировщик запущен вручную')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось запустить планировщик')
    } finally {
      setIsRunningScheduler(false)
    }
  }

  if (isLoading && !dashboard) {
    return <div className="text-sm text-muted-foreground">Загрузка dashboard...</div>
  }

  if (!dashboard || !scheduler) {
    return <div className="text-sm text-red-500">Не удалось загрузить данные admin dashboard</div>
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-background to-sky-50 p-5 dark:border-indigo-900 dark:from-indigo-950/20 dark:via-background dark:to-sky-950/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Администраторский дашборд</h1>
          <p className="text-muted-foreground">Глобальная сводка по системе, LLM и планировщику.</p>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Этот экран помогает быстро оценить состояние платформы, нагрузку на scheduler и свежую активность по задачам и источникам.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={isLoading} className="border-border bg-background/80 backdrop-blur">
            <RefreshCw className={`mr-2 size-4 ${isLoading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
          <Button onClick={() => void handleRunScheduler()} disabled={isRunningScheduler || scheduler.isTickRunning}>
            <Play className={`mr-2 size-4 ${isRunningScheduler ? 'animate-spin' : ''}`} />
            Run scheduler
          </Button>
        </div>
      </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Состояние системы</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="mb-1 text-sm text-muted-foreground">Планировщик</div>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <span className={`size-2 rounded-full ${scheduler.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
              {scheduler.enabled ? 'Включен' : 'Выключен'}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Интервал: {scheduler.intervalSec} сек</div>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="mb-1 text-sm text-muted-foreground">Последний старт</div>
            <div className="text-sm font-medium text-foreground">{formatDateTime(scheduler.lastTickStartedAt)}</div>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="mb-1 text-sm text-muted-foreground">Последнее завершение</div>
            <div className="text-sm font-medium text-foreground">{formatDateTime(scheduler.lastTickFinishedAt)}</div>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="mb-1 text-sm text-muted-foreground">Следующий тик</div>
            <div className="text-sm font-medium text-foreground">{formatDateTime(scheduler.nextTickAt)}</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <Card key={metric.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
                <Icon className={`size-5 ${metric.tone}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{metric.value}</div>
                <p className="mt-1 text-xs text-muted-foreground">{metric.caption}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>LLM за 24 часа</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-pink-500/20 bg-pink-500/10 p-4">
              <div className="mb-1 text-sm text-pink-700 dark:text-pink-300">Стоимость</div>
              <div className="text-2xl font-bold text-pink-900 dark:text-pink-100">${dashboard.kpi.llmCost24h.toFixed(4)}</div>
            </div>
            <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-4">
              <div className="mb-1 text-sm text-sky-700 dark:text-sky-300">Токены</div>
              <div className="text-2xl font-bold text-sky-900 dark:text-sky-100">{dashboard.kpi.llmTokens24h.toLocaleString('ru-RU')}</div>
            </div>
            <Link to="/admin/llm-analytics" className="inline-flex text-sm text-primary hover:underline">
              Открыть полную LLM аналитику
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Последний тик scheduler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Источников due</span>
              <span className="font-medium text-foreground">{scheduler.lastTickSummary?.dueSources ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Source jobs создано</span>
              <span className="font-medium text-foreground">{scheduler.lastTickSummary?.createdSourceJobs ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Channel refresh jobs</span>
              <span className="font-medium text-foreground">{scheduler.lastTickSummary?.createdChannelRefreshJobs ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Уже в очереди</span>
              <span className="font-medium text-foreground">
                {(scheduler.lastTickSummary?.skippedSourceAlreadyQueued ?? 0) + (scheduler.lastTickSummary?.skippedChannelRefreshAlreadyQueued ?? 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Ошибок</span>
              <span className="font-medium text-red-600">
                {(scheduler.lastTickSummary?.failedSources ?? 0) + (scheduler.lastTickSummary?.failedChannels ?? 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Последние задачи</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.recentJobs.length === 0 ? (
              <div className="text-sm text-muted-foreground">Задач пока нет</div>
            ) : (
              dashboard.recentJobs.map((job) => (
                <Link
                  key={job.id}
                  to={`/admin/jobs/${job.id}`}
                  state={{ backTo: '/admin/dashboard' }}
                  className="block rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div className="font-medium text-foreground">{job.type}</div>
                    <Badge variant="outline">{job.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(job.createdAt).toLocaleString('ru-RU')}</div>
                  <div className="mt-2 text-xs text-muted-foreground">ID: {job.id}</div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Последние ошибки источников</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.recentErrors.length === 0 ? (
              <div className="text-sm text-muted-foreground">Свежих ошибок нет</div>
            ) : (
              dashboard.recentErrors.map((error) => (
                <div key={error.sourceId} className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                  <div className="font-medium text-red-800 dark:text-red-200">{error.sourceName}</div>
                  <div className="mt-1 text-sm text-red-700 dark:text-red-300">{error.lastError ?? 'Неизвестная ошибка'}</div>
                  <div className="mt-2 text-xs text-red-600 dark:text-red-400">{formatDateTime(error.updatedAt)}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
