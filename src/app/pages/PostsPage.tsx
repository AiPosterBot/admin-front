import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AlertCircle, CheckCircle, ExternalLink, Eye, Heart, Loader2, Search } from 'lucide-react'
import type { DateRange } from 'react-day-picker'

import { Pagination } from '../components/Pagination'
import { PeriodPicker } from '../components/PeriodPicker'
import { telegramContentToPlainText } from '../components/TelegramContent'
import { MediaStatusHint } from '../components/MediaStatusHint'
import { TagFilter } from '../components/TagFilter'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { useTeam } from '../context/TeamContext'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useTeamPosts } from '../hooks/useTeamPosts'
import * as channelService from '../services/channelService'
import * as sourceService from '../services/sourceService'

const PAGE_SIZE = 15

type StatusFilter = 'all' | 'success' | 'failed'

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Все статусы' },
  { value: 'success', label: 'Успешные' },
  { value: 'failed', label: 'С ошибкой' },
]

function startOfDayIso(date: Date | undefined) {
  if (!date) {
    return undefined
  }

  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value.toISOString()
}

function endOfDayIso(date: Date | undefined) {
  if (!date) {
    return undefined
  }

  const value = new Date(date)
  value.setHours(23, 59, 59, 999)
  return value.toISOString()
}

export function PostsPage() {
  const { currentTeamId, currentTeam } = useTeam()
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [channelFilter, setChannelFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [page, setPage] = useState(1)
  const [channelTagFilter, setChannelTagFilter] = useState<string[]>([])
  const [sourceTagFilter, setSourceTagFilter] = useState<string[]>([])
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 400)

  useEffect(() => {
    if (!currentTeamId) {
      return
    }

    void Promise.all([
      channelService.getTeamChannels(currentTeamId),
      sourceService.getTeamSources(currentTeamId),
      sourceService.primeTeamSourceTags(currentTeamId),
    ])
  }, [currentTeamId])

  const { state: postsState } = useTeamPosts({
    page,
    limit: PAGE_SIZE,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    channelId: channelFilter !== 'all' ? channelFilter : undefined,
    sourceId: sourceFilter !== 'all' ? sourceFilter : undefined,
    channelTagIds: channelTagFilter,
    sourceTagIds: sourceTagFilter,
    q: debouncedSearchQuery.trim() || undefined,
    from: startOfDayIso(dateRange?.from),
    to: endOfDayIso(dateRange?.to),
  })

  const teamChannels = currentTeamId ? channelService.getTeamChannelsList(currentTeamId) : []
  const teamSources = currentTeamId ? sourceService.getTeamSourcesList(currentTeamId) : []
  const teamChannelTags = currentTeamId ? channelService.getTeamChannelTags(currentTeamId) : []
  const teamSourceTags = currentTeamId ? sourceService.getTeamSourceTags(currentTeamId) : []
  const hasActiveFilters =
    searchQuery.length > 0 ||
    statusFilter !== 'all' ||
    channelFilter !== 'all' ||
    sourceFilter !== 'all' ||
    dateRange !== undefined ||
    channelTagFilter.length > 0 ||
    sourceTagFilter.length > 0

  const resetFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setChannelFilter('all')
    setSourceFilter('all')
    setDateRange(undefined)
    setChannelTagFilter([])
    setSourceTagFilter([])
    setPage(1)
  }

  if (!currentTeam) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 text-2xl font-bold text-foreground">Команда не выбрана</h2>
        <p className="text-muted-foreground">Выберите команду в верхнем меню.</p>
      </div>
    )
  }

  if (postsState.status === 'loading' || postsState.status === 'idle') {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (postsState.status === 'error') {
    return <div className="rounded-lg border border-border bg-card p-6 text-sm text-destructive">{postsState.error}</div>
  }

  const postsResult = postsState.data
  const posts = postsResult.data
  const totalItems = postsResult.total
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const statusCounts = postsResult.facets?.statusCounts ?? { all: totalItems, success: 0, failed: 0 }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Публикации</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {currentTeam.name} · {totalItems} публикаций
        </p>
      </div>

      <div className="flex flex-col flex-wrap items-start gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value)
              setPage(1)
            }}
            placeholder="Поиск по тексту, каналу или источнику..."
            className="pl-9"
          />
        </div>

        <PeriodPicker
          value={dateRange}
          onChange={(range) => {
            setDateRange(range)
            setPage(1)
          }}
        />

        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value as StatusFilter)
            setPage(1)
          }}
        >
          <SelectTrigger
            className={`h-8 min-w-[150px] w-auto text-sm ${
              statusFilter !== 'all' ? 'border-primary/50 bg-primary/10 text-foreground' : ''
            }`}
          >
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

        <Select
          value={channelFilter}
          onValueChange={(value) => {
            setChannelFilter(value)
            setPage(1)
          }}
        >
          <SelectTrigger
            className={`h-8 min-w-[150px] w-auto text-sm ${
              channelFilter !== 'all' ? 'border-primary/50 bg-primary/10 text-foreground' : ''
            }`}
          >
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

        <Select
          value={sourceFilter}
          onValueChange={(value) => {
            setSourceFilter(value)
            setPage(1)
          }}
        >
          <SelectTrigger
            className={`h-8 min-w-[150px] w-auto text-sm ${
              sourceFilter !== 'all' ? 'border-primary/50 bg-primary/10 text-foreground' : ''
            }`}
          >
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

        <TagFilter
          tags={teamChannelTags}
          selectedTagIds={channelTagFilter}
          onChange={(ids) => {
            setChannelTagFilter(ids)
            setPage(1)
          }}
          label="Теги каналов"
        />
        <TagFilter
          tags={teamSourceTags}
          selectedTagIds={sourceTagFilter}
          onChange={(ids) => {
            setSourceTagFilter(ids)
            setPage(1)
          }}
          label="Теги источников"
        />

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto flex-shrink-0 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Сбросить
          </button>
        )}
      </div>

      <div className="divide-y divide-border rounded-lg border border-border bg-card">
        {posts.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <div className="mb-3 text-4xl text-muted-foreground/50">📨</div>
            <div className="font-medium">Публикации не найдены</div>
            {hasActiveFilters && (
              <button type="button" onClick={resetFilters} className="mt-2 text-sm text-primary hover:underline">
                Сбросить фильтры
              </button>
            )}
          </div>
        ) : (
          posts.map((post) => {
            const channel = teamChannels.find((entry) => entry.id === post.channelId)
            const previewText = telegramContentToPlainText(post.generatedContent, post.generatedContentFormat)
            const telegramPostUrl =
              post.status === 'success' && channel?.telegramUsername && post.telegramMessageId
                ? `https://t.me/${channel.telegramUsername}/${post.telegramMessageId}`
                : null

            return (
              <div
                key={post.id}
                className="flex cursor-pointer items-start gap-4 px-4 py-4 transition-colors hover:bg-muted/40"
                onClick={() => navigate(`/posts/${post.id}`)}
              >
                <div className="mt-1 flex-shrink-0">
                  {post.status === 'success' ? <CheckCircle className="size-4 text-green-500" /> : <AlertCircle className="size-4 text-red-500" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/channels/${post.channelId}`}
                        className="text-sm font-medium text-foreground hover:text-primary"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {post.channelName}
                      </Link>
                      <span className="text-xs tabular-nums text-muted-foreground">{new Date(post.postedAt).toLocaleString('ru-RU')}</span>
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-2">
                      {post.status === 'success' && (
                        <div className="flex items-center gap-2.5">
                          {post.views !== undefined && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Eye className="size-3" />
                              {post.views.toLocaleString('ru-RU')}
                            </span>
                          )}
                          {post.reactions !== undefined && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Heart className="size-3" />
                              {post.reactions}
                            </span>
                          )}
                        </div>
                      )}
                      {post.status !== 'success' && <Badge variant="destructive" className="text-xs">Ошибка</Badge>}
                    </div>
                  </div>

                  <div className="mb-2 flex gap-3">
                    <p className="line-clamp-2 min-w-0 flex-1 text-sm text-muted-foreground">{previewText}</p>
                    {post.mediaUrl && post.mediaPreviewAvailable !== false && (
                      <img src={post.mediaUrl} alt="" className="size-14 flex-shrink-0 rounded-lg object-cover" />
                    )}
                  </div>
                  <MediaStatusHint
                    hasMedia={post.hasMedia}
                    mediaPreviewAvailable={post.mediaPreviewAvailable}
                    mediaPreviewRestrictedReason={post.mediaPreviewRestrictedReason}
                    className="mb-2"
                  />

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="max-w-[220px] truncate italic">{post.itemTitle}</span>
                    <span>·</span>
                    <Link
                      to={`/sources/${post.sourceId}`}
                      className="text-primary hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {post.sourceName}
                    </Link>
                    {telegramPostUrl && (
                      <>
                        <span>·</span>
                        <a
                          href={telegramPostUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <ExternalLink className="size-3" />
                          TG
                        </a>
                      </>
                    )}
                  </div>
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
