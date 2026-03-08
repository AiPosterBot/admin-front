import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Plus, Radio, Filter, CheckCircle, XCircle, AlertCircle, Tag, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import { AddChannelDialog } from "../components/AddChannelDialog";
import { Pagination, usePagination } from "../components/Pagination";
import { type Channel } from "../data/mock-data";
import { useTeam } from "../context/TeamContext";
// ── Service layer ────────────────────────────────────────────────────
import { useTeamChannels } from "../hooks/useTeamChannels";
import * as channelService from "../services/channelService";
import * as postService from "../services/postService";
import * as teamService from "../services/teamService";
import { TagBadge } from "../components/TagBadge";
import { TagFilter } from "../components/TagFilter";
import { ManageTagsDialog } from "../components/ManageTagsDialog";

const PAGE_SIZE = 10;
type StatusFilter = "all" | "active" | "inactive" | "error";

export function TeamChannelsPage() {
  const { currentTeamId } = useTeam();
  const navigate = useNavigate();
  const team = teamService.getTeamById(currentTeamId);

  // ── Реактивный список через сервис ───────────────────────────────
  const { state: channelsState, invalidate } = useTeamChannels();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [manageTagsOpen, setManageTagsOpen] = useState(false);

  const teamTags = channelService.getTeamChannelTags(currentTeamId ?? "");

  if (!team) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Команда не выбрана</h2>
        <p className="text-gray-600">Выберите команду в верхнем меню</p>
      </div>
    );
  }

  if (channelsState.status === "loading" || channelsState.status === "idle") {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const channels = channelsState.status === "success" ? channelsState.data : [];

  const handleFilterChange = (f: StatusFilter) => { setStatusFilter(f); setPage(1); };
  const handleTagFilterChange = (ids: string[]) => { setSelectedTagIds(ids); setPage(1); };

  const handleChannelCreated = async (data: Omit<Channel, "id" | "createdAt" | "teamId">) => {
    const result = await channelService.createChannel(currentTeamId!, {
      name: data.name,
      telegramId: data.telegramId,
    });
    if (!result.ok) { toast.error(result.error); return; }
    invalidate();
    toast.success(`Канал "${result.data.name}" добавлен`);
    navigate(`/channels/${result.data.id}`);
  };

  const handleDeleteChannel = async (channelId: string) => {
    const ch = channels.find(c => c.id === channelId);
    await channelService.deleteChannel(channelId, currentTeamId!);
    invalidate();
    toast.success(`Канал "${ch?.name ?? ""}" удалён`);
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const postsTodayByChannel = (channelId: string) =>
    postService.getPostsByChannelId(channelId).filter(
      p => p.status === "success" && p.postedAt.startsWith(todayStr)
    ).length;

  const filtered =
    (statusFilter === "all"      ? channels :
     statusFilter === "active"   ? channels.filter(c => c.isActive && !c.lastError) :
     statusFilter === "inactive" ? channels.filter(c => !c.isActive) :
                                   channels.filter(c => !!c.lastError))
    .filter(c => {
      if (selectedTagIds.length === 0) return true;
      const cTags = channelService.getChannelTagsById(c.id);
      return cTags.some(t => selectedTagIds.includes(t.id));
    });

  const { totalPages, paginate, totalItems } = usePagination(filtered, PAGE_SIZE);
  const pageChannels = paginate(page);

  const filterOptions: { value: StatusFilter; label: string; count: number; icon?: React.ReactNode }[] = [
    { value: "all",      label: "Все",         count: channels.length },
    { value: "active",   label: "Активные",    count: channels.filter(c => c.isActive && !c.lastError).length, icon: <CheckCircle className="size-3.5 text-green-500" /> },
    { value: "inactive", label: "Выключенные", count: channels.filter(c => !c.isActive).length,                icon: <XCircle className="size-3.5 text-gray-400" /> },
    { value: "error",    label: "С ошибкой",   count: channels.filter(c => !!c.lastError).length,              icon: <AlertCircle className="size-3.5 text-red-500" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Каналы</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {team.name} · {channels.length} каналов
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="size-4 mr-2" />
          Добавить канал
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto flex-wrap">
          <Filter className="size-3.5 text-gray-400 shrink-0" />
          <div className="flex items-center gap-1 flex-wrap">
            {filterOptions.map(({ value, label, count, icon }) => (
              <button
                key={value}
                onClick={() => handleFilterChange(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  statusFilter === value
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                }`}
              >
                {icon}
                {label}
                <span className={`text-xs tabular-nums ${statusFilter === value ? "text-white/50" : "text-gray-400"}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
          <div className="h-5 w-px bg-gray-200 hidden sm:block" />
          <TagFilter
            tags={teamTags}
            selectedTagIds={selectedTagIds}
            onChange={handleTagFilterChange}
          />
          <button
            onClick={() => setManageTagsOpen(true)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1.5 rounded-md hover:bg-gray-50"
            title="Управление тегами"
          >
            <Tag className="size-3.5" />
          </button>
        </div>
        {(statusFilter !== "all" || selectedTagIds.length > 0) && (
          <button
            onClick={() => { handleFilterChange("all"); setSelectedTagIds([]); }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Сбросить
          </button>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {pageChannels.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Radio className="size-8 text-gray-300 mx-auto mb-3" />
            <div className="font-medium">
              {channels.length === 0 ? "Каналов пока нет" : "Нет каналов с выбранным фильтром"}
            </div>
            {channels.length === 0 && (
              <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="size-4 mr-2" />
                Добавить канал
              </Button>
            )}
          </div>
        ) : (
          pageChannels.map((channel) => (
            <div
              key={channel.id}
              className="bg-white rounded-lg border p-4 active:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => navigate(`/channels/${channel.id}`)}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`size-2.5 rounded-full flex-shrink-0 mt-1 ${
                    channel.lastError ? "bg-red-500" : channel.isActive ? "bg-green-500" : "bg-gray-300"
                  }`} />
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">{channel.name}</div>
                    <a
                      href={`https://t.me/${channel.telegramId.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:text-blue-600"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {channel.telegramId}
                    </a>
                  </div>
                </div>
                <Badge variant={channel.publishMode === "instant" ? "default" : "secondary"} className="text-xs shrink-0">
                  {channel.publishMode === "instant" ? "Мгновенный" : "По расписанию"}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                {channel.lastError ? (
                  <span className="text-red-600 flex items-center gap-1"><AlertCircle className="size-3" /> Ошибка</span>
                ) : !channel.isActive ? (
                  <span className="text-gray-400">Выключен</span>
                ) : (
                  <span className="text-green-600">Активен</span>
                )}
                <span>Сегодня: {postsTodayByChannel(channel.id)}</span>
                <span>Источников: {channel.linkedSourcesCount}</span>
              </div>
              {(() => {
                const tags = channelService.getChannelTagsById(channel.id);
                return tags.length > 0 ? (
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    {tags.map(t => <TagBadge key={t.id} name={t.name} color={t.color} />)}
                  </div>
                ) : null;
              })()}
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="bg-white rounded-lg border hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Канал</TableHead>
              <TableHead>Режим</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Сегодня</TableHead>
              <TableHead>Источников</TableHead>
              <TableHead>Последняя публикация</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageChannels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                  <Radio className="size-8 text-gray-300 mx-auto mb-3" />
                  <div className="font-medium">
                    {channels.length === 0 ? "Каналов пока нет" : "Нет каналов с выбранным фильтром"}
                  </div>
                  {channels.length === 0 && (
                    <>
                      <div className="text-sm mt-1">Добавьте первый канал для публикации контента</div>
                      <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="size-4 mr-2" />
                        Добавить канал
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              pageChannels.map((channel) => (
                <TableRow
                  key={channel.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/channels/${channel.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className={`size-2 rounded-full flex-shrink-0 ${
                        channel.lastError ? "bg-red-500" : channel.isActive ? "bg-green-500" : "bg-gray-300"
                      }`} />
                      <div>
                        <div className="font-medium text-gray-900">{channel.name}</div>
                        <a
                          href={`https://t.me/${channel.telegramId.replace("@", "")}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:text-blue-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {channel.telegramId}
                        </a>
                        {(() => {
                          const tags = channelService.getChannelTagsById(channel.id);
                          return tags.length > 0 ? (
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              {tags.map(t => <TagBadge key={t.id} name={t.name} color={t.color} />)}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={channel.publishMode === "instant" ? "default" : "secondary"} className="text-xs">
                      {channel.publishMode === "instant" ? "Мгновенный" : "По расписанию"}
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
                        <div className="size-2 rounded-full bg-gray-300" />
                        <span className="text-sm text-gray-500">Выключен</span>
                      </div>
                    ) : channel.botCanPost ? (
                      <div className="flex items-center gap-1.5">
                        <div className="size-2 rounded-full bg-green-500" />
                        <span className="text-sm text-gray-700">Активен</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className="size-2 rounded-full bg-amber-400" />
                        <span className="text-sm text-amber-700">Бот не настроен</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-700">{postsTodayByChannel(channel.id)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-700">{channel.linkedSourcesCount}</span>
                  </TableCell>
                  <TableCell>
                    {channel.lastPublishedAt ? (
                      <span className="text-sm text-gray-600">
                        {new Date(channel.lastPublishedAt).toLocaleString("ru-RU")}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">Никогда</span>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <button
                      className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChannel(channel.id);
                      }}
                    >
                      Удалить
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={totalItems}
        pageSize={PAGE_SIZE}
      />

      <AddChannelDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onCreated={handleChannelCreated}
      />

      <ManageTagsDialog
        open={manageTagsOpen}
        onOpenChange={setManageTagsOpen}
        teamId={currentTeamId!}
        kind="channel"
        tags={teamTags}
        onChanged={() => invalidate()}
      />
    </div>
  );
}
