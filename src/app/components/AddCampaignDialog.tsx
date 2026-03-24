import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Calendar, CheckCircle, FileText, Image as ImageIcon, Megaphone, User } from 'lucide-react'
import { toast } from 'sonner'

import { TagBadge } from './TagBadge'
import { TagFilter } from './TagFilter'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import type { AdsCampaign, AdsPost, Channel, ChannelTag } from '../types/domain'
import * as channelService from '../services/channelService'

type Step = 'name' | 'post' | 'channels' | 'schedule'

const STEPS: Step[] = ['name', 'post', 'channels', 'schedule']
const STEP_LABELS: Record<Step, string> = {
  name: 'Название',
  post: 'Пост',
  channels: 'Каналы',
  schedule: 'Расписание',
}

const POSTS_PER_PAGE = 4
const CHANNELS_PER_PAGE = 8

interface AddCampaignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  posts: AdsPost[]
  channels: Channel[]
  channelTags: ChannelTag[]
  onCreated: (campaign: AdsCampaign) => void
  onCreateCampaign: (input: { name: string; adsPostId: string; targetChannels: string[]; scheduledAt?: string }) => Promise<AdsCampaign>
}

function toPlainText(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function AddCampaignDialog({
  open,
  onOpenChange,
  posts,
  channels,
  channelTags,
  onCreated,
  onCreateCampaign,
}: AddCampaignDialogProps) {
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [scheduleMode, setScheduleMode] = useState<'now' | 'scheduled'>('now')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('10:00')
  const [postPage, setPostPage] = useState(1)
  const [channelPage, setChannelPage] = useState(1)
  const [channelTagFilter, setChannelTagFilter] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currentStepIndex = STEPS.indexOf(step)

  const sortedPosts = useMemo(
    () => [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [posts],
  )

  const activeChannels = useMemo(
    () => channels.filter((channel) => channel.isActive && channel.botCanPost),
    [channels],
  )

  const filteredChannels = useMemo(() => {
    if (channelTagFilter.length === 0) {
      return activeChannels
    }

    return activeChannels.filter((channel) => {
      const tags = channelService.getChannelTagsById(channel.id)
      return tags.some((tag) => channelTagFilter.includes(tag.id))
    })
  }, [activeChannels, channelTagFilter])

  const totalPostPages = Math.max(1, Math.ceil(sortedPosts.length / POSTS_PER_PAGE))
  const paginatedPosts = sortedPosts.slice((postPage - 1) * POSTS_PER_PAGE, postPage * POSTS_PER_PAGE)

  const totalChannelPages = Math.max(1, Math.ceil(filteredChannels.length / CHANNELS_PER_PAGE))
  const paginatedChannels = filteredChannels.slice((channelPage - 1) * CHANNELS_PER_PAGE, channelPage * CHANNELS_PER_PAGE)

  const selectedPost = sortedPosts.find((post) => post.id === selectedPostId) ?? null

  const reset = () => {
    setStep('name')
    setName('')
    setSelectedPostId(null)
    setSelectedChannels([])
    setScheduleMode('now')
    setScheduleDate('')
    setScheduleTime('10:00')
    setPostPage(1)
    setChannelPage(1)
    setChannelTagFilter([])
    setIsSubmitting(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      window.setTimeout(reset, 150)
    }
  }

  const canGoNext = () => {
    switch (step) {
      case 'name':
        return name.trim().length > 0
      case 'post':
        return Boolean(selectedPostId)
      case 'channels':
        return selectedChannels.length > 0
      case 'schedule':
        return scheduleMode === 'now' || Boolean(scheduleDate && scheduleTime)
      default:
        return false
    }
  }

  const handleCreate = async () => {
    if (!selectedPostId || isSubmitting) {
      return
    }

    try {
      setIsSubmitting(true)
      const scheduledAt =
        scheduleMode === 'scheduled' && scheduleDate && scheduleTime
          ? new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString()
          : undefined

      const campaign = await onCreateCampaign({
        name: name.trim(),
        adsPostId: selectedPostId,
        targetChannels: selectedChannels,
        scheduledAt,
      })

      toast.success(`Кампания «${campaign.name}» создана`)
      onCreated(campaign)
      handleOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать кампанию')
      setIsSubmitting(false)
    }
  }

  const toggleChannel = (channelId: string) => {
    setSelectedChannels((current) =>
      current.includes(channelId) ? current.filter((id) => id !== channelId) : [...current, channelId],
    )
  }

  const toggleAllChannels = () => {
    const filteredIds = filteredChannels.map((channel) => channel.id)
    const allSelected = filteredIds.every((channelId) => selectedChannels.includes(channelId))
    if (allSelected) {
      setSelectedChannels((current) => current.filter((channelId) => !filteredIds.includes(channelId)))
      return
    }

    setSelectedChannels((current) => Array.from(new Set([...current, ...filteredIds])))
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[580px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="size-5 text-blue-600" />
            {step === 'name' && 'Новая кампания'}
            {step === 'post' && 'Выбор поста'}
            {step === 'channels' && 'Выбор каналов'}
            {step === 'schedule' && 'Расписание отправки'}
          </DialogTitle>
          <DialogDescription>
            {step === 'name' && 'Введите внутреннее название рекламной кампании'}
            {step === 'post' && 'Выберите рекламный пост, который нужно отправить'}
            {step === 'channels' && 'Выберите каналы, куда пойдёт кампания'}
            {step === 'schedule' && 'Можно отправить сразу или запланировать на конкретное время'}
          </DialogDescription>
        </DialogHeader>

        <div className="mb-2 flex flex-wrap items-center gap-2">
          {STEPS.map((item, index) => (
            <div key={item} className="flex items-center gap-2">
              <div
                className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                  item === step
                    ? 'bg-primary text-primary-foreground'
                    : index < currentStepIndex
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {index < currentStepIndex ? <CheckCircle className="size-3.5" /> : index + 1}
              </div>
              {index < STEPS.length - 1 && (
                <div className={`h-0.5 w-5 ${index < currentStepIndex ? 'bg-green-500' : 'bg-border'}`} />
              )}
            </div>
          ))}
          <span className="ml-2 text-xs text-muted-foreground">{STEP_LABELS[step]}</span>
        </div>

        {step === 'name' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Название кампании</Label>
              <Input
                id="campaign-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Например: Весенний запуск"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">Это название видно только внутри админки.</p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Отмена
              </Button>
              <Button onClick={() => setStep('post')} disabled={!canGoNext()}>
                Далее <ArrowRight className="ml-1.5 size-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'post' && (
          <div className="space-y-4">
            {sortedPosts.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <FileText className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                <div className="font-medium">Нет доступных рекламных постов</div>
                <p className="mt-1 text-sm">Сначала сохраните пост через Telegram-бота командой `/ads`.</p>
              </div>
            ) : (
              <>
                <div className="max-h-[320px] overflow-y-auto rounded-lg border border-border divide-y divide-border">
                  {paginatedPosts.map((post) => {
                    const preview = toPlainText(post.text)
                    const isSelected = selectedPostId === post.id
                    return (
                      <label
                        key={post.id}
                        className={`flex cursor-pointer gap-3 p-3 transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/60'}`}
                      >
                        <input
                          type="radio"
                          name="ads-post"
                          checked={isSelected}
                          onChange={() => setSelectedPostId(post.id)}
                          className="mt-1 shrink-0 accent-blue-600"
                        />
                        {post.mediaUrl && (
                          <img src={post.mediaUrl} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm text-foreground">{preview || 'Медиа без текста'}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="size-3" />
                              {post.createdByName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(post.createdAt).toLocaleDateString('ru-RU', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                            {post.mediaUrl && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <ImageIcon className="size-3" />
                                Медиа
                              </span>
                            )}
                            {post.usedInCampaigns.length > 0 && (
                              <Badge variant="secondary" className="py-0 text-xs">
                                {post.usedInCampaigns.length} камп.
                              </Badge>
                            )}
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>

                {totalPostPages > 1 && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {sortedPosts.length} постов · стр. {postPage} из {totalPostPages}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setPostPage((current) => Math.max(1, current - 1))}
                        disabled={postPage === 1}
                        className="rounded px-2 py-1 hover:bg-muted disabled:opacity-30"
                      >
                        &larr;
                      </button>
                      <button
                        type="button"
                        onClick={() => setPostPage((current) => Math.min(totalPostPages, current + 1))}
                        disabled={postPage === totalPostPages}
                        className="rounded px-2 py-1 hover:bg-muted disabled:opacity-30"
                      >
                        &rarr;
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep('name')}>
                <ArrowLeft className="mr-1.5 size-4" />
                Назад
              </Button>
              <Button onClick={() => setStep('channels')} disabled={!canGoNext()}>
                Далее <ArrowRight className="ml-1.5 size-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'channels' && (
          <div className="space-y-4">
            {activeChannels.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Megaphone className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                <div className="font-medium">Нет доступных каналов</div>
                <p className="mt-1 text-sm">Нужны активные каналы, куда бот может публиковать сообщения.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <TagFilter
                    tags={channelTags}
                    selectedTagIds={channelTagFilter}
                    onChange={(tagIds) => {
                      setChannelTagFilter(tagIds)
                      setChannelPage(1)
                    }}
                    label="Теги каналов"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={toggleAllChannels}>
                    {filteredChannels.every((channel) => selectedChannels.includes(channel.id)) ? 'Снять все' : 'Выбрать все'}
                  </Button>
                </div>

                {channelTagFilter.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {channelTags
                      .filter((tag) => channelTagFilter.includes(tag.id))
                      .map((tag) => (
                        <TagBadge
                          key={tag.id}
                          name={tag.name}
                          color={tag.color}
                          onRemove={() => setChannelTagFilter((current) => current.filter((id) => id !== tag.id))}
                        />
                      ))}
                  </div>
                )}

                <div className="max-h-[320px] overflow-y-auto rounded-lg border border-border divide-y divide-border">
                  {paginatedChannels.map((channel) => {
                    const checked = selectedChannels.includes(channel.id)
                    const tags = channelService.getChannelTagsById(channel.id)
                    return (
                      <label key={channel.id} className="flex cursor-pointer items-start gap-3 p-3 transition-colors hover:bg-muted/60">
                        <Checkbox checked={checked} onCheckedChange={() => toggleChannel(channel.id)} className="mt-1" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground">{channel.name}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">{channelService.getChannelDisplayLabel(channel)}</div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {tags.map((tag) => (
                              <TagBadge key={tag.id} name={tag.name} color={tag.color} />
                            ))}
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>

                {totalChannelPages > 1 && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {filteredChannels.length} каналов · стр. {channelPage} из {totalChannelPages}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setChannelPage((current) => Math.max(1, current - 1))}
                        disabled={channelPage === 1}
                        className="rounded px-2 py-1 hover:bg-muted disabled:opacity-30"
                      >
                        &larr;
                      </button>
                      <button
                        type="button"
                        onClick={() => setChannelPage((current) => Math.min(totalChannelPages, current + 1))}
                        disabled={channelPage === totalChannelPages}
                        className="rounded px-2 py-1 hover:bg-muted disabled:opacity-30"
                      >
                        &rarr;
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep('post')}>
                <ArrowLeft className="mr-1.5 size-4" />
                Назад
              </Button>
              <Button onClick={() => setStep('schedule')} disabled={!canGoNext()}>
                Далее <ArrowRight className="ml-1.5 size-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'schedule' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-sm font-medium text-foreground">Сводка</div>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <div>
                  <span className="text-muted-foreground">Название:</span> {name}
                </div>
                <div>
                  <span className="text-muted-foreground">Пост:</span> {selectedPost ? toPlainText(selectedPost.text) || 'Медиа без текста' : 'Не выбран'}
                </div>
                <div>
                  <span className="text-muted-foreground">Каналы:</span> {selectedChannels.length}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Когда отправлять</Label>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleMode('now')}
                  className={`rounded-lg border border-border p-3 text-left transition-colors ${
                    scheduleMode === 'now' ? 'border-primary/50 bg-primary/10' : 'hover:bg-muted/60'
                  }`}
                >
                  <div className="font-medium text-foreground">Сразу после создания</div>
                  <div className="text-sm text-muted-foreground">Кампания уйдёт в очередь немедленно.</div>
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleMode('scheduled')}
                  className={`rounded-lg border border-border p-3 text-left transition-colors ${
                    scheduleMode === 'scheduled' ? 'border-primary/50 bg-primary/10' : 'hover:bg-muted/60'
                  }`}
                >
                  <div className="font-medium text-foreground">Запланировать</div>
                  <div className="text-sm text-muted-foreground">Укажите дату и время запуска кампании.</div>
                </button>
              </div>
            </div>

            {scheduleMode === 'scheduled' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ads-schedule-date">Дата</Label>
                  <Input id="ads-schedule-date" type="date" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ads-schedule-time">Время</Label>
                  <Input id="ads-schedule-time" type="time" value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)} />
                </div>
              </div>
            )}

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <div className="flex items-start gap-2">
                <Calendar className="mt-0.5 size-4 shrink-0" />
                <span>Время трактуется в часовом поясе, который указан в вашем профиле.</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep('channels')}>
                <ArrowLeft className="mr-1.5 size-4" />
                Назад
              </Button>
              <Button onClick={() => void handleCreate()} disabled={!canGoNext() || isSubmitting}>
                {isSubmitting ? 'Создание...' : 'Создать кампанию'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
