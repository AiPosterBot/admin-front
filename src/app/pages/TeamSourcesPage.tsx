import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Plus, Database,
  CheckCircle, XCircle, Filter, Pause, Tag, Loader2,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import { Pagination, usePagination } from "../components/Pagination";
import { useTeam } from "../context/TeamContext";
import { AddSourceDialog } from "../components/AddSourceDialog";
import { TagBadge } from "../components/TagBadge";
import { TagFilter } from "../components/TagFilter";
import { ManageTagsDialog } from "../components/ManageTagsDialog";
// ── Service layer ────────────────────────────────────────────────────
import { useTeamSources } from "../hooks/useTeamSources";
import * as sourceService from "../services/sourceService";
import * as teamService from "../services/teamService";

const PAGE_SIZE = 10;

const SOURCE_TYPE_LABEL: Record<string, string> = {
  rss: "RSS",
  website: "Web",
  telegram: "TG",
};

type StatusFilter = "all" | "active" | "stopped" | "error";
type TypeFilter = "all" | "rss" | "website" | "telegram";

export function TeamSourcesPage() {
  const { currentTeamId } = useTeam();
  const navigate = useNavigate();
  const team = teamService.getTeamById(currentTeamId);

  // ── Реактивный список через сервис (обновляется при смене команды) ──
  const { state: sourcesState, invalidate } = useTeamSources();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [page, setPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [manageTagsOpen, setManageTagsOpen] = useState(false);

  const teamTags = sourceService.getTeamSourceTags(currentTeamId ?? "");

  if (!team) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Команда не выбрана</h2>
        <p className="text-gray-600">Выберите команду в верхнем меню</p>
      </div>
    );
  }

  if (sourcesState.status === "loading" || sourcesState.status === "idle") {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const sources = sourcesState.status === "success" ? sourcesState.data : [];

  // Сколько каналов использует каждый источник (через сервис)
  const channelsForSource = (sourceId: string) =>
    sourceService.getChannelsForSource(sourceId, currentTeamId!);

  const countActive  = sources.filter(s => s.isActive && s.status === "ok").length;
  const countStopped = sources.filter(s => !s.isActive).length;
  const countError   = sources.filter(s => s.isActive && s.status === "error").length;
  const countRss   = sources.filter(s => s.type === "rss").length;
  const countWeb   = sources.filter(s => s.type === "website").length;
  const countTg    = sources.filter(s => s.type === "telegram").length;

  // Фильтрация
  const filtered = sources
    .filter(s => {
      if (statusFilter === "active")  return s.isActive && s.status === "ok";
      if (statusFilter === "stopped") return !s.isActive;
      if (statusFilter === "error")   return s.isActive && s.status === "error";
      return true;
    })
    .filter(s => typeFilter === "all" || s.type === typeFilter)
    .filter(s => {
      if (selectedTagIds.length === 0) return true;
      const sTags = sourceService.getSourceTagsById(s.id);
      return sTags.some(t => selectedTagIds.includes(t.id));
    });

  const { totalPages, paginate, totalItems: paginationTotal } = usePagination(filtered, PAGE_SIZE);
  const pageSources = paginate(page);

  const handleStatusChange = (v: StatusFilter) => { setStatusFilter(v); setPage(1); };
  const handleTypeChange   = (v: TypeFilter)   => { setTypeFilter(v);   setPage(1); };
  const handleTagFilterChange = (ids: string[]) => { setSelectedTagIds(ids); setPage(1); };

  const statusFilterOptions: { value: StatusFilter; label: string; count: number; icon?: React.ReactNode }[] = [
    { value: "all",     label: "Все",           count: sources.length },
    { value: "active",  label: "Активные",      count: countActive,  icon: <CheckCircle className="size-3.5 text-green-500" /> },
    { value: "stopped", label: "Остановленные", count: countStopped, icon: <Pause className="size-3.5 text-gray-400" /> },
    { value: "error",   label: "С ошибками",    count: countError,   icon: <XCircle className="size-3.5 text-red-500" /> },
  ];

  const typeFilterOptions: { value: TypeFilter; label: string; count: number }[] = [
    { value: "all",      label: "Все типы", count: sources.length },
    { value: "rss",      label: "RSS",      count: countRss },
    { value: "website",  label: "Web",      count: countWeb },
    { value: "telegram", label: "Telegram", count: countTg },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Источники контента</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {team.name} · {sources.length} источников
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="size-4 mr-2" />
          Добавить источник
        </Button>
        <AddSourceDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSourceCreated={() => {
            invalidate();
            toast.success("Источник добавлен");
          }}
        />
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Status filters */}
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-gray-400 shrink-0" />
            <div className="flex items-center gap-1 flex-wrap">
              {statusFilterOptions.map(({ value, label, count, icon }) => (
                <button
                  key={value}
                  onClick={() => handleStatusChange(value)}
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
          </div>

          {/* Type filters */}
          <div className="h-5 w-px bg-gray-200 hidden sm:block" />
          <div className="flex items-center gap-1 flex-wrap">
            {typeFilterOptions.map(({ value, label, count }) => (
              <button
                key={value}
                onClick={() => handleTypeChange(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  typeFilter === value
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                }`}
              >
                {label}
                <span className={`text-xs tabular-nums ${typeFilter === value ? "text-white/50" : "text-gray-400"}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Tag filters */}
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

        {(statusFilter !== "all" || typeFilter !== "all" || selectedTagIds.length > 0) && (
          <button
            onClick={() => { setStatusFilter("all"); setTypeFilter("all"); setSelectedTagIds([]); setPage(1); }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Сбросить
          </button>
        )}
      </div>

      {/* Sources — Mobile cards */}
      <div className="md:hidden space-y-3">
        {pageSources.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Database className="size-8 text-gray-300 mx-auto mb-3" />
            <div className="font-medium">
              {sources.length === 0 ? "Источников пока нет" : "Нет источников с выбранным фильтром"}
            </div>
            {sources.length === 0 && (
              <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="size-4 mr-2" />
                Добавить источник
              </Button>
            )}
          </div>
        ) : (
          pageSources.map((src) => {
            const linkedChannels = channelsForSource(src.id);
            return (
              <div
                key={src.id}
                className="bg-white rounded-lg border p-4 active:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => navigate(`/sources/${src.id}`)}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`size-2.5 rounded-full flex-shrink-0 mt-1 ${
                        !src.isActive ? "bg-gray-400" :
                        src.status === "error" ? "bg-red-500" : "bg-green-500"
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 truncate">{src.name}</div>
                      <div className="text-xs text-gray-400 truncate">{src.url}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {SOURCE_TYPE_LABEL[src.type]}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                  {!src.isActive ? (
                    <span className="text-gray-400">Остановлен</span>
                  ) : src.status === "error" ? (
                    <span className="text-red-600">Ошибка</span>
                  ) : (
                    <span className="text-green-600">Активен</span>
                  )}
                  <span>Сег: {src.itemsCount24h}</span>
                  <span>Нед: {src.itemsCountWeek}</span>
                  <span>Всего: {src.itemsCount}</span>
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {linkedChannels.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {linkedChannels.slice(0, 2).map(ch => (
                        <Badge key={ch.id} variant="outline" className="text-xs font-normal">
                          {ch.name}
                        </Badge>
                      ))}
                      {linkedChannels.length > 2 && (
                        <span className="text-xs text-gray-400">+{linkedChannels.length - 2}</span>
                      )}
                    </div>
                  )}
                  {(() => {
                    const tags = sourceService.getSourceTagsById(src.id);
                    return tags.length > 0 ? (
                      <div className="flex items-center gap-1 flex-wrap">
                        {tags.map(t => (
                          <TagBadge key={t.id} name={t.name} color={t.color} />
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sources table — Desktop */}
      <div className="bg-white rounded-lg border hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Источник</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Сегодня</TableHead>
              <TableHead className="text-right">Неделя</TableHead>
              <TableHead className="text-right">Всего</TableHead>
              <TableHead>Каналы</TableHead>
              <TableHead>Последний сбор</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageSources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-gray-500">
                  <Database className="size-8 text-gray-300 mx-auto mb-3" />
                  <div className="font-medium">
                    {sources.length === 0 ? "Источников пока нет" : "Нет источников с выбранным фильтром"}
                  </div>
                  {sources.length === 0 && (
                    <>
                      <div className="text-sm mt-1">Добавьте первый источник для сбора контента</div>
                      <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="size-4 mr-2" />
                        Добавить источник
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              pageSources.map((src) => {
                const linkedChannels = channelsForSource(src.id);
                return (
                  <TableRow
                    key={src.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/sources/${src.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`size-2 rounded-full flex-shrink-0 ${
                            !src.isActive ? "bg-gray-400" :
                            src.status === "error" ? "bg-red-500" : "bg-green-500"
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900">{src.name}</div>
                          <div className="text-xs text-gray-400 truncate max-w-[240px]">{src.url}</div>
                          {(() => {
                            const tags = sourceService.getSourceTagsById(src.id);
                            return tags.length > 0 ? (
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                {tags.map(t => (
                                  <TagBadge key={t.id} name={t.name} color={t.color} />
                                ))}
                              </div>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {SOURCE_TYPE_LABEL[src.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!src.isActive ? (
                        <div className="flex items-center gap-1.5">
                          <div className="size-2 rounded-full bg-gray-400" />
                          <span className="text-sm text-gray-500">Остановлен</span>
                        </div>
                      ) : src.status === "error" ? (
                        <div className="flex items-center gap-1.5">
                          <div className="size-2 rounded-full bg-red-500" />
                          <span className="text-sm text-red-600">Ошибка</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div className="size-2 rounded-full bg-green-500" />
                          <span className="text-sm text-gray-700">Активен</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{src.itemsCount24h}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{src.itemsCountWeek}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{src.itemsCount}</TableCell>
                    <TableCell>
                      {linkedChannels.length === 0 ? (
                        <span className="text-gray-400 text-sm">—</span>
                      ) : (
                        <div className="flex items-center gap-1 flex-wrap">
                          {linkedChannels.slice(0, 2).map(ch => (
                            <Link
                              key={ch.id}
                              to={`/channels/${ch.id}`}
                              onClick={e => e.stopPropagation()}
                            >
                              <Badge
                                variant="outline"
                                className="text-xs font-normal hover:border-blue-400 hover:text-blue-600 transition-colors"
                              >
                                {ch.name}
                              </Badge>
                            </Link>
                          ))}
                          {linkedChannels.length > 2 && (
                            <span className="text-xs text-gray-400">+{linkedChannels.length - 2}</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {src.lastFetchedAt ? (
                        <span className="text-sm text-gray-600">
                          {new Date(src.lastFetchedAt).toLocaleString("ru-RU", {
                            day: "numeric", month: "short",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">Никогда</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={paginationTotal}
        pageSize={PAGE_SIZE}
      />

      <ManageTagsDialog
        open={manageTagsOpen}
        onOpenChange={setManageTagsOpen}
        teamId={currentTeamId!}
        kind="source"
        tags={teamTags}
        onChanged={() => invalidate()}
      />
    </div>
  );
}
