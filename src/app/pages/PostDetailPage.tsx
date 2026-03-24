import { Link, useNavigate, useParams } from 'react-router'
import { AlertCircle, ArrowLeft, Briefcase, Calendar, CheckCircle, Cpu, Database, ExternalLink, Eye, Hash, Heart, Send } from 'lucide-react'
import { Loader2 } from 'lucide-react'

import { MediaStatusHint } from '../components/MediaStatusHint'
import { TelegramContent } from '../components/TelegramContent'
import { Badge } from '../components/ui/badge'
import { useTeam } from '../context/TeamContext'
import { useAsync } from '../lib/asyncState'
import { getPostDetailById } from '../services/postService'
import { getChannelDisplayLabel, getChannelPublicUrl } from '../services/channelService'

export function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const { currentTeamId } = useTeam()

  const { state } = useAsync(() => {
    if (!postId || !currentTeamId) {
      return Promise.resolve(null)
    }

    return getPostDetailById(postId, currentTeamId)
  }, [postId, currentTeamId])

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (state.status === 'empty' || state.status === 'error') {
    return (
      <div className="py-24 text-center">
        <p className="text-sm text-muted-foreground">Публикация не найдена или недоступна в этой команде.</p>
      </div>
    )
  }

  const detail = state.data
  const { post, channel, item, source, job, llmTrace } = detail
  const isSuccess = post.status === 'success'
  const telegramPostUrl =
    isSuccess && channel?.telegramUsername && post.telegramMessageId
      ? `https://t.me/${channel.telegramUsername}/${post.telegramMessageId}`
      : null

  return (
    <div className="max-w-3xl space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Назад
      </button>

      <div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-bold leading-snug text-foreground">Публикация в {post.channelName}</h1>
          <Badge variant={isSuccess ? 'default' : 'destructive'} className="flex-shrink-0 whitespace-nowrap">
            {isSuccess ? 'Опубликован' : 'Ошибка'}
          </Badge>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="size-3.5" />
            <span>{new Date(post.postedAt).toLocaleString('ru-RU')}</span>
          </div>
          {isSuccess && post.views !== undefined && (
            <>
              <span>·</span>
              <div className="flex items-center gap-1">
                <Eye className="size-3.5" />
                <span>{post.views.toLocaleString('ru-RU')}</span>
              </div>
            </>
          )}
          {isSuccess && post.reactions !== undefined && (
            <>
              <span>·</span>
              <div className="flex items-center gap-1">
                <Heart className="size-3.5" />
                <span>{post.reactions.toLocaleString('ru-RU')}</span>
              </div>
            </>
          )}
          {telegramPostUrl && (
            <>
              <span>·</span>
              <a href={telegramPostUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                <ExternalLink className="size-3" />
                Открыть в Telegram
              </a>
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm uppercase tracking-wide text-muted-foreground">Текст публикации</h2>
        </div>
        <div className="space-y-3 px-5 py-4">
          {post.mediaUrl && post.mediaPreviewAvailable !== false && (
            <img src={post.mediaUrl} alt="" className="max-h-80 w-full rounded-lg object-cover" />
          )}
          <MediaStatusHint
            hasMedia={post.hasMedia}
            mediaPreviewAvailable={post.mediaPreviewAvailable}
            mediaPreviewRestrictedReason={post.mediaPreviewRestrictedReason}
          />
          <div className="rounded-lg bg-muted/50 p-4">
            <TelegramContent content={post.generatedContent} format={post.generatedContentFormat} className="text-foreground" />
          </div>
        </div>
      </div>

      <div className="divide-y divide-border rounded-lg border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm uppercase tracking-wide text-muted-foreground">Связанные объекты</h2>
        </div>

        {channel && (
          <Link to={`/channels/${channel.id}`}>
            <div className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40">
              <Send className="size-4 flex-shrink-0 text-blue-500" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-foreground">{channel.name}</div>
                <div className="text-xs text-muted-foreground">
                  {getChannelDisplayLabel(channel)}
                  {getChannelPublicUrl(channel) ? '' : ' · приватный канал'}
                </div>
              </div>
              <Badge variant="outline" className="flex-shrink-0 text-xs">Канал</Badge>
            </div>
          </Link>
        )}

        {item && (
          <Link to={`/items/${item.id}`}>
            <div className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40">
              <Hash className="size-4 flex-shrink-0 text-amber-500" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-foreground">{item.title}</div>
                <div className="text-xs text-muted-foreground">Исходный материал</div>
              </div>
              <Badge variant="outline" className="flex-shrink-0 text-xs">Материал</Badge>
            </div>
          </Link>
        )}

        {source && (
          <Link to={`/sources/${source.id}`}>
            <div className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40">
              <Database className="size-4 flex-shrink-0 text-green-500" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-foreground">{source.name}</div>
                <div className="text-xs capitalize text-muted-foreground">{source.type}</div>
              </div>
              <Badge variant="outline" className="flex-shrink-0 text-xs">Источник</Badge>
            </div>
          </Link>
        )}

        {job && (
          <Link to={`/jobs/${job.id}`}>
            <div className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40">
              <Briefcase className="size-4 flex-shrink-0 text-purple-500" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-foreground">{job.type === 'publish_to_channel' ? 'Публикация в канал' : job.type.replace(/_/g, ' ')}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(job.createdAt).toLocaleString('ru-RU')}
                  {job.completedAt && <> · {Math.max(0, Math.round((new Date(job.completedAt).getTime() - new Date(job.createdAt).getTime()) / 1000))}с</>}
                </div>
              </div>
              <Badge variant="outline" className="flex-shrink-0 text-xs">Задача</Badge>
            </div>
          </Link>
        )}

        {llmTrace && (
          <Link to={`/llm-traces/${llmTrace.id}`}>
            <div className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40">
              <Cpu className="size-4 flex-shrink-0 text-indigo-500" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-foreground">{llmTrace.model}</div>
                <div className="text-xs text-muted-foreground">
                  {llmTrace.totalTokens.toLocaleString('ru-RU')} токенов · ${llmTrace.cost.toFixed(4)}
                </div>
              </div>
              <Badge variant="outline" className="flex-shrink-0 text-xs">LLM</Badge>
            </div>
          </Link>
        )}

        {telegramPostUrl && (
          <a href={telegramPostUrl} target="_blank" rel="noreferrer">
            <div className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40">
              <ExternalLink className="size-4 flex-shrink-0 text-sky-500" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-foreground">Пост в Telegram</div>
                <div className="truncate text-xs text-muted-foreground">{telegramPostUrl}</div>
              </div>
              <Badge variant="outline" className="flex-shrink-0 text-xs">Ссылка</Badge>
            </div>
          </a>
        )}
      </div>

      {!isSuccess && (post.errorText || job?.errorText) && (
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm uppercase tracking-wide text-red-500">Ошибка</h2>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertCircle className="mt-0.5 size-5 flex-shrink-0 text-red-600" />
              <div className="text-sm text-red-900">{post.errorText ?? job?.errorText}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
