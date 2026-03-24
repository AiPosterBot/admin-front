import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Database,
  ExternalLink,
  Image,
  Loader2,
  Megaphone,
  PauseCircle,
  PlayCircle,
  Send,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { MediaStatusHint } from '../components/MediaStatusHint'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { useTeam } from '../context/TeamContext'
import { useAsync } from '../lib/asyncState'
import { getLimitErrorMessageByCode } from '../lib/team-limit-messages'
import { getChannelDisplayLabel, getChannelPublishModeLabel, getChannelTechnicalId, publishChannelItem } from '../services/channelService'
import { getItemDetailById } from '../services/itemService'
import { getJobById, type JobView } from '../services/jobService'

function decodeHtmlEntities(content: string) {
  if (typeof window === 'undefined') {
    return content.replace(/&nbsp;/g, ' ')
  }

  const textarea = document.createElement('textarea')
  textarea.innerHTML = content
  return textarea.value.replace(/\u00a0/g, ' ')
}

interface PublishProgressState {
  channelId: string
  channelName?: string
  jobId: string | null
  stageText: string
}

function getPublishStageText(job: JobView | null) {
  if (!job) {
    return 'Подготавливаем публикацию...'
  }

  if (job.status === 'failed' || job.status === 'timed_out' || job.status === 'canceled') {
    return 'Публикация завершилась ошибкой'
  }

  const delivery = job.delivery
  if (!delivery) {
    return job.status === 'running' ? 'Генерируем и подготавливаем пост...' : 'Ставим публикацию в очередь...'
  }

  if (delivery.outboxStatus === 'sending' || delivery.postedItemStatus === 'publishing') {
    return 'Отправляем пост в Telegram...'
  }

  if (delivery.outboxStatus === 'pending' || delivery.postedItemStatus === 'queued') {
    return 'Публикация в очереди, ждём отправку...'
  }

  if (delivery.outboxStatus === 'sent' || delivery.postedItemStatus === 'success') {
    return 'Пост опубликован'
  }

  if (delivery.outboxStatus === 'failed' || delivery.postedItemStatus === 'failed' || delivery.outboxStatus === 'unknown') {
    return 'Публикация завершилась ошибкой'
  }

  return 'Публикуем пост...'
}

function isPublishFinished(job: JobView | null) {
  if (!job) {
    return false
  }

  if (job.status === 'failed' || job.status === 'timed_out' || job.status === 'canceled') {
    return true
  }

  const delivery = job.delivery
  if (!delivery) {
    return false
  }

  return (
    delivery.outboxStatus === 'sent' ||
    delivery.outboxStatus === 'failed' ||
    delivery.outboxStatus === 'unknown' ||
    delivery.postedItemStatus === 'success' ||
    delivery.postedItemStatus === 'failed'
  )
}

export function ItemDetailPage() {
  const { itemId } = useParams<{ itemId: string }>()
  const navigate = useNavigate()
  const { currentTeamId } = useTeam()
  const [publishProgress, setPublishProgress] = useState<PublishProgressState | null>(null)

  const { state, invalidate } = useAsync(() => {
    if (!itemId || !currentTeamId) {
      return Promise.resolve(null)
    }

    return getItemDetailById(itemId, currentTeamId, { fresh: true })
  }, [itemId, currentTeamId], { pollMs: 15000 })

  const handlePublish = async (channelId: string) => {
    if (!itemId || !currentTeamId) {
      return
    }

    const target = state.status === 'success' ? state.data.publishTargets.find((entry) => entry.id === channelId) : undefined
    setPublishProgress({
      channelId,
      channelName: target?.name,
      jobId: null,
      stageText: 'Создаём задачу публикации...',
    })

    try {
      const result = await publishChannelItem(channelId, itemId)
      if (result.ok === false) {
        toast.error(result.error)
        return
      }

      const jobId = result.data.job.id
      setPublishProgress((current) => (current ? { ...current, jobId, stageText: 'Ставим публикацию в очередь...' } : current))

      while (true) {
        const job = await getJobById(jobId, currentTeamId)
        setPublishProgress((current) =>
          current
            ? {
                ...current,
                jobId,
                stageText: getPublishStageText(job),
              }
            : current,
        )

        if (isPublishFinished(job)) {
          await invalidate()

          if (job?.delivery?.outboxStatus === 'sent' || job?.delivery?.postedItemStatus === 'success') {
            toast.success('Пост опубликован')
          } else {
            toast.error(
              getLimitErrorMessageByCode(
                job?.diagnostics?.lastError?.code,
                job?.diagnostics?.lastError?.details,
                job?.delivery?.deliveryError ?? job?.error ?? 'Не удалось опубликовать пост',
              ) ?? 'Не удалось опубликовать пост',
            )
          }
          return
        }

        await new Promise((resolve) => window.setTimeout(resolve, 1500))
      }
    } finally {
      setPublishProgress(null)
    }
  }

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (state.status === 'empty' || state.status === 'error') {
    return (
      <div className="py-24 text-center">
        <p className="text-sm text-gray-500">Материал не найден или недоступен в этой команде.</p>
      </div>
    )
  }

  const detail = state.data
  const { item, source, publications, publishTargets } = detail
  const decodedContent = decodeHtmlEntities(item.content)
  const isPublishing = publishProgress !== null

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-800"
        >
          <ArrowLeft className="size-4" />
          Назад к материалам
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold leading-snug text-gray-900">{item.title}</h1>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <Database className="size-3.5" />
                <Link to={`/sources/${item.sourceId}`} className="text-blue-500 hover:underline">
                  {item.sourceName}
                </Link>
              </div>
              <span>·</span>
              <div className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                <span>{new Date(item.extractedAt).toLocaleString('ru-RU')}</span>
              </div>
              {item.url && (
                <>
                  <span>·</span>
                  <a href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline">
                    <ExternalLink className="size-3" />
                    Открыть источник
                  </a>
                </>
              )}
              {source?.type && (
                <>
                  <span>·</span>
                  <span className="capitalize">{source.type}</span>
                </>
              )}
            </div>
          </div>

          {publications.length > 0 ? <Badge>Опубликован</Badge> : <Badge variant="secondary">Не опубликован</Badge>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {item.mediaUrl && item.mediaPreviewAvailable !== false && (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <img src={item.mediaUrl} alt="" className="max-h-96 w-full object-cover" />
            </div>
          )}

          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-3 text-sm uppercase tracking-wide text-muted-foreground">Содержимое</h2>
            {!item.mediaUrl && !item.hasMedia && (
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded border border-border bg-muted">
                <Image className="size-5 text-muted-foreground" />
              </div>
            )}
            <MediaStatusHint
              hasMedia={item.hasMedia}
              mediaPreviewAvailable={item.mediaPreviewAvailable}
              mediaPreviewRestrictedReason={item.mediaPreviewRestrictedReason}
              className="mb-4"
            />
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{decodedContent}</p>
          </div>

          <div className="rounded-lg border border-border bg-card">
            <div className="border-b px-5 py-4">
              <h2 className="text-sm uppercase tracking-wide text-muted-foreground">
                Публикации
                <span className="ml-2 text-muted-foreground">{publications.length}</span>
              </h2>
            </div>

            {publications.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">Этот материал еще не был опубликован ни в один канал.</div>
            ) : (
              <div className="divide-y">
                {publications.map((publication: any) => (
                  <div
                    key={publication.id}
                    className="flex cursor-pointer items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/40"
                    onClick={() => navigate(`/posts/${publication.id}`)}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {publication.status === 'success' ? (
                        <CheckCircle className="size-4 text-green-500" />
                      ) : (
                        <XCircle className="size-4 text-red-500" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Link
                          to={`/channels/${publication.channelId}`}
                          className="text-sm font-medium text-foreground hover:text-primary"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {publication.channelName}
                        </Link>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{new Date(publication.postedAt).toLocaleString('ru-RU')}</span>
                        {publication.status !== 'success' && (
                          <Badge variant="destructive" className="ml-auto text-xs">
                            Ошибка
                          </Badge>
                        )}
                      </div>

                      {publication.mediaUrl && publication.mediaPreviewAvailable !== false && (
                        <img src={publication.mediaUrl} alt="" className="mb-2 max-h-48 w-full rounded-lg object-cover" />
                      )}
                      <MediaStatusHint
                        hasMedia={publication.hasMedia}
                        mediaPreviewAvailable={publication.mediaPreviewAvailable}
                        mediaPreviewRestrictedReason={publication.mediaPreviewRestrictedReason}
                        className="mb-2"
                      />
                      {publication.generatedContent && (
                        <p className="line-clamp-4 rounded border border-border bg-muted/40 p-3 text-sm text-muted-foreground">{publication.generatedContent}</p>
                      )}

                      {publication.llmTrace?.id && (
                        <Link
                          to={`/llm-traces/${publication.llmTrace.id}`}
                          className="mt-2 inline-block text-xs text-primary hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          Открыть LLM-трейс →
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Megaphone className="size-4 text-muted-foreground" />
              <h2 className="text-sm uppercase tracking-wide text-muted-foreground">Ручная публикация</h2>
            </div>

            {publishTargets.length === 0 ? (
              <p className="text-sm text-muted-foreground">Для этого материала нет подходящих каналов. Канал должен быть привязан к источнику.</p>
            ) : (
              <div className="space-y-3">
                {publishTargets.map((target) => {
                  const isBusy = publishProgress?.channelId === target.id
                  const isDisabled = !target.isActive || !target.botCanPost || target.alreadyPublished || Boolean(isBusy)

                  return (
                      <div key={target.id} className="rounded-lg border border-border p-3">
                      <div className="space-y-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link to={`/channels/${target.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                              {target.name}
                            </Link>
                            <Badge
                              variant={target.publishMode === 'scheduled' ? 'secondary' : target.publishMode === 'every_material' ? 'outline' : 'default'}
                              className="text-[10px]"
                            >
                              {getChannelPublishModeLabel(target.publishMode)}
                            </Badge>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {getChannelDisplayLabel(target)} · ID: {getChannelTechnicalId(target)}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            {target.alreadyPublished ? (
                              <Badge variant="secondary">Уже опубликовано</Badge>
                            ) : target.isActive ? (
                              <span className="inline-flex items-center gap-1 text-green-600">
                                <PlayCircle className="size-3.5" />
                                Активен
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-gray-500">
                                <PauseCircle className="size-3.5" />
                                Выключен
                              </span>
                            )}
                            {!target.botCanPost && <Badge variant="destructive">Бот не может писать</Badge>}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Button size="sm" disabled={isDisabled || isPublishing} onClick={() => handlePublish(target.id)} className="w-full">
                            {isBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
                            {isBusy ? 'Публикуем...' : 'Опубликовать'}
                          </Button>
                          {isBusy ? (
                            <div className="text-center text-xs text-gray-500">
                              {publishProgress?.stageText ?? 'Публикуем пост...'}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
