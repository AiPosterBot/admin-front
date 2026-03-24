import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Calendar, CheckCircle2, Clock, Eye, FileText, Filter, Loader2, Megaphone, Plus } from 'lucide-react'

import { AddCampaignDialog } from '../components/AddCampaignDialog'
import { Pagination } from '../components/Pagination'
import { Button } from '../components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { useTeam } from '../context/TeamContext'
import { createAdsCampaign, listTeamAdsCampaigns, listTeamAdsPosts } from '../services/adsService'
import * as channelService from '../services/channelService'
import type { AdsCampaign, AdsPost, Channel, ChannelTag } from '../types/domain'

const PAGE_SIZE = 10

type StatusFilter = 'all' | 'ready' | 'sending' | 'completed' | 'failed'

const statusConfig: Record<AdsCampaign['status'], { label: string; color: string; icon: React.ReactNode }> = {
  ready: {
    label: 'Готова',
    color: 'bg-blue-100 text-blue-700',
    icon: <Clock className="size-3.5" />,
  },
  sending: {
    label: 'Отправка',
    color: 'bg-amber-100 text-amber-700',
    icon: <Loader2 className="size-3.5" />,
  },
  completed: {
    label: 'Завершена',
    color: 'bg-green-100 text-green-700',
    icon: <CheckCircle2 className="size-3.5" />,
  },
  failed: {
    label: 'Ошибка',
    color: 'bg-red-100 text-red-700',
    icon: <Loader2 className="size-3.5" />,
  },
}

function getCampaignViews(campaign: AdsCampaign) {
  return Object.values(campaign.channelResults ?? {}).reduce((sum, result) => sum + (result.viewsCount ?? 0), 0)
}

function getPostPreview(post: AdsPost | undefined) {
  if (!post) {
    return 'Пост не найден'
  }

  const plainText = post.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return plainText || 'Медиа без текста'
}

export function AdsCampaignsPage() {
  const { currentTeam, currentTeamId } = useTeam()
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState<AdsCampaign[]>([])
  const [posts, setPosts] = useState<AdsPost[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [channelTags, setChannelTags] = useState<ChannelTag[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  useEffect(() => {
    if (!currentTeamId) {
      setCampaigns([])
      setPosts([])
      setChannels([])
      setChannelTags([])
      setIsLoading(false)
      return
    }

    let isMounted = true

    async function loadData() {
      try {
        setIsLoading(true)
        setError(null)

        const [campaignsResponse, postsResponse, teamChannels] = await Promise.all([
          listTeamAdsCampaigns(currentTeamId, { limit: 100 }),
          listTeamAdsPosts(currentTeamId, { limit: 100 }),
          channelService.getTeamChannels(currentTeamId),
        ])

        if (!isMounted) {
          return
        }

        setCampaigns(campaignsResponse.data)
        setPosts(postsResponse.data)
        setChannels(teamChannels)
        setChannelTags(channelService.getTeamChannelTags(currentTeamId))
      } catch (nextError) {
        if (isMounted) {
          setError(nextError instanceof Error ? nextError.message : 'Не удалось загрузить кампании')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      isMounted = false
    }
  }, [currentTeamId])

  const postsById = useMemo(() => new Map(posts.map((post) => [post.id, post])), [posts])
  const channelsById = useMemo(() => new Map(channels.map((channel) => [channel.id, channel])), [channels])

  const filteredCampaigns = useMemo(() => {
    if (statusFilter === 'all') {
      return campaigns
    }
    return campaigns.filter((campaign) => campaign.status === statusFilter)
  }, [campaigns, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredCampaigns.length / PAGE_SIZE))
  const pageCampaigns = filteredCampaigns.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  const filterOptions: Array<{ value: StatusFilter; label: string; count: number; icon?: React.ReactNode }> = [
    { value: 'all', label: 'Все', count: campaigns.length },
    { value: 'ready', label: 'Готовы', count: campaigns.filter((campaign) => campaign.status === 'ready').length, icon: <Clock className="size-3.5 text-blue-500" /> },
    { value: 'sending', label: 'Отправка', count: campaigns.filter((campaign) => campaign.status === 'sending').length, icon: <Loader2 className="size-3.5 text-amber-500" /> },
    { value: 'completed', label: 'Завершены', count: campaigns.filter((campaign) => campaign.status === 'completed').length, icon: <CheckCircle2 className="size-3.5 text-green-500" /> },
    { value: 'failed', label: 'Ошибки', count: campaigns.filter((campaign) => campaign.status === 'failed').length, icon: <Loader2 className="size-3.5 text-red-500" /> },
  ]

  if (!currentTeam) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">Команда не выбрана</h2>
        <p className="text-gray-600 dark:text-gray-400">Выберите команду в верхнем меню</p>
      </div>
    )
  }

  const handleCampaignCreated = (campaign: AdsCampaign) => {
    setCampaigns((current) => [campaign, ...current])
    navigate(`/ads/${campaign.id}`)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 via-white to-rose-50 p-5 shadow-sm dark:border-amber-500/30 dark:from-amber-500/15 dark:via-slate-950 dark:to-rose-500/15">
        <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Кампании</h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-300">
              {currentTeam.name} · {campaigns.length} кампаний
            </p>
            <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-300">
              Здесь вы управляете рекламными кампаниями. Вы можете создать кампанию, выбрать пост и каналы.
            </p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button variant="outline" onClick={() => navigate('/ads/posts')} className="flex-1 sm:flex-initial">
              <FileText className="mr-2 size-4" />
              Посты
              <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 tabular-nums">{posts.length}</span>
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)} className="flex-1 sm:flex-initial">
              <Plus className="mr-2 size-4" />
              Создать кампанию
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="size-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
          <div className="flex flex-wrap items-center gap-1">
            {filterOptions.map(({ value, label, count, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setStatusFilter(value)
                  setPage(1)
                }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  statusFilter === value ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-950' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100'
                }`}
              >
                {icon}
                {label}
                <span className={`text-xs tabular-nums ${statusFilter === value ? 'opacity-70' : 'text-gray-400'}`}>{count}</span>
              </button>
            ))}
          </div>
        </div>
        {statusFilter !== 'all' && (
          <button type="button" onClick={() => setStatusFilter('all')} className="text-xs text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
            Сбросить
          </button>
        )}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</div>
      ) : null}

      <div className="space-y-3 md:hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">Загрузка кампаний...</div>
        ) : pageCampaigns.length === 0 ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            <Megaphone className="mx-auto mb-3 size-8 text-gray-300 dark:text-gray-600" />
            <div className="font-medium">{campaigns.length === 0 ? 'Кампаний пока нет' : 'Нет кампаний с выбранным фильтром'}</div>
          </div>
        ) : (
          pageCampaigns.map((campaign) => {
            const status = statusConfig[campaign.status]
            const post = postsById.get(campaign.adsPostId)
    const channelNames = campaign.targetChannels.map((channelId) => channelService.getChannelDisplayLabel(channelsById.get(channelId) ?? { telegramTarget: channelId, telegramUsername: undefined }))
            const totalViews = getCampaignViews(campaign)

            return (
              <div
                key={campaign.id}
                className="cursor-pointer rounded-lg border bg-white p-4 transition-colors active:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:active:bg-gray-900"
                onClick={() => navigate(`/ads/${campaign.id}`)}
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-gray-900 dark:text-gray-100">{campaign.name}</div>
                    <div className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">{getPostPreview(post)}</div>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                    {status.icon}
                    {status.label}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>{channelNames.length} каналов</span>
                  {totalViews > 0 && (
                    <span className="flex items-center gap-1">
                      <Eye className="size-3" />
                      {totalViews.toLocaleString('ru-RU')}
                    </span>
                  )}
                  <span className="text-green-600">{campaign.sentCount} отпр.</span>
                  {campaign.failedCount > 0 && <span className="text-red-600">{campaign.failedCount} ошиб.</span>}
                  {campaign.scheduledAt && (
                    <span className="flex items-center gap-1 text-gray-400">
                      <Calendar className="size-3" />
                      {new Date(campaign.scheduledAt).toLocaleDateString('ru-RU')}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="hidden rounded-lg border bg-white dark:border-gray-800 dark:bg-gray-950 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Кампания</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Каналы</TableHead>
              <TableHead className="text-center">
                <span className="inline-flex items-center gap-1">
                  <Eye className="size-3.5" />
                  Просмотры
                </span>
              </TableHead>
              <TableHead>Запланировано</TableHead>
              <TableHead>Создана</TableHead>
              <TableHead className="text-center">Отправлено / Ошибки / Всего</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-gray-500 dark:text-gray-400">
                  Загрузка кампаний...
                </TableCell>
              </TableRow>
            ) : pageCampaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-gray-500 dark:text-gray-400">
                  <Megaphone className="mx-auto mb-3 size-8 text-gray-300 dark:text-gray-600" />
                  <div className="font-medium">{campaigns.length === 0 ? 'Кампаний пока нет' : 'Нет кампаний с выбранным фильтром'}</div>
                </TableCell>
              </TableRow>
            ) : (
              pageCampaigns.map((campaign) => {
                const status = statusConfig[campaign.status]
                const post = postsById.get(campaign.adsPostId)
    const channelNames = campaign.targetChannels.map((channelId) => channelService.getChannelDisplayLabel(channelsById.get(channelId) ?? { telegramTarget: channelId, telegramUsername: undefined }))
                const visibleChannels = channelNames.slice(0, 2)
                const hiddenCount = Math.max(0, channelNames.length - visibleChannels.length)

                return (
                  <TableRow key={campaign.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/ads/${campaign.id}`)}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{campaign.name}</div>
                        <div className="mt-0.5 max-w-[280px] truncate text-xs text-gray-400 dark:text-gray-500">{getPostPreview(post)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[220px] text-sm text-gray-600 dark:text-gray-300">
                        {visibleChannels.join(', ')}
                        {hiddenCount > 0 ? ` +${hiddenCount}` : ''}
                      </div>
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {getCampaignViews(campaign) > 0 ? getCampaignViews(campaign).toLocaleString('ru-RU') : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                      {campaign.scheduledAt ? new Date(campaign.scheduledAt).toLocaleString('ru-RU') : 'Сразу'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 dark:text-gray-400">{new Date(campaign.createdAt).toLocaleString('ru-RU')}</TableCell>
                    <TableCell className="text-center text-sm">
                      <span className="text-green-700">{campaign.sentCount}</span>
                      <span className="mx-1 text-gray-300">/</span>
                      <span className="text-red-700">{campaign.failedCount}</span>
                      <span className="mx-1 text-gray-300">/</span>
                      <span className="text-gray-500 dark:text-gray-400">{campaign.targetChannels.length}</span>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={filteredCampaigns.length} pageSize={PAGE_SIZE} />

      <AddCampaignDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        posts={posts}
        channels={channels}
        channelTags={channelTags}
        onCreated={handleCampaignCreated}
        onCreateCampaign={async (input) => {
          if (!currentTeamId) {
            throw new Error('Команда не выбрана')
          }

          const response = await createAdsCampaign(currentTeamId, input)
          return response.campaign
        }}
      />
    </div>
  )
}
