import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowLeft, Bot, Calendar, ChevronDown, ChevronUp, FileText, Image as ImageIcon, Info, Megaphone, Trash2, User } from 'lucide-react'
import { toast } from 'sonner'

import { Pagination } from '../components/Pagination'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { useTeam } from '../context/TeamContext'
import { deleteAdsPost, listTeamAdsCampaigns, listTeamAdsPosts } from '../services/adsService'
import { getTelegramBotInfo } from '../services/channelService'
import type { AdsCampaign, AdsPost } from '../types/domain'

const PAGE_SIZE = 10

type UsageFilter = 'all' | 'used' | 'unused'

function toPlainText(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function AdsPostsPage() {
  const { currentTeam, currentTeamId } = useTeam()
  const navigate = useNavigate()
  const [posts, setPosts] = useState<AdsPost[]>([])
  const [campaigns, setCampaigns] = useState<AdsCampaign[]>([])
  const [botUsername, setBotUsername] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [usageFilter, setUsageFilter] = useState<UsageFilter>('all')
  const [page, setPage] = useState(1)
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentTeamId) {
      setPosts([])
      setCampaigns([])
      setBotUsername(null)
      setIsLoading(false)
      return
    }

    let isMounted = true

    async function loadData() {
      try {
        setIsLoading(true)
        setError(null)

        const [postsResponse, campaignsResponse, botInfo] = await Promise.all([
          listTeamAdsPosts(currentTeamId, { limit: 100 }),
          listTeamAdsCampaigns(currentTeamId, { limit: 100 }),
          getTelegramBotInfo(currentTeamId),
        ])

        if (!isMounted) {
          return
        }

        setPosts(postsResponse.data)
        setCampaigns(campaignsResponse.data)
        setBotUsername(botInfo.botUsername ?? null)
      } catch (nextError) {
        if (isMounted) {
          setError(nextError instanceof Error ? nextError.message : 'Не удалось загрузить рекламные посты')
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

  const filteredPosts = useMemo(() => {
    let nextPosts = [...posts]

    if (usageFilter === 'used') {
      nextPosts = nextPosts.filter((post) => post.usedInCampaigns.length > 0)
    } else if (usageFilter === 'unused') {
      nextPosts = nextPosts.filter((post) => post.usedInCampaigns.length === 0)
    }

    if (search.trim()) {
      const query = search.trim().toLowerCase()
      nextPosts = nextPosts.filter((post) => {
        const text = toPlainText(post.text).toLowerCase()
        return text.includes(query) || post.createdByName.toLowerCase().includes(query)
      })
    }

    return nextPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [posts, usageFilter, search])

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE))
  const pagePosts = filteredPosts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  const campaignsById = useMemo(() => new Map(campaigns.map((campaign) => [campaign.id, campaign])), [campaigns])
  const usedCount = posts.filter((post) => post.usedInCampaigns.length > 0).length
  const unusedCount = posts.filter((post) => post.usedInCampaigns.length === 0).length
  const botLink = botUsername ? `https://t.me/${botUsername}` : null

  if (!currentTeam) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">Команда не выбрана</h2>
        <p className="text-gray-600 dark:text-gray-400">Выберите команду в верхнем меню</p>
      </div>
    )
  }

  const handleDelete = async (postId: string) => {
    try {
      await deleteAdsPost(postId)
      setPosts((current) => current.filter((post) => post.id !== postId))
      toast.success('Пост удалён')
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : 'Не удалось удалить пост')
    }
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate('/ads')}
        className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-800"
      >
        <ArrowLeft className="size-3.5" />
        Кампании
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Рекламные посты</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {currentTeam.name} · {posts.length} постов
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 size-5 shrink-0 text-blue-600 dark:text-blue-300" />
          <div className="space-y-2">
            <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Как создать рекламный пост</div>
            <ol className="space-y-1.5 text-sm text-blue-800 dark:text-blue-200">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-bold text-blue-800 dark:bg-blue-400/20 dark:text-blue-200">1</span>
                <span>
                  Откройте бота{' '}
                  {botLink ? (
                    <a href={botLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:text-blue-600">
                      <Bot className="size-3.5" />@{botUsername}
                    </a>
                  ) : (
                    <span className="font-semibold">Telegram-бота</span>
                  )}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-bold text-blue-800 dark:bg-blue-400/20 dark:text-blue-200">2</span>
                <span>Отправьте боту сообщение с нужным текстом и одним медиа-вложением, если оно требуется.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-bold text-blue-800 dark:bg-blue-400/20 dark:text-blue-200">3</span>
                <span>
                  Ответьте на это сообщение командой <code className="rounded bg-blue-200 px-1.5 py-0.5 text-xs font-mono">/ads</code>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-bold text-blue-800 dark:bg-blue-400/20 dark:text-blue-200">4</span>
                <span>Если у вас несколько команд, бот покажет кнопки выбора. После этого пост появится на этой странице.</span>
              </li>
            </ol>
            <p className="text-xs text-blue-600 dark:text-blue-300">
              Для привязки Telegram-аккаунта перейдите в{' '}
              <button type="button" onClick={() => navigate('/profile')} className="underline underline-offset-2 hover:text-blue-800">
                Профиль
              </button>
              .
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Поиск постов..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          className="w-full sm:max-w-sm"
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setUsageFilter('all'); setPage(1) }} className={usageFilter === 'all' ? 'bg-gray-100 text-gray-900' : 'text-gray-500'}>
            Все ({posts.length})
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setUsageFilter('used'); setPage(1) }} className={usageFilter === 'used' ? 'bg-gray-100 text-gray-900' : 'text-gray-500'}>
            Используются ({usedCount})
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setUsageFilter('unused'); setPage(1) }} className={usageFilter === 'unused' ? 'bg-gray-100 text-gray-900' : 'text-gray-500'}>
            Свободны ({unusedCount})
          </Button>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</div> : null}

      {isLoading ? (
        <div className="rounded-lg border bg-white py-12 text-center text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">Загрузка рекламных постов...</div>
      ) : filteredPosts.length === 0 ? (
        <div className="rounded-lg border bg-white py-12 text-center text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
          <FileText className="mx-auto mb-3 size-8 text-gray-300 dark:text-gray-600" />
          <div className="font-medium">{posts.length === 0 ? 'Рекламных постов пока нет' : 'Ничего не найдено'}</div>
          <p className="mt-1 text-sm">Сохраните сообщение через бота и оно появится здесь.</p>
        </div>
      ) : (
        <div className="divide-y rounded-lg border bg-white dark:border-gray-800 dark:bg-gray-950 dark:divide-gray-800">
          {pagePosts.map((post) => {
            const plainText = toPlainText(post.text)
            const isExpanded = expandedPosts.has(post.id)
            const campaignCount = post.usedInCampaigns.length
            const relatedCampaigns = post.usedInCampaigns.map((campaignId) => campaignsById.get(campaignId)).filter(Boolean) as AdsCampaign[]

            return (
              <div key={post.id} className="p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900">
                <div className="flex gap-4">
                  {post.mediaUrl && <img src={post.mediaUrl} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />}

                  <div className="min-w-0 flex-1">
                    <p className={`whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 ${isExpanded ? '' : 'line-clamp-3'}`}>
                      {plainText || 'Медиа без текста'}
                    </p>

                    {isExpanded && post.mediaUrl && (
                      <img src={post.mediaUrl} alt="" className="mt-3 max-w-md rounded-lg" />
                    )}

                    {plainText.length > 150 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedPosts((current) => {
                            const next = new Set(current)
                            if (next.has(post.id)) {
                              next.delete(post.id)
                            } else {
                              next.add(post.id)
                            }
                            return next
                          })
                        }
                        className="mt-1.5 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="size-3" />
                            Свернуть
                          </>
                        ) : (
                          <>
                            <ChevronDown className="size-3" />
                            Показать полностью
                          </>
                        )}
                      </button>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                        <User className="size-3" />
                        {post.createdByName}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                        <Calendar className="size-3" />
                        {new Date(post.createdAt).toLocaleString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {post.mediaUrl && (
                        <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                          <ImageIcon className="size-3" />
                          Медиа
                        </span>
                      )}
                      {campaignCount > 0 ? (
                        <span className="flex flex-wrap items-center gap-1">
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Megaphone className="size-3" />
                            {campaignCount} камп.
                          </Badge>
                          {relatedCampaigns.map((campaign) => (
                            <button
                              key={campaign.id}
                              type="button"
                              onClick={() => navigate(`/ads/${campaign.id}`)}
                              className="text-xs text-blue-600 underline underline-offset-2 hover:text-blue-700"
                            >
                              {campaign.name}
                            </button>
                          ))}
                        </span>
                      ) : (
                        <Badge variant="outline" className="text-xs text-gray-400">
                          Не использован
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {campaignCount > 0 ? (
                      <Button variant="ghost" size="sm" disabled className="cursor-not-allowed text-gray-300" title="Нельзя удалить: пост используется в кампании">
                        <Trash2 className="size-4" />
                      </Button>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-600" title="Удалить пост">
                            <Trash2 className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить рекламный пост?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Пост будет удалён без возможности восстановления.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Назад</AlertDialogCancel>
                            <AlertDialogAction onClick={() => void handleDelete(post.id)} className="bg-red-600 hover:bg-red-700">
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={filteredPosts.length} pageSize={PAGE_SIZE} />
    </div>
  )
}
