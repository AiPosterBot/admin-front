import { useMemo } from 'react'
import { Link } from 'react-router'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Clock,
  FileText,
  Plus,
  Radio,
  Rss,
  Settings,
  TrendingUp,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import { useTeam } from '../context/TeamContext'
import { useTeamChannels } from '../hooks/useTeamChannels'
import { useTeamItems } from '../hooks/useTeamItems'
import { useTeamJobs } from '../hooks/useTeamJobs'
import { useTeamMembers } from '../hooks/useTeamMembers'
import { useTeamPosts } from '../hooks/useTeamPosts'
import { useTeamSources } from '../hooks/useTeamSources'
import { useTeamPermissions } from '../lib/rbac'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { TagBadge } from '../components/TagBadge'
import { UserAvatar } from '../components/UserAvatar'
import * as channelService from '../services/channelService'
import * as sourceService from '../services/sourceService'

export function DashboardPage() {
  const { currentTeamId, currentTeam } = useTeam()
  const { currentUser } = useAuth()
  const { isOwner } = useTeamPermissions()
  const { state: membersState } = useTeamMembers()
  const postRangeFilters = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    return {
      todayFrom: startOfToday.toISOString(),
      weekFrom: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      monthFrom: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    }
  }, [])

  const { state: channelsState } = useTeamChannels({ page: 1, limit: 5 })
  const { state: sourcesState } = useTeamSources({ page: 1, limit: 5 })
  const { state: jobsState } = useTeamJobs({ page: 1, limit: 5 })
  const { state: materialsState } = useTeamItems({ page: 1, limit: 1 })
  const { state: postsTotalState } = useTeamPosts({ page: 1, limit: 1, status: 'success' })
  const { state: postsTodayState } = useTeamPosts({ page: 1, limit: 1, status: 'success', from: postRangeFilters.todayFrom })
  const { state: postsWeekState } = useTeamPosts({ page: 1, limit: 1, status: 'success', from: postRangeFilters.weekFrom })
  const { state: postsMonthState } = useTeamPosts({ page: 1, limit: 1, status: 'success', from: postRangeFilters.monthFrom })

  if (!currentTeamId || !currentTeam) {
    return (
      <div className="py-20 text-center">
        <div className="text-lg text-gray-400 dark:text-gray-500">Команда не выбрана</div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Выберите команду в верхнем меню или создайте новую.
        </p>
      </div>
    )
  }

  const channels = channelsState.status === 'success' ? channelsState.data.data : []
  const channelsTotal = channelsState.status === 'success' ? channelsState.data.total : 0
  const sources = sourcesState.status === 'success' ? sourcesState.data.data : []
  const sourcesTotal = sourcesState.status === 'success' ? sourcesState.data.total : 0
  const recentJobs = jobsState.status === 'success' ? jobsState.data.data : []
  const materialsTotal = materialsState.status === 'success' ? materialsState.data.total : 0
  const todayPosted = postsTodayState.status === 'success' ? postsTodayState.data.total : 0
  const weekPosted = postsWeekState.status === 'success' ? postsWeekState.data.total : 0
  const monthPosted = postsMonthState.status === 'success' ? postsMonthState.data.total : 0
  const postedTotal = postsTotalState.status === 'success' ? postsTotalState.data.total : 0
  const members = membersState.status === 'success' ? membersState.data.members : []

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{currentTeam.name}</h1>
          </div>
          {currentUser ? <p className="text-sm text-gray-500 dark:text-gray-400">Рабочее пространство пользователя {currentUser.displayName}</p> : null}
        </div>
        <Link to="/settings">
          <Button variant="outline" size="sm">
            <Settings className="mr-1.5 size-4" />
            Настройки
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">Каналы</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
              <Radio className="size-3.5 text-blue-500" />
            </div>
          </div>
          <div className="text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100">{channelsTotal}</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">Источники</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950">
              <Rss className="size-3.5 text-violet-500" />
            </div>
          </div>
          <div className="text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100">{sourcesTotal}</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">Материалы</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950">
              <FileText className="size-3.5 text-amber-500" />
            </div>
          </div>
          <div className="text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100">{materialsTotal}</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">Публикации</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950">
              <TrendingUp className="size-3.5 text-emerald-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {[
              { label: 'Сегодня', value: todayPosted },
              { label: 'Неделя', value: weekPosted },
              { label: 'Месяц', value: monthPosted },
              { label: 'Всего', value: postedTotal },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-lg font-bold tabular-nums text-gray-900 dark:text-gray-100">{value}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Каналы</CardTitle>
              <Link to="/channels">
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-blue-600">
                  Все каналы <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-0.5">
            {channels.length === 0 ? (
              <div className="py-6 text-center">
                <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">Каналов пока нет</p>
                <Link to="/channels">
                  <Button size="sm" variant="outline">
                    <Plus className="mr-1.5 size-3.5" />
                    Добавить канал
                  </Button>
                </Link>
              </div>
            ) : (
              channels.slice(0, 5).map((channel) => (
                <Link key={channel.id} to={`/channels/${channel.id}`}>
                  <div className="group flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`size-2 flex-shrink-0 rounded-full ${
                          channel.lastError ? 'bg-red-500' : channel.isActive ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-gray-900 transition-colors group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">
                          {channel.name}
                        </div>
                        <span
                          role={channelService.getChannelPublicUrl(channel) ? 'link' : undefined}
                          tabIndex={channelService.getChannelPublicUrl(channel) ? 0 : -1}
                          className={`block truncate text-xs ${
                            channelService.getChannelPublicUrl(channel)
                              ? 'cursor-pointer text-blue-500 hover:text-blue-600'
                              : 'text-gray-500'
                          }`}
                          onClick={(event) => {
                            const publicUrl = channelService.getChannelPublicUrl(channel)
                            if (!publicUrl) {
                              return
                            }

                            event.preventDefault()
                            event.stopPropagation()
                            window.open(publicUrl, '_blank')
                          }}
                        >
                          {channelService.getChannelDisplayLabel(channel)}
                        </span>
                        <div className="truncate text-[11px] text-gray-400">
                          ID: {channelService.getChannelTechnicalId(channel)}
                        </div>
                      </div>
                    </div>
                    <div className="ml-2 flex flex-shrink-0 items-center gap-2">
                      {channel.lastError ? <Badge variant="destructive" className="text-xs">Ошибка</Badge> : null}
                      <Badge
                        variant={channel.publishMode === 'scheduled' ? 'secondary' : channel.publishMode === 'every_material' ? 'outline' : 'default'}
                        className="text-xs"
                      >
                        {channelService.getChannelPublishModeLabel(channel.publishMode)}
                      </Badge>
                      {channel.lastPublishedAt ? (
                        <span className="text-xs tabular-nums text-gray-400 dark:text-gray-500">
                          {new Date(channel.lastPublishedAt).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      ) : null}
                      {(() => {
                        const tags = channelService.getChannelTagsById(channel.id)
                        return tags.length > 0 ? (
                          <div className="ml-2 flex flex-wrap items-center gap-1">
                            {tags.map((tag) => (
                              <TagBadge key={tag.id} name={tag.name} color={tag.color} />
                            ))}
                          </div>
                        ) : null
                      })()}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Источники</CardTitle>
              <Link to="/sources">
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-blue-600">
                  Все источники <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-0.5">
            {sources.length === 0 ? (
              <div className="py-6 text-center">
                <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">Источников пока нет</p>
                <Link to="/sources">
                  <Button size="sm" variant="outline">
                    <Plus className="mr-1.5 size-3.5" />
                    Добавить источник
                  </Button>
                </Link>
              </div>
            ) : (
              sources.slice(0, 5).map((source) => (
                <Link key={source.id} to={`/sources/${source.id}`}>
                  <div className="group flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className={`size-2 flex-shrink-0 rounded-full ${source.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-gray-900 transition-colors group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">
                          {source.name}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {source.type} · {source.itemsCount24h} за 24ч · {source.itemsCount} всего
                        </div>
                      </div>
                    </div>
                    <div className="ml-2 flex flex-shrink-0 items-center gap-2">
                      {source.lastError ? <Badge variant="destructive" className="text-xs">Ошибка</Badge> : null}
                      <Badge variant="outline" className="text-xs capitalize">
                        {source.type}
                      </Badge>
                      {(() => {
                        const tags = sourceService.getSourceTagsById(source.id)
                        return tags.length > 0 ? (
                          <div className="ml-2 flex flex-wrap items-center gap-1">
                            {tags.map((tag) => (
                              <TagBadge key={tag.id} name={tag.name} color={tag.color} />
                            ))}
                          </div>
                        ) : null
                      })()}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Последние задачи</CardTitle>
              <Link to="/jobs">
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-blue-600">
                  Все задачи <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-0.5">
            {recentJobs.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">Задач пока нет</div>
            ) : (
              recentJobs.map((job) => (
                <Link key={job.id} to={`/jobs/${job.id}`}>
                  <div className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex-shrink-0">
                      {job.status === 'success' ? <CheckCircle className="size-4 text-green-500" /> : null}
                      {job.status === 'failed' ? <AlertCircle className="size-4 text-red-500" /> : null}
                      {job.status === 'running' ? <Clock className="size-4 animate-pulse text-blue-500" /> : null}
                      {job.status === 'pending' ? <Clock className="size-4 text-gray-400 dark:text-gray-500" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-gray-900 transition-colors group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">
                          {job.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{new Date(job.createdAt).toLocaleString('ru-RU')}</div>
                    </div>
                    <Badge
                      variant={job.status === 'success' ? 'default' : job.status === 'failed' ? 'destructive' : 'secondary'}
                      className={`flex-shrink-0 text-xs ${
                        job.status === 'running' ? 'border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-900 dark:text-blue-300' : ''
                      }`}
                    >
                      {job.status === 'success'
                        ? 'OK'
                        : job.status === 'failed'
                          ? 'Ошибка'
                          : job.status === 'running'
                            ? 'В работе'
                            : 'Ожидает'}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Участники</CardTitle>
              <Link to="/members">
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-blue-600">
                  Управление <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {membersState.status === 'loading' || membersState.status === 'idle' ? (
              <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">Загрузка участников...</div>
            ) : members.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">Участников пока нет</div>
            ) : (
              members.slice(0, 5).map((member) => {
                const isMemberOwner = member.role === 'owner'

                return (
                  <div key={member.id} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                    <UserAvatar name={member.displayName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{member.displayName}</div>
                      <div className="truncate text-xs text-gray-400 dark:text-gray-500">{member.email}</div>
                    </div>
                    <Badge variant={isMemberOwner ? 'default' : 'secondary'} className="text-xs">
                      {isMemberOwner ? 'Владелец' : 'Участник'}
                    </Badge>
                  </div>
                )
              })
            )}
            {isOwner ? (
              <Link to="/members">
                <div className="flex cursor-pointer items-center gap-2 px-2.5 py-2 text-sm text-blue-600 hover:text-blue-700">
                  <Plus className="size-3.5" />
                  Пригласить участника
                </div>
              </Link>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

