import type { ReactNode } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { AlertCircle, CheckCircle, Filter, Loader2, Plus, Radio, Tag, XCircle } from 'lucide-react'

import { AddChannelDialog } from '../components/AddChannelDialog'
import { ManageTagsDialog } from '../components/ManageTagsDialog'
import { Pagination } from '../components/Pagination'
import { TagBadge } from '../components/TagBadge'
import { TagFilter } from '../components/TagFilter'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { useTeam } from '../context/TeamContext'
import type { Channel } from '../types/domain'
import { useTeamChannels } from '../hooks/useTeamChannels'
import * as channelService from '../services/channelService'

const PAGE_SIZE = 10

type StatusFilter = 'all' | 'active' | 'inactive' | 'error'

export function TeamChannelsPage() {
  const { currentTeam, currentTeamId } = useTeam()
  const navigate = useNavigate()
  const team = currentTeam

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [manageTagsOpen, setManageTagsOpen] = useState(false)

  const { state: channelsState, invalidate } = useTeamChannels({
    page,
    limit: PAGE_SIZE,
    status: statusFilter,
    tagIds: selectedTagIds,
  })

  const teamTags = channelService.getTeamChannelTags(currentTeamId ?? '')

  if (!team) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 text-2xl font-bold text-foreground">Команда не выбрана</h2>
        <p className="text-muted-foreground">Выберите команду в верхнем меню</p>
      </div>
    )
  }

  if (channelsState.status === 'loading' || channelsState.status === 'idle') {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (channelsState.status === 'error') {
    return <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">{channelsState.error}</div>
  }

  if (channelsState.status === 'empty') {
    return <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Каналы не найдены.</div>
  }

  const channelsResult = channelsState.data
  const channels = channelsResult.data
  const totalItems = channelsResult.total
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const statusCounts = channelsResult.facets?.statusCounts ?? { all: totalItems, active: 0, inactive: 0, error: 0 }
  const hasActiveFilters = statusFilter !== 'all' || selectedTagIds.length > 0

  const handleChannelCreated = async (data: Omit<Channel, 'id' | 'createdAt' | 'teamId'>) => {
    const result = await channelService.createChannel(currentTeamId!, {
      name: data.name,
      telegramTarget: data.telegramTarget,
      isActive: data.isActive,
    })

    if (result.ok === false) {
      toast.error(result.error)
      return
    }

    invalidate()
    toast.success(`Канал "${result.data.name}" добавлен`)
    navigate(`/channels/${result.data.id}`)
  }

  const filterOptions: Array<{ value: StatusFilter; label: string; count: number; icon?: ReactNode }> = [
    { value: 'all', label: 'Все', count: statusCounts.all },
    { value: 'active', label: 'Активные', count: statusCounts.active, icon: <CheckCircle className="size-3.5 text-green-500" /> },
    { value: 'inactive', label: 'Выключенные', count: statusCounts.inactive, icon: <XCircle className="size-3.5 text-muted-foreground" /> },
    { value: 'error', label: 'С ошибкой', count: statusCounts.error, icon: <AlertCircle className="size-3.5 text-red-500" /> },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-r from-sky-500/10 via-background to-indigo-500/10 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Каналы</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {team.name} · {totalItems} каналов
          </p>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Здесь вы управляете каналами, публикующими контент в Telegram.
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 size-4" />
          Добавить канал
        </Button>
      </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto">
          <Filter className="size-3.5 shrink-0 text-muted-foreground" />
          <div className="flex flex-wrap items-center gap-1">
            {filterOptions.map(({ value, label, count, icon }) => (
              <button
                key={value}
                onClick={() => {
                  setStatusFilter(value)
                  setPage(1)
                }}
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
          <div className="hidden h-5 w-px bg-border sm:block" />
          <TagFilter
            tags={teamTags}
            selectedTagIds={selectedTagIds}
            onChange={(ids) => {
              setSelectedTagIds(ids)
              setPage(1)
            }}
          />
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
        {channels.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Radio className="mx-auto mb-3 size-8 text-muted-foreground" />
            <div className="font-medium">{hasActiveFilters ? 'Нет каналов с выбранным фильтром' : 'Каналов пока нет'}</div>
            {!hasActiveFilters && (
              <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 size-4" />
                Добавить канал
              </Button>
            )}
          </div>
        ) : (
          channels.map((channel) => (
            <div
              key={channel.id}
              className="cursor-pointer rounded-lg border border-border bg-card p-4 text-card-foreground transition-colors hover:bg-muted/40 active:bg-muted/60"
              onClick={() => navigate(`/channels/${channel.id}`)}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className={`mt-1 size-2.5 flex-shrink-0 rounded-full ${
                      channel.lastError ? 'bg-red-500' : channel.isActive ? 'bg-green-500' : 'bg-muted-foreground/40'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{channel.name}</div>
                    {channelService.getChannelPublicUrl(channel) ? (
                      <a
                        href={channelService.getChannelPublicUrl(channel)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary transition-colors hover:text-primary/80"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {channelService.getChannelDisplayLabel(channel)}
                      </a>
                    ) : (
                      <div className="text-xs text-muted-foreground">{channelService.getChannelDisplayLabel(channel)}</div>
                    )}
                    <div className="text-[11px] text-muted-foreground/80">ID: {channelService.getChannelTechnicalId(channel)}</div>
                  </div>
                </div>
                <Badge
                  variant={channel.publishMode === 'scheduled' ? 'secondary' : channel.publishMode === 'every_material' ? 'outline' : 'default'}
                  className="shrink-0 text-xs"
                >
                  {channelService.getChannelPublishModeLabel(channel.publishMode)}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {channel.lastError ? (
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="size-3" />
                    Ошибка
                  </span>
                ) : !channel.isActive ? (
                  <span className="text-muted-foreground/80">Выключен</span>
                ) : (
                  <span className="text-green-600">Активен</span>
                )}
                <span>Источников: {channel.linkedSourcesCount}</span>
                <span>Сегодня: {channel.postsToday ?? 0}</span>
              </div>

              {(() => {
                const tags = channelService.getChannelTagsById(channel.id)
                return tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {tags.map((tag) => (
                      <TagBadge key={tag.id} name={tag.name} color={tag.color} />
                    ))}
                  </div>
                ) : null
              })()}
            </div>
          ))
        )}
      </div>

      <div className="hidden rounded-lg border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Канал</TableHead>
              <TableHead>Режим</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Источников</TableHead>
              <TableHead>Сегодня</TableHead>
              <TableHead>Последняя публикация</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  <Radio className="mx-auto mb-3 size-8 text-muted-foreground" />
                  <div className="font-medium">{hasActiveFilters ? 'Нет каналов с выбранным фильтром' : 'Каналов пока нет'}</div>
                  {!hasActiveFilters && (
                    <>
                      <div className="mt-1 text-sm">Добавьте первый канал для публикации контента</div>
                      <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="mr-2 size-4" />
                        Добавить канал
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              channels.map((channel) => (
                <TableRow key={channel.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/channels/${channel.id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`size-2 flex-shrink-0 rounded-full ${
                          channel.lastError ? 'bg-red-500' : channel.isActive ? 'bg-green-500' : 'bg-muted-foreground/40'
                        }`}
                      />
                      <div>
                        <div className="font-medium text-foreground">{channel.name}</div>
                        {channelService.getChannelPublicUrl(channel) ? (
                          <a
                            href={channelService.getChannelPublicUrl(channel)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary transition-colors hover:text-primary/80"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {channelService.getChannelDisplayLabel(channel)}
                          </a>
                        ) : (
                          <div className="text-xs text-muted-foreground">{channelService.getChannelDisplayLabel(channel)}</div>
                        )}
                        <div className="text-[11px] text-muted-foreground">ID: {channelService.getChannelTechnicalId(channel)}</div>
                        {(() => {
                          const tags = channelService.getChannelTagsById(channel.id)
                          return tags.length > 0 ? (
                            <div className="mt-0.5 flex flex-wrap items-center gap-1">
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
                    <Badge
                      variant={channel.publishMode === 'scheduled' ? 'secondary' : channel.publishMode === 'every_material' ? 'outline' : 'default'}
                      className="text-xs"
                    >
                      {channelService.getChannelPublishModeLabel(channel.publishMode)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {channel.lastError ? (
                      <div className="flex items-center gap-1.5">
                        <div className="size-2 rounded-full bg-red-500" />
                        <span className="text-sm text-red-600">Ошибка</span>
                      </div>
                    ) : !channel.isActive ? (
                      <div className="flex items-center gap-1.5">
                        <div className="size-2 rounded-full bg-muted-foreground/40" />
                        <span className="text-sm text-muted-foreground">Выключен</span>
                      </div>
                    ) : channel.botCanPost ? (
                      <div className="flex items-center gap-1.5">
                        <div className="size-2 rounded-full bg-green-500" />
                        <span className="text-sm text-foreground">Активен</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className="size-2 rounded-full bg-amber-400" />
                        <span className="text-sm text-amber-700">Бот не настроен</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-foreground">{channel.linkedSourcesCount}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-foreground">{channel.postsToday ?? 0}</span>
                  </TableCell>
                  <TableCell>
                    {channel.lastPublishedAt ? (
                      <span className="text-sm text-muted-foreground">{new Date(channel.lastPublishedAt).toLocaleString('ru-RU')}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground/80">Никогда</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={totalItems} pageSize={PAGE_SIZE} />

      <AddChannelDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} onCreated={handleChannelCreated} />

      <ManageTagsDialog
        open={manageTagsOpen}
        onOpenChange={setManageTagsOpen}
        teamId={currentTeamId!}
        kind="channel"
        tags={teamTags}
        onChanged={() => invalidate()}
      />
    </div>
  )
}
