import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Calendar, CheckCircle2, Clock, ExternalLink, Eye, FileText, Image as ImageIcon, Loader2, Megaphone, Send, Trash2, User, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { TelegramContent } from '../components/TelegramContent'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Progress } from '../components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { deleteAdsCampaign, getAdsCampaignDetail, sendAdsCampaignNow, subscribeToAdsCampaign, type AdsCampaignDetailView } from '../services/adsService'
import * as channelService from '../services/channelService'
import type { AdsCampaign, Channel } from '../types/domain'

const statusConfig: Record<AdsCampaign['status'], { label: string; color: string; icon: React.ReactNode }> = {
  ready: {
    label: 'Готова',
    color: 'bg-blue-100 text-blue-700',
    icon: <Clock className="size-3.5" />,
  },
  sending: {
    label: 'Отправка',
    color: 'bg-amber-100 text-amber-700',
    icon: <Loader2 className="size-3.5 animate-spin" />,
  },
  completed: {
    label: 'Завершена',
    color: 'bg-green-100 text-green-700',
    icon: <CheckCircle2 className="size-3.5" />,
  },
  failed: {
    label: 'Ошибка',
    color: 'bg-red-100 text-red-700',
    icon: <XCircle className="size-3.5" />,
  },
}

function isTerminalStatus(status: AdsCampaign['status']) {
  return status === 'completed' || status === 'failed'
}

function tgMessageLink(telegramUsername: string, messageId: number) {
  return `https://t.me/${telegramUsername}/${messageId}`
}

function renderAdsMedia(post: AdsCampaignDetailView['adsPost']) {
  if (!post.mediaUrl) {
    return null
  }

  if (post.mediaType === 'video') {
    return <video src={post.mediaUrl} controls className="w-full max-w-md rounded-lg" />
  }

  if (post.mediaType === 'document') {
    return (
      <a href={post.mediaUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-blue-600 hover:bg-blue-50">
        <FileText className="size-4" />
        Открыть документ
      </a>
    )
  }

  return <img src={post.mediaUrl} alt="Ads media" className="w-full max-w-md rounded-lg object-cover" />
}

export function AdsCampaignDetailPage() {
  const { campaignId } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<AdsCampaignDetailView | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [isSendingNow, setIsSendingNow] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sendRequested, setSendRequested] = useState(false)

  const loadDetail = useCallback(async () => {
    if (!campaignId) {
      setDetail(null)
      setChannels([])
      setIsLoading(false)
      return
    }

    try {
      setError(null)
      const nextDetail = await getAdsCampaignDetail(campaignId)
      const nextChannels = await channelService.getTeamChannels(nextDetail.campaign.teamId)
      setDetail(nextDetail)
      setChannels(nextChannels)
    } catch (nextError) {
      setSendRequested(false)
      setError(nextError instanceof Error ? nextError.message : 'Не удалось загрузить кампанию')
    } finally {
      setIsLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  useEffect(() => {
    setSendRequested(false)
  }, [campaignId])

  useEffect(() => {
    if (!campaignId || !detail || isTerminalStatus(detail.campaign.status)) {
      return
    }

    const abortController = new AbortController()
    let pollingTimer: number | undefined

    void subscribeToAdsCampaign(campaignId, {
      signal: abortController.signal,
      onSnapshot: (snapshot) => {
        setDetail(snapshot)
      },
      onProgress: ({ progress, status, sentCount, failedCount }) => {
        setDetail((current) =>
          current
            ? {
                ...current,
                campaign: {
                  ...current.campaign,
                  status,
                  sentCount,
                  failedCount,
                },
              }
            : current,
        )
      },
      onChannelResult: (result) => {
        setDetail((current) => {
          if (!current) {
            return current
          }

          const nextResults = current.results.some((entry) => entry.channelId === result.channelId)
            ? current.results.map((entry) => (entry.channelId === result.channelId ? result : entry))
            : [...current.results, result]

          return {
            ...current,
            results: nextResults,
            campaign: {
              ...current.campaign,
              targetChannels: Array.from(new Set(nextResults.map((entry) => entry.channelId))),
              channelResults: nextResults.reduce<NonNullable<AdsCampaign['channelResults']>>((acc, entry) => {
                acc[entry.channelId] = {
                  status: entry.status,
                  telegramMessageId: entry.telegramMessageId ?? undefined,
                  viewsCount: entry.viewsCount ?? undefined,
                  error: entry.errorText ?? undefined,
                  updatedAt: entry.updatedAt,
                }
                return acc
              }, {}),
            },
          }
        })
      },
      onDone: () => {
        setStreamError(null)
        void loadDetail()
      },
      onError: (nextError) => {
        setStreamError(nextError instanceof Error ? nextError.message : 'SSE недоступен, включен polling')
        pollingTimer = window.setInterval(() => {
          void loadDetail()
        }, 3000)
      },
    })

    return () => {
      abortController.abort()
      if (pollingTimer) {
        window.clearInterval(pollingTimer)
      }
    }
  }, [campaignId, detail, loadDetail])

  const campaign = detail?.campaign ?? null
  const post = detail?.adsPost ?? null
  const status = campaign ? statusConfig[campaign.status] : null
  const showReadyActions = campaign?.status === 'ready' && !sendRequested
  const totalChannels = campaign?.targetChannels.length ?? 0
  const totalViews = useMemo(
    () => Object.values(campaign?.channelResults ?? {}).reduce((sum, result) => sum + (result.viewsCount ?? 0), 0),
    [campaign?.channelResults],
  )
  const progressValue = useMemo(() => {
    if (!campaign || totalChannels === 0) {
      return 0
    }
    return Math.round(((campaign.sentCount + campaign.failedCount) / totalChannels) * 100)
  }, [campaign, totalChannels])

  const targetChannels = useMemo(() => {
    if (!campaign) {
      return []
    }

    const channelsById = new Map(channels.map((channel) => [channel.id, channel]))
    return campaign.targetChannels.map((channelId) => channelsById.get(channelId)).filter(Boolean) as Channel[]
  }, [campaign, channels])

  useEffect(() => {
    if (campaign?.status && campaign.status !== 'ready') {
      setSendRequested(false)
    }
  }, [campaign?.status])

  if (isLoading) {
    return <div className="py-12 text-center text-gray-500">Загрузка кампании...</div>
  }

  if (error || !campaign || !post || !status) {
    return (
      <div className="py-12 text-center">
        <Megaphone className="mx-auto mb-3 size-10 text-gray-300" />
        <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">Кампания не найдена</h2>
        <p className="mb-4 text-gray-600 dark:text-gray-400">{error ?? 'Кампания с таким идентификатором недоступна.'}</p>
        <Button variant="outline" onClick={() => navigate('/ads')}>
          <ArrowLeft className="mr-2 size-4" />
          Назад к кампаниям
        </Button>
      </div>
    )
  }

  const handleSendNow = async () => {
    if (!campaignId) {
      return
    }

    try {
      setIsSendingNow(true)
      setSendRequested(true)
      await sendAdsCampaignNow(campaignId)
      toast.success('Кампания поставлена в очередь на отправку')
      await loadDetail()
    } catch (nextError) {
      setSendRequested(false)
      toast.error(nextError instanceof Error ? nextError.message : 'Не удалось отправить кампанию')
    } finally {
      setIsSendingNow(false)
    }
  }

  const handleDeleteCampaign = async () => {
    if (!campaignId) {
      return
    }

    try {
      setIsDeleting(true)
      await deleteAdsCampaign(campaignId)
      toast.success('Кампания удалена')
      navigate('/ads')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : 'Не удалось удалить кампанию')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <button type="button" onClick={() => navigate('/ads')} className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-800">
        <ArrowLeft className="size-3.5" />
        Кампании
      </button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{campaign.name}</h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
              {status.icon}
              {status.label}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Создана {new Date(campaign.createdAt).toLocaleString('ru-RU')}
            {campaign.scheduledAt ? ` · Запланирована на ${new Date(campaign.scheduledAt).toLocaleString('ru-RU')}` : ''}
          </p>
        </div>

        {showReadyActions && (
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50 sm:flex-initial" disabled={isDeleting || isSendingNow}>
                  <Trash2 className="mr-2 size-4" />
                  Удалить
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить кампанию?</AlertDialogTitle>
                  <AlertDialogDescription>Кампания «{campaign.name}» будет удалена без возможности восстановления.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Назад</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handleDeleteCampaign()} className="bg-red-600 hover:bg-red-700">
                    Удалить кампанию
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={() => void handleSendNow()} disabled={isSendingNow} className="flex-1 sm:flex-initial">
              <Send className="mr-2 size-4" />
              {isSendingNow ? 'Отправка...' : 'Отправить сейчас'}
            </Button>
          </div>
        )}
      </div>

      {streamError ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">{streamError}</div> : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-lg border bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
          <div className="mb-1 text-sm text-gray-500 dark:text-gray-400">Каналов</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalChannels}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
          <div className="mb-1 text-sm text-gray-500 dark:text-gray-400">Просмотры</div>
          <div className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            <Eye className="size-5 text-gray-400 dark:text-gray-500" />
            {totalViews > 0 ? totalViews.toLocaleString('ru-RU') : '—'}
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
          <div className="mb-1 text-sm text-gray-500 dark:text-gray-400">Отправлено</div>
          <div className="text-2xl font-bold text-green-700">{campaign.sentCount}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
          <div className="mb-1 text-sm text-gray-500 dark:text-gray-400">Ошибки</div>
          <div className="text-2xl font-bold text-red-700">{campaign.failedCount}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
          <div className="mb-1 text-sm text-gray-500 dark:text-gray-400">Прогресс</div>
          <div className="text-2xl font-bold text-blue-700">{progressValue}%</div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Ход кампании</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {campaign.sentCount + campaign.failedCount} / {totalChannels}
          </span>
        </div>
        <Progress value={progressValue} className="h-2" />
      </div>

      <div className="rounded-lg border bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Рекламный пост</h2>
          <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
            <User className="size-3" />
            {post.createdByName} · {new Date(post.createdAt).toLocaleDateString('ru-RU')}
          </span>
        </div>
        <div className="space-y-4 p-5">
          {renderAdsMedia(post) ?? (
            <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
              <ImageIcon className="size-4" />
              Без медиа
            </div>
          )}

          <TelegramContent content={post.text} format={post.contentFormat} emptyText="Без текста" />
        </div>
      </div>

      <div className="rounded-lg border bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Целевые каналы ({targetChannels.length})</h2>
        </div>

        <div className="md:hidden divide-y">
          {targetChannels.map((channel) => {
            const result = detail.results.find((entry) => entry.channelId === channel.id)
            const isSent = result?.status === 'sent'
            const isFailed = result?.status === 'failed'

            return (
              <div key={channel.id} className="px-4 py-3">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <Link to={`/channels/${channel.id}`} className="truncate text-sm font-medium text-blue-600 hover:text-blue-700">
                    {channel.name}
                  </Link>
                  {isSent ? (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="size-3" />
                      Отправлено
                    </span>
                  ) : isFailed ? (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-red-600">
                      <XCircle className="size-3" />
                      Ошибка
                    </span>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      Ожидание
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                  {channelService.getChannelPublicUrl(channel) ? (
                    <a href={channelService.getChannelPublicUrl(channel)!} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                      {channelService.getChannelDisplayLabel(channel)}
                    </a>
                  ) : (
                    <span>{channelService.getChannelDisplayLabel(channel)}</span>
                  )}
                  {isSent && result?.viewsCount ? (
                    <span className="flex items-center gap-0.5">
                      <Eye className="size-3" />
                      {result.viewsCount.toLocaleString('ru-RU')}
                    </span>
                  ) : null}
                  {isSent && result?.telegramMessageId && channel.telegramUsername ? (
                    <a href={tgMessageLink(channel.telegramUsername, result.telegramMessageId)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-blue-500">
                      <ExternalLink className="size-3" />
                      TG
                    </a>
                  ) : null}
                </div>
                {isFailed && result?.errorText ? <div className="mt-2 text-xs text-red-600">{result.errorText}</div> : null}
              </div>
            )
          })}
        </div>

        <Table className="hidden md:table">
          <TableHeader>
            <TableRow>
              <TableHead>Канал</TableHead>
              <TableHead>Telegram</TableHead>
              <TableHead className="text-center">
                <span className="inline-flex items-center gap-1">
                  <Eye className="size-3.5" />
                  Просмотры
                </span>
              </TableHead>
              <TableHead>Статус отправки</TableHead>
              <TableHead>Ссылка на пост</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {targetChannels.map((channel) => {
              const result = detail.results.find((entry) => entry.channelId === channel.id)
              const isSent = result?.status === 'sent'
              const isFailed = result?.status === 'failed'

              return (
                <TableRow key={channel.id}>
                  <TableCell>
                    <Link to={`/channels/${channel.id}`} className="font-medium text-blue-600 hover:text-blue-700">
                      {channel.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {channelService.getChannelPublicUrl(channel) ? (
                      <a href={channelService.getChannelPublicUrl(channel)!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600">
                        {channelService.getChannelDisplayLabel(channel)}
                        <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400">{channelService.getChannelDisplayLabel(channel)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {isSent && result?.viewsCount ? result.viewsCount.toLocaleString('ru-RU') : '—'}
                  </TableCell>
                  <TableCell>
                    {isSent ? (
                      <div className="flex items-center gap-1.5 text-green-600">
                        <CheckCircle2 className="size-4" />
                        <span className="text-sm">Отправлено</span>
                      </div>
                    ) : isFailed ? (
                      <div className="flex items-center gap-1.5 text-red-600">
                        <XCircle className="size-4" />
                        <span className="text-sm" title={result?.errorText ?? undefined}>
                          {result?.errorText || 'Ошибка'}
                        </span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Ожидание
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {isSent && result?.telegramMessageId && channel.telegramUsername ? (
                      <a href={tgMessageLink(channel.telegramUsername, result.telegramMessageId)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                        Открыть
                        <ExternalLink className="size-3.5" />
                      </a>
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
