import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AlertCircle, CheckCircle, ChevronRight, Clock, Loader2 } from 'lucide-react'
import type { DateRange } from 'react-day-picker'

import { Pagination } from '../components/Pagination'
import { PeriodPicker } from '../components/PeriodPicker'
import { Badge } from '../components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { useTeam } from '../context/TeamContext'
import type { Channel, Source } from '../types/domain'
import { useTeamJobs } from '../hooks/useTeamJobs'
import { getTeamChannels } from '../services/channelService'
import type { JobView } from '../services/jobService'
import { getTeamSources } from '../services/sourceService'

const PAGE_SIZE = 15

type TypeFilter =
  | 'all'
  | 'refresh_channel_metadata'
  | 'publish_to_channel'
  | 'fetch_rss'
  | 'fetch_rss_hybrid'
  | 'fetch_telegram'
  | 'fetch_website'
  | 'onboard_website'
  | 'onboard_rss_article'
  | 'ads_campaign'

type StatusFilter = 'all' | 'pending' | 'running' | 'success' | 'failed' | 'canceled' | 'timed_out'

const TYPE_OPTIONS: Array<{ value: TypeFilter; label: string }> = [
  { value: 'all', label: 'Все типы' },
  { value: 'refresh_channel_metadata', label: 'Refresh канала' },
  { value: 'publish_to_channel', label: 'Публикация' },
  { value: 'fetch_rss', label: 'Скан RSS' },
  { value: 'fetch_rss_hybrid', label: 'Скан RSS + HTML' },
  { value: 'fetch_telegram', label: 'Скан Telegram' },
  { value: 'fetch_website', label: 'Скан сайта' },
  { value: 'onboard_website', label: 'Онбординг сайта' },
  { value: 'onboard_rss_article', label: 'Онбординг RSS article-agent' },
  { value: 'ads_campaign', label: 'Рекламная рассылка' },
]

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Все статусы' },
  { value: 'pending', label: 'Ожидает' },
  { value: 'running', label: 'В работе' },
  { value: 'success', label: 'Выполнено' },
  { value: 'failed', label: 'Ошибка' },
  { value: 'canceled', label: 'Отменена' },
  { value: 'timed_out', label: 'Таймаут' },
]

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
      return <CheckCircle className="size-4 text-green-500" />
    case 'failed':
    case 'timed_out':
      return <AlertCircle className="size-4 text-red-500" />
    case 'running':
      return <Clock className="size-4 animate-pulse text-blue-500" />
    case 'canceled':
      return <AlertCircle className="size-4 text-muted-foreground" />
    default:
      return <Clock className="size-4 text-muted-foreground" />
  }
}

function getDeliveryStatusLabel(job: JobView) {
  const delivery = job.delivery
  if (!delivery) {
    return null
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

function getRangeQuery(range: DateRange | undefined) {
  if (!range?.from) {
    return { from: undefined, to: undefined }
  }

  const from = new Date(range.from)
  from.setHours(0, 0, 0, 0)

  if (!range.to) {
    return {
      from: from.toISOString(),
      to: undefined,
    }
  }

  const to = new Date(range.to)
  to.setHours(23, 59, 59, 999)

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  }
}

export function TeamJobsPage() {
  const { currentTeamId, currentTeam } = useTeam()
  const navigate = useNavigate()

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [channelFilter, setChannelFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [teamChannels, setTeamChannels] = useState<Channel[]>([])
  const [teamSources, setTeamSources] = useState<Source[]>([])

  useEffect(() => {
    if (!currentTeamId) {
      setTeamChannels([])
      setTeamSources([])
      return
    }

    void Promise.all([getTeamChannels(currentTeamId), getTeamSources(currentTeamId)])
      .then(([channels, sources]) => {
        setTeamChannels(channels)
        setTeamSources(sources)
      })
      .catch(() => {
        setTeamChannels([])
        setTeamSources([])
      })
  }, [currentTeamId])

  const rangeQuery = useMemo(() => getRangeQuery(dateRange), [dateRange])
  const { state: jobsState } = useTeamJobs({
    page,
    limit: PAGE_SIZE,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    channelId: channelFilter !== 'all' ? channelFilter : undefined,
    sourceId: sourceFilter !== 'all' ? sourceFilter : undefined,
    from: rangeQuery.from,
    to: rangeQuery.to,
  })

  const jobsResult = jobsState.status === 'success' ? jobsState.data : null
  const pageJobs = jobsResult?.data ?? []
  const totalItems = jobsResult?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const typeCounts = jobsResult?.facets?.typeCounts ?? {
    all: totalItems,
    refresh_channel_metadata: 0,
    publish_to_channel: 0,
    fetch_rss: 0,
    fetch_rss_hybrid: 0,
    fetch_telegram: 0,
    fetch_website: 0,
    onboard_website: 0,
    onboard_rss_article: 0,
    ads_campaign: 0,
  }
  const statusCounts = jobsResult?.facets?.statusCounts ?? {
    all: totalItems,
    pending: 0,
    running: 0,
    success: 0,
    failed: 0,
    canceled: 0,
    timed_out: 0,
  }

  if (!currentTeam) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 text-2xl font-bold text-foreground">Команда не выбрана</h2>
        <p className="text-muted-foreground">Выберите команду в верхнем меню.</p>
      </div>
    )
  }

  if (jobsState.status === 'loading' || jobsState.status === 'idle') {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (jobsState.status === 'error') {
    return <div className="rounded-lg border border-border bg-card p-6 text-sm text-destructive">{jobsState.error}</div>
  }

  const hasActiveFilters =
    typeFilter !== 'all' || statusFilter !== 'all' || dateRange !== undefined || channelFilter !== 'all' || sourceFilter !== 'all'

  const resetFilters = () => {
    setDateRange(undefined)
    setTypeFilter('all')
    setStatusFilter('all')
    setChannelFilter('all')
    setSourceFilter('all')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Задачи</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {currentTeam.name} · {totalItems} задач
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={typeFilter}
          onValueChange={(value) => {
            setTypeFilter(value as TypeFilter)
            setPage(1)
          }}
        >
          <SelectTrigger className={`!w-auto h-8 min-w-[180px] shrink-0 text-sm ${typeFilter !== 'all' ? 'border-primary/50 bg-primary/10 text-foreground' : ''}`}>
            <SelectValue placeholder="Тип задачи" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label} <span className="tabular-nums text-muted-foreground">{typeCounts[option.value]}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value as StatusFilter)
            setPage(1)
          }}
        >
          <SelectTrigger className={`!w-auto h-8 min-w-[180px] shrink-0 text-sm ${statusFilter !== 'all' ? 'border-primary/50 bg-primary/10 text-foreground' : ''}`}>
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label} <span className="tabular-nums text-muted-foreground">{statusCounts[option.value]}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <PeriodPicker
          value={dateRange}
          onChange={(value) => {
            setDateRange(value)
            setPage(1)
          }}
        />

        {teamChannels.length > 0 && (
          <Select
            value={channelFilter}
            onValueChange={(value) => {
              setChannelFilter(value)
              setPage(1)
            }}
          >
            <SelectTrigger className={`!w-auto h-8 min-w-[180px] shrink-0 text-sm ${channelFilter !== 'all' ? 'border-primary/50 bg-primary/10 text-foreground' : ''}`}>
              <SelectValue placeholder="Канал" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все каналы</SelectItem>
              {teamChannels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  {channel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {teamSources.length > 0 && (
          <Select
            value={sourceFilter}
            onValueChange={(value) => {
              setSourceFilter(value)
              setPage(1)
            }}
          >
            <SelectTrigger className={`!w-auto h-8 min-w-[180px] shrink-0 text-sm ${sourceFilter !== 'all' ? 'border-primary/50 bg-primary/10 text-foreground' : ''}`}>
              <SelectValue placeholder="Источник" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все источники</SelectItem>
              {teamSources.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <button onClick={resetFilters} className="ml-auto text-xs text-muted-foreground transition-colors hover:text-foreground">
            Сбросить
          </button>
        )}
      </div>

      <div className="divide-y divide-border rounded-lg border border-border bg-card">
        {pageJobs.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <div className="mb-3 text-4xl text-muted-foreground/50">⚡</div>
            <div className="font-medium">Задач не найдено</div>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="mt-2 text-sm text-primary hover:underline">
                Сбросить фильтры
              </button>
            )}
          </div>
        ) : (
          pageJobs.map((job) => {
            const relatedChannel = job.related?.channel ?? (job.channelId ? teamChannels.find((item) => item.id === job.channelId) : null)
            const relatedSource = job.related?.source ?? (job.sourceId ? teamSources.find((item) => item.id === job.sourceId) : null)

            return (
              <div
                key={job.id}
                className="flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40"
                onClick={() => navigate(`/jobs/${job.id}`)}
              >
                <div className="flex-shrink-0">{getJobStatusIcon(job.status)}</div>

                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{getJobTypeLabel(job.type)}</span>
                    <Badge
                      variant={getJobStatusVariant(job.status)}
                      className={`text-xs ${job.status === 'running' ? 'border-blue-200 bg-blue-100 text-blue-700' : ''}`}
                    >
                      {getJobStatusLabel(job.status)}
                    </Badge>
                    {job.type === 'publish_to_channel' && job.delivery ? (
                      <Badge variant={getDeliveryStatusVariant(job)} className="text-xs">
                        {getDeliveryStatusLabel(job)}
                      </Badge>
                    ) : null}
                    {relatedChannel && (
                      <Link to={`/channels/${relatedChannel.id}`} onClick={(event) => event.stopPropagation()}>
                        <Badge variant="outline" className="cursor-pointer text-xs hover:bg-muted">
                          Канал: {relatedChannel.name}
                        </Badge>
                      </Link>
                    )}
                    {relatedSource && (
                      <Link to={`/sources/${relatedSource.id}`} onClick={(event) => event.stopPropagation()}>
                        <Badge variant="outline" className="cursor-pointer text-xs hover:bg-muted">
                          Источник: {relatedSource.name}
                        </Badge>
                      </Link>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {new Date(job.createdAt).toLocaleString('ru-RU')}
                    {job.completedAt && (
                      <span className="ml-2 text-muted-foreground/60">
                        · {Math.round((new Date(job.completedAt).getTime() - new Date(job.createdAt).getTime()) / 1000)}с
                      </span>
                    )}
                  </div>

                  {job.error && <div className="mt-0.5 truncate text-xs text-red-500">{job.error}</div>}
                </div>

                <div className="flex flex-shrink-0 items-center gap-2">
                  {job.llmTraceIds.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      LLM ×{job.llmTraceIds.length}
                    </Badge>
                  )}
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </div>
            )
          })
        )}
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={totalItems} pageSize={PAGE_SIZE} />
    </div>
  )
}
