import { Link } from "react-router";
import {
  Settings, Radio, Rss, FileText, TrendingUp,
  ArrowRight, Plus, CheckCircle, AlertCircle, Clock,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { UserAvatar } from "../components/UserAvatar";
import { getCurrentUser, isTeamOwner } from "../data/mock-data";
import { useTeam } from "../context/TeamContext";
import { TagBadge } from "../components/TagBadge";
import * as channelService from "../services/channelService";
import * as sourceService from "../services/sourceService";
import * as jobService from "../services/jobService";
import * as memberService from "../services/memberService";
import * as postService from "../services/postService";
import * as itemService from "../services/itemService";
import * as teamService from "../services/teamService";

export function DashboardPage() {
  const { currentTeamId } = useTeam();
  const currentUser = getCurrentUser();

  const team = teamService.getTeamById(currentTeamId);

  if (!team) {
    return (
      <div className="text-center py-20">
        <div className="text-gray-400 dark:text-gray-500 text-lg">Команда не выбрана</div>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
          Выберите команду в верхнем меню или создайте новую
        </p>
      </div>
    );
  }

  // Данные текущей команды
  const channels = channelService.getTeamChannelsList(currentTeamId!);
  const sources  = sourceService.getTeamSourcesList(currentTeamId!);
  const jobs     = jobService.getTeamJobsList(currentTeamId!);
  const members  = memberService.getTeamMembersList(currentTeamId!);
  const postedItems = postService.getTeamPostsList(currentTeamId!);
  const materials   = itemService.getTeamItemsList(currentTeamId!);

  const activeChannels  = channels.filter(c => c.isActive).length;
  const errorChannels   = channels.filter(c => !!c.lastError).length;
  const okSources       = sources.filter(s => s.status === "ok").length;
  const errorSources    = sources.filter(s => s.status === "error").length;

  const recentJobs = [...jobs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Публикации — только успешные
  const today    = new Date("2026-02-25");
  const weekAgo  = new Date(today.getTime() - 7  * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const successItems = postedItems.filter(p => p.status === "success");
  const todayPosted  = successItems.filter(p => new Date(p.postedAt).toDateString() === today.toDateString()).length;
  const weekPosted   = successItems.filter(p => new Date(p.postedAt) >= weekAgo).length;
  const monthPosted  = successItems.filter(p => new Date(p.postedAt) >= monthAgo).length;
  const totalPosted  = successItems.length;

  return (
    <div className="space-y-6 max-w-7xl">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{team.name}</h1>
          </div>
        </div>
        <Link to="/settings">
          <Button variant="outline" size="sm">
            <Settings className="size-4 mr-1.5" />
            Настройки
          </Button>
        </Link>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

        {/* Channels */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">Каналы</span>
            <div className="size-7 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
              <Radio className="size-3.5 text-blue-500" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{channels.length}</div>
        </div>

        {/* Sources */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">Источники</span>
            <div className="size-7 rounded-lg bg-violet-50 dark:bg-violet-950 flex items-center justify-center">
              <Rss className="size-3.5 text-violet-500" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{sources.length}</div>
        </div>

        {/* Materials */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">Материалы</span>
            <div className="size-7 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
              <FileText className="size-3.5 text-amber-500" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{materials.length}</div>
        </div>

        {/* Publications */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">Публикации</span>
            <div className="size-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
              <TrendingUp className="size-3.5 text-emerald-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {[
              { label: "Сегодня", value: todayPosted },
              { label: "Неделя",  value: weekPosted  },
              { label: "Месяц",   value: monthPosted  },
              { label: "Всего",   value: totalPosted  },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">{value}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Channels list */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Каналы</CardTitle>
              <Link to="/channels">
                <Button variant="ghost" size="sm" className="text-blue-600 h-7 text-xs gap-1">
                  Все каналы <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-0.5">
            {channels.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Каналов пока нет</p>
                <Link to="/channels">
                  <Button size="sm" variant="outline">
                    <Plus className="size-3.5 mr-1.5" />
                    Добавить канал
                  </Button>
                </Link>
              </div>
            ) : (
              channels.slice(0, 5).map((channel) => (
                <Link key={channel.id} to={`/channels/${channel.id}`}>
                  <div className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`size-2 rounded-full flex-shrink-0 ${
                          channel.lastError
                            ? "bg-red-500"
                            : channel.isActive
                            ? "bg-green-500"
                            : "bg-gray-300"
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {channel.name}
                        </div>
                        <span
                          role="link"
                          tabIndex={0}
                          className="text-xs text-blue-500 hover:text-blue-600 truncate block cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.open(`https://t.me/${channel.telegramId.replace("@", "")}`, "_blank");
                          }}
                        >
                          {channel.telegramId}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {channel.lastError && (
                        <Badge variant="destructive" className="text-xs">Ошибка</Badge>
                      )}
                      <Badge
                        variant={channel.publishMode === "instant" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {channel.publishMode === "instant" ? "instant" : "sched"}
                      </Badge>
                      {channel.lastPublishedAt && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                          {new Date(channel.lastPublishedAt).toLocaleTimeString("ru-RU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                      {(() => {
                        const tags = channelService.getChannelTagsById(channel.id);
                        return tags.length > 0 ? (
                          <div className="flex items-center gap-1 flex-wrap ml-2">
                            {tags.map(t => (
                              <TagBadge key={t.id} name={t.name} color={t.color} />
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Sources list */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Ис��очники</CardTitle>
              <Link to="/sources">
                <Button variant="ghost" size="sm" className="text-blue-600 h-7 text-xs gap-1">
                  Все источники <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-0.5">
            {sources.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Источников пока нет</p>
                <Link to="/sources">
                  <Button size="sm" variant="outline">
                    <Plus className="size-3.5 mr-1.5" />
                    Добавить источник
                  </Button>
                </Link>
              </div>
            ) : (
              sources.slice(0, 5).map((source) => (
                <Link key={source.id} to={`/sources/${source.id}`}>
                  <div className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`size-2 rounded-full flex-shrink-0 ${
                          source.status === "ok" ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {source.name}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {source.type} · {source.itemsCount24h} сег. · {source.itemsCount} всего
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {source.lastError && (
                        <Badge variant="destructive" className="text-xs">Ошибка</Badge>
                      )}
                      <Badge variant="outline" className="text-xs capitalize">
                        {source.type}
                      </Badge>
                      {(() => {
                        const tags = sourceService.getSourceTagsById(source.id);
                        return tags.length > 0 ? (
                          <div className="flex items-center gap-1 flex-wrap ml-2">
                            {tags.map(t => (
                              <TagBadge key={t.id} name={t.name} color={t.color} />
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent jobs */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Последние задачи</CardTitle>
              <Link to="/jobs">
                <Button variant="ghost" size="sm" className="text-blue-600 h-7 text-xs gap-1">
                  Все задачи <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-0.5">
            {recentJobs.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
                Задач пока нет
              </div>
            ) : (
              recentJobs.map((job) => (
                <Link key={job.id} to={`/jobs/${job.id}`}>
                  <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                    <div className="flex-shrink-0">
                      {job.status === "success" && <CheckCircle className="size-4 text-green-500" />}
                      {job.status === "failed"  && <AlertCircle className="size-4 text-red-500" />}
                      {job.status === "running" && <Clock className="size-4 text-blue-500 animate-pulse" />}
                      {job.status === "pending" && <Clock className="size-4 text-gray-400 dark:text-gray-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {job.type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(job.createdAt).toLocaleString("ru-RU")}
                      </div>
                    </div>
                    <Badge
                      variant={
                        job.status === "success"
                          ? "default"
                          : job.status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                      className={`text-xs flex-shrink-0 ${job.status === "running" ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" : ""}`}
                    >
                      {job.status === "success"
                        ? "OK"
                        : job.status === "failed"
                        ? "Ошибка"
                        : job.status === "running"
                        ? "В работе"
                        : "Ожидает"}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Участники</CardTitle>
              <Link to="/members">
                <Button variant="ghost" size="sm" className="text-blue-600 h-7 text-xs gap-1">
                  Управление <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {members.slice(0, 5).map((member) => {
              const isMemberOwner = member.role === 'owner';
              return (
                <div key={member.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <UserAvatar name={member.userName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{member.userName}</div>
                  </div>
                  <Badge variant={isMemberOwner ? "default" : "secondary"} className="text-xs">
                    {isMemberOwner ? "Владелец" : "Участник"}
                  </Badge>
                </div>
              );
            })}
            {currentUser && isTeamOwner(currentUser.id, team.id) && (
              <Link to="/members">
                <div className="flex items-center gap-2 px-2.5 py-2 text-sm text-blue-600 hover:text-blue-700 cursor-pointer">
                  <Plus className="size-3.5" />
                  Пригласить участника
                </div>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}