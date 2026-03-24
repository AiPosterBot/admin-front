import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Filter, Image, Loader2, Search } from 'lucide-react'

import { Pagination } from '../components/Pagination'
import { TagFilter } from '../components/TagFilter'
import { Badge } from '../components/ui/badge'
import { MediaStatusHint } from '../components/MediaStatusHint'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { useTeam } from '../context/TeamContext'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useTeamItems } from '../hooks/useTeamItems'
import * as sourceService from '../services/sourceService'

const PAGE_SIZE = 10

type PublishFilter = 'all' | 'published' | 'unpublished'

export function ItemsPage() {
  const { currentTeamId, currentTeam } = useTeam()
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [publishFilter, setPublishFilter] = useState<PublishFilter>('all')
  const [page, setPage] = useState(1)
  const [sourceTagFilter, setSourceTagFilter] = useState<string[]>([])
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 400)

  useEffect(() => {
    if (!currentTeamId) {
      return
    }

    void Promise.all([sourceService.primeTeamSourceTags(currentTeamId), sourceService.getTeamSources(currentTeamId)])
  }, [currentTeamId])

  const { state: itemsState } = useTeamItems({
    page,
    limit: PAGE_SIZE,
    sourceId: sourceFilter !== 'all' ? sourceFilter : undefined,
    published: publishFilter,
    sourceTagIds: sourceTagFilter,
    q: debouncedSearchQuery.trim() || undefined,
  })

  const teamSourceTags = currentTeamId ? sourceService.getTeamSourceTags(currentTeamId) : []
  const teamSources = currentTeamId ? sourceService.getTeamSourcesList(currentTeamId) : []
  const hasActiveFilters = searchQuery.length > 0 || sourceFilter !== 'all' || publishFilter !== 'all' || sourceTagFilter.length > 0

  const resetFilters = () => {
    setSearchQuery('')
    setSourceFilter('all')
    setPublishFilter('all')
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

  if (itemsState.status === 'loading' || itemsState.status === 'idle') {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (itemsState.status === 'error') {
    return <div className="rounded-lg border border-border bg-card p-6 text-sm text-destructive">{itemsState.error}</div>
  }

  const itemsResult = itemsState.data
  const items = itemsResult.data
  const totalItems = itemsResult.total
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const publishCounts = itemsResult.facets?.publishCounts ?? { all: totalItems, published: 0, unpublished: 0 }
  const publishOptions: Array<{ value: PublishFilter; label: string; count: number }> = [
    { value: 'all', label: 'Все', count: publishCounts.all },
    { value: 'published', label: 'Опубликованные', count: publishCounts.published },
    { value: 'unpublished', label: 'Не опубликованные', count: publishCounts.unpublished },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Материалы</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {currentTeam.name} · {totalItems} материалов
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <div className="flex flex-wrap items-center gap-1">
              {publishOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setPublishFilter(option.value)
                    setPage(1)
                  }}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    publishFilter === option.value
                      ? 'bg-foreground text-background shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span>{option.label}</span>
                  <span className={`ml-1 text-xs tabular-nums ${publishFilter === option.value ? 'opacity-70' : 'text-muted-foreground'}`}>
                    {option.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {hasActiveFilters && (
            <button type="button" onClick={resetFilters} className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              Сбросить
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value)
                setPage(1)
              }}
              placeholder="Поиск по заголовку или тексту..."
              className="pl-9"
            />
          </div>

          <Select
            value={sourceFilter}
            onValueChange={(value) => {
              setSourceFilter(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Все источники" />
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
            tags={teamSourceTags}
            selectedTagIds={sourceTagFilter}
            onChange={(ids) => {
              setSourceTagFilter(ids)
              setPage(1)
            }}
            label="Теги источников"
          />
        </div>
      </div>

      <div className="divide-y divide-border rounded-lg border border-border bg-card">
        {items.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <div className="mb-3 text-4xl text-muted-foreground/50">📄</div>
            <div className="font-medium">Материалы не найдены</div>
            {hasActiveFilters && (
              <button type="button" onClick={resetFilters} className="mt-2 text-sm text-primary hover:underline">
                Сбросить фильтры
              </button>
            )}
          </div>
        ) : (
          items.map((item) => {
            const publicationsCount = item.publicationsCount ?? item.publicationsPreview?.length ?? 0
            const isPublished = publicationsCount > 0
            const lastPublishedAt = item.publicationsPreview?.[0]?.postedAt ?? item.publishedAt

            return (
              <div
                key={item.id}
                className="flex cursor-pointer items-start gap-4 px-4 py-4 transition-colors hover:bg-muted/40"
                onClick={() => navigate(`/items/${item.id}`)}
              >
                {item.mediaUrl && item.mediaPreviewAvailable !== false ? (
                  <img src={item.mediaUrl} alt="" className="h-16 w-16 flex-shrink-0 rounded bg-muted object-cover" />
                ) : (
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded border border-border bg-muted">
                    <Image className="size-5 text-muted-foreground" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-start justify-between gap-3">
                    <h3 className="line-clamp-1 text-sm font-medium text-foreground">{item.title}</h3>
                    {isPublished ? (
                      <Badge variant="default" className="whitespace-nowrap text-xs">
                        Опубликован
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="whitespace-nowrap text-xs">
                        Не опубликован
                      </Badge>
                    )}
                  </div>

                  <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">{item.content}</p>
                  <MediaStatusHint
                    hasMedia={item.hasMedia}
                    mediaPreviewAvailable={item.mediaPreviewAvailable}
                    mediaPreviewRestrictedReason={item.mediaPreviewRestrictedReason}
                    className="mb-2"
                  />

                  {item.publicationsPreview && item.publicationsPreview.length > 0 && (
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      {item.publicationsPreview.map((publication) => (
                        <Link
                          key={publication.id}
                          to={`/channels/${publication.channelId}`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Badge variant="outline" className="text-xs font-normal hover:border-primary/60 hover:text-primary">
                            {publication.channelName}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Link to={`/sources/${item.sourceId}`} className="text-primary hover:underline" onClick={(event) => event.stopPropagation()}>
                      {item.sourceName}
                    </Link>
                    <span>·</span>
                    <span>{new Date(item.extractedAt).toLocaleString('ru-RU')}</span>
                    {lastPublishedAt && (
                      <>
                        <span>·</span>
                        <span>Опубликован: {new Date(item.publishedAt).toLocaleString('ru-RU')}</span>
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
