import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Plus, Database, CheckCircle, XCircle, Filter, Pause, Tag, Loader2 } from 'lucide-react'

import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Pagination } from '../components/Pagination'
import { useTeam } from '../context/TeamContext'
import { AddSourceDialog } from '../components/AddSourceDialog'
import { TagBadge } from '../components/TagBadge'
import { TagFilter } from '../components/TagFilter'
import { ManageTagsDialog } from '../components/ManageTagsDialog'
import { useTeamSources } from '../hooks/useTeamSources'
import * as sourceService from '../services/sourceService'

const PAGE_SIZE = 10

const SOURCE_TYPE_LABEL: Record<string, string> = {
  rss: 'RSS',
  website: 'Web',
  telegram: 'TG',
}

type StatusFilter = 'all' | 'active' | 'stopped' | 'error'
type TypeFilter = 'all' | 'rss' | 'website' | 'telegram'

export function TeamSourcesPage() {
  const { currentTeam, currentTeamId } = useTeam()
  const navigate = useNavigate()
  const team = currentTeam

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [page, setPage] = useState(1)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [manageTagsOpen, setManageTagsOpen] = useState(false)

  useEffect(() => {
    if (!currentTeamId) {
      return
    }

    void sourceService.primeTeamSourceTags(currentTeamId)
  }, [currentTeamId])

  const { state: sourcesState, invalidate } = useTeamSources({
    page,
    limit: PAGE_SIZE,
    status: statusFilter === 'active' ? 'ok' : statusFilter === 'error' ? 'error' : 'all',
    type: typeFilter !== 'all' ? typeFilter : undefined,
    isActive: statusFilter === 'active' ? true : statusFilter === 'stopped' ? false : statusFilter === 'error' ? true : undefined,
    tagIds: selectedTagIds,
  })

  const teamTags = sourceService.getTeamSourceTags(currentTeamId ?? '')

  if (!team) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 text-2xl font-bold text-foreground">Команда не выбрана</h2>
        <p className="text-muted-foreground">Выберите команду в верхнем меню</p>
      </div>
    )
  }

  if (sourcesState.status === 'loading' || sourcesState.status === 'idle') {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (sourcesState.status === 'error') {
    return <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">{sourcesState.error}</div>
  }

  const sourcesResult = sourcesState.data
  const sources = sourcesResult.data
  const totalItems = sourcesResult.total
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const statusCounts = sourcesResult.facets?.statusCounts ?? { all: totalItems, active: 0, stopped: 0, error: 0 }
  const typeCounts = sourcesResult.facets?.typeCounts ?? { all: totalItems, rss: 0, website: 0, telegram: 0 }

  const handleStatusChange = (value: StatusFilter) => {
    setStatusFilter(value)
    setPage(1)
  }

  const handleTypeChange = (value: TypeFilter) => {
    setTypeFilter(value)
    setPage(1)
  }

  const handleTagFilterChange = (ids: string[]) => {
    setSelectedTagIds(ids)
    setPage(1)
  }

  const hasActiveFilters = statusFilter !== 'all' || typeFilter !== 'all' || selectedTagIds.length > 0

  const statusFilterOptions: Array<{ value: StatusFilter; label: string; count: number; icon?: React.ReactNode }> = [
    { value: 'all', label: 'Все', count: statusCounts.all },
    { value: 'active', label: 'Активные', count: statusCounts.active, icon: <CheckCircle className="size-3.5 text-green-500" /> },
    { value: 'stopped', label: 'Остановленные', count: statusCounts.stopped, icon: <Pause className="size-3.5 text-muted-foreground" /> },
    { value: 'error', label: 'С ошибками', count: statusCounts.error, icon: <XCircle className="size-3.5 text-red-500" /> },
  ]

  const typeFilterOptions: Array<{ value: TypeFilter; label: string; count: number }> = [
    { value: 'all', label: 'Все типы', count: typeCounts.all },
    { value: 'rss', label: 'RSS', count: typeCounts.rss },
    { value: 'website', label: 'Web', count: typeCounts.website },
    { value: 'telegram', label: 'Telegram', count: typeCounts.telegram },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 via-background to-sky-500/10 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3 flex-wrap sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Источники контента</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {team.name} · {totalItems} источников
          </p>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Здесь вы управляете источниками контента. Вы можете добавить Telegram, RSS и сайты со статьями.
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 size-4" />
          Добавить источник
        </Button>
        <AddSourceDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSourceCreated={() => {
            invalidate()
            toast.success('Источник добавлен')
          }}
        />
      </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 shrink-0 text-muted-foreground" />
            <div className="flex items-center gap-1 flex-wrap">
              {statusFilterOptions.map(({ value, label, count, icon }) => (
                <button
                  key={value}
                  onClick={() => handleStatusChange(value)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                      statusFilter === value
                        ? 'bg-foreground text-background shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                  {icon}
                  {label}
                  <span className={`text-xs tabular-nums ${statusFilter === value ? 'opacity-70' : 'text-muted-foreground'}`}>{count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="hidden h-5 w-px bg-border sm:block" />
          <div className="flex items-center gap-1 flex-wrap">
            {typeFilterOptions.map(({ value, label, count }) => (
              <button
                key={value}
                onClick={() => handleTypeChange(value)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  typeFilter === value ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {label}
                <span className={`text-xs tabular-nums ${typeFilter === value ? 'opacity-70' : 'text-muted-foreground'}`}>{count}</span>
              </button>
            ))}
          </div>

          <div className="hidden h-5 w-px bg-border sm:block" />
          <TagFilter tags={teamTags} selectedTagIds={selectedTagIds} onChange={handleTagFilterChange} />
          <button
            onClick={() => setManageTagsOpen(true)}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Управление тегами"
          >
            <Tag className="size-3.5" />
          </button>
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => {
              setStatusFilter('all')
              setTypeFilter('all')
              setSelectedTagIds([])
              setPage(1)
            }}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Сбросить
          </button>
        )}
      </div>

      <div className="space-y-3 md:hidden">
        {sources.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Database className="mx-auto mb-3 size-8 text-muted-foreground" />
            <div className="font-medium">{hasActiveFilters ? 'Нет источников с выбранным фильтром' : 'Источников пока нет'}</div>
            {!hasActiveFilters && (
              <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 size-4" />
                Добавить источник
              </Button>
            )}
          </div>
        ) : (
          sources.map((source) => (
            <div
              key={source.id}
              className="cursor-pointer rounded-lg border border-border bg-card p-4 text-card-foreground transition-colors hover:bg-muted/40 active:bg-muted/60"
              onClick={() => navigate(`/sources/${source.id}`)}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className={`mt-1 size-2.5 flex-shrink-0 rounded-full ${
                      !source.isActive ? 'bg-muted-foreground/50' : source.status === 'error' ? 'bg-red-500' : 'bg-green-500'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{source.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{source.url}</div>
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {SOURCE_TYPE_LABEL[source.type]}
                </Badge>
              </div>

              <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                {!source.isActive ? (
                    <span className="text-muted-foreground">Остановлен</span>
                ) : source.status === 'error' ? (
                  <span className="text-red-600">Ошибка</span>
                ) : (
                  <span className="text-green-600">Активен</span>
                )}
                <span>Сег: {source.itemsCount24h}</span>
                <span>Нед: {source.itemsCountWeek}</span>
                <span>Всего: {source.itemsCount}</span>
                <span>Каналы: {source.linkedChannelsCount ?? 0}</span>
              </div>

              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {(source.linkedChannelsPreview ?? []).slice(0, 2).map((channel) => (
                  <Badge key={channel.id} variant="outline" className="text-xs font-normal">
                    {channel.name}
                  </Badge>
                ))}
                {(source.linkedChannelsPreview?.length ?? 0) > 2 && (
                  <span className="text-xs text-muted-foreground">+{(source.linkedChannelsPreview?.length ?? 0) - 2}</span>
                )}
                {(() => {
                  const tags = sourceService.getSourceTagsById(source.id)
                  return tags.length > 0 ? (
                    <div className="flex items-center gap-1 flex-wrap">
                      {tags.map((tag) => (
                        <TagBadge key={tag.id} name={tag.name} color={tag.color} />
                      ))}
                    </div>
                  ) : null
                })()}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden rounded-lg border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Источник</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Сегодня</TableHead>
              <TableHead className="text-right">Неделя</TableHead>
              <TableHead className="text-right">Всего</TableHead>
              <TableHead className="text-right">Каналы</TableHead>
              <TableHead>Последний сбор</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  <Database className="mx-auto mb-3 size-8 text-muted-foreground" />
                  <div className="font-medium">{hasActiveFilters ? 'Нет источников с выбранным фильтром' : 'Источников пока нет'}</div>
                  {!hasActiveFilters && (
                    <>
                      <div className="mt-1 text-sm">Добавьте первый источник для сбора контента</div>
                      <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="mr-2 size-4" />
                        Добавить источник
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              sources.map((source) => (
                <TableRow key={source.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/sources/${source.id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`size-2 flex-shrink-0 rounded-full ${
                          !source.isActive ? 'bg-muted-foreground/50' : source.status === 'error' ? 'bg-red-500' : 'bg-green-500'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">{source.name}</div>
                        <div className="max-w-[240px] truncate text-xs text-muted-foreground">{source.url}</div>
                        {(() => {
                          const tags = sourceService.getSourceTagsById(source.id)
                          return tags.length > 0 ? (
                            <div className="mt-0.5 flex items-center gap-1 flex-wrap">
                              {tags.map((tag) => (
                                <TagBadge key={tag.id} name={tag.name} color={tag.color} />
                              ))}
                            </div>
                          ) : null
                        })()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {SOURCE_TYPE_LABEL[source.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {!source.isActive ? (
                      <div className="flex items-center gap-1.5">
                        <div className="size-2 rounded-full bg-muted-foreground/50" />
                        <span className="text-sm text-muted-foreground">Остановлен</span>
                      </div>
                    ) : source.status === 'error' ? (
                      <div className="flex items-center gap-1.5">
                        <div className="size-2 rounded-full bg-red-500" />
                        <span className="text-sm text-red-600">Ошибка</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className="size-2 rounded-full bg-green-500" />
                        <span className="text-sm text-foreground">Активен</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{source.itemsCount24h}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{source.itemsCountWeek}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{source.itemsCount}</TableCell>
                  <TableCell className="text-right">
                    {(source.linkedChannelsPreview?.length ?? 0) === 0 ? (
                        <span className="text-sm text-muted-foreground">-</span>
                    ) : (
                      <div className="flex items-center gap-1 flex-wrap justify-end">
                        {(source.linkedChannelsPreview ?? []).slice(0, 2).map((channel) => (
                          <Link key={channel.id} to={`/channels/${channel.id}`} onClick={(event) => event.stopPropagation()}>
                            <Badge variant="outline" className="text-xs font-normal transition-colors hover:border-primary/40 hover:text-primary">
                              {channel.name}
                            </Badge>
                          </Link>
                        ))}
                        {(source.linkedChannelsCount ?? 0) > 2 && (
                          <span className="text-xs text-muted-foreground">+{(source.linkedChannelsCount ?? 0) - 2}</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {source.lastFetchedAt ? (
                      <span className="text-sm text-muted-foreground">
                        {new Date(source.lastFetchedAt).toLocaleString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Никогда</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={totalItems} pageSize={PAGE_SIZE} />

      <ManageTagsDialog
        open={manageTagsOpen}
        onOpenChange={setManageTagsOpen}
        teamId={currentTeamId!}
        kind="source"
        tags={teamTags}
        onChanged={() => invalidate()}
      />
    </div>
  )
}
