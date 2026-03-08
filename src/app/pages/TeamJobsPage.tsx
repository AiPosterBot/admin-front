import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import {
  CheckCircle, AlertCircle, Clock, ChevronRight,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Pagination, usePagination } from "../components/Pagination";
import { useTeam } from "../context/TeamContext";
import { useTeamJobs } from "../hooks/useTeamJobs";
import { Loader2 } from "lucide-react";
import { PeriodPicker, isInPeriod } from "../components/PeriodPicker";
import type { DateRange } from "react-day-picker";
// ── Service layer ────────────────────────────────────────────────────
import * as channelService from "../services/channelService";
import * as sourceService from "../services/sourceService";
import * as teamService from "../services/teamService";

const PAGE_SIZE = 15;

type TypeFilter = "all" | "publish_to_channel" | "fetch_rss" | "fetch_rss_hybrid" | "fetch_telegram" | "fetch_website" | "onboard_website" | "onboard_rss_article" | "ads_campaign";

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "Все типы" },
  { value: "publish_to_channel", label: "Публикация" },
  { value: "fetch_rss", label: "Сбор RSS" },
  { value: "fetch_rss_hybrid", label: "Сбор RSS+HTML" },
  { value: "fetch_telegram", label: "Сбор TG" },
  { value: "fetch_website", label: "Сбор сайт" },
  { value: "onboard_website", label: "Агент сайта" },
  { value: "onboard_rss_article", label: "Агент RSS" },
  { value: "ads_campaign", label: "Рассылка рекламы" },
];

export function TeamJobsPage() {
  const { currentTeamId } = useTeam();
  const navigate = useNavigate();
  const team = teamService.getTeamById(currentTeamId);
  // ── Реактивный список через хук (обновляется при смене команды) ──
  const { state: jobsState } = useTeamJobs();

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [channelFilter, setChannelFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [page, setPage] = useState(1);

  const teamChannels = channelService.getTeamChannelsList(currentTeamId ?? "");
  const teamSources = sourceService.getTeamSourcesList(currentTeamId ?? "");

  const teamJobs = jobsState.status === "success" ? jobsState.data : [];

  // ── useMemo MUST be before early returns ─────────────────────────────
  // Counts for type filter
  const typeCounts = useMemo(() => {
    const base = teamJobs.filter(j => {
      const matchesDate = isInPeriod(j.createdAt, dateRange);
      const matchesCh = channelFilter === "all" || j.params?.channelId === channelFilter;
      const matchesSrc = sourceFilter === "all" || j.params?.sourceId === sourceFilter;
      return matchesDate && matchesCh && matchesSrc;
    });
    return {
      all: base.length,
      publish_to_channel: base.filter(j => j.type === "publish_to_channel").length,
      fetch_rss: base.filter(j => j.type === "fetch_rss").length,
      fetch_rss_hybrid: base.filter(j => j.type === "fetch_rss_hybrid").length,
      fetch_telegram: base.filter(j => j.type === "fetch_telegram").length,
      fetch_website: base.filter(j => j.type === "fetch_website").length,
      onboard_website: base.filter(j => j.type === "onboard_website").length,
      onboard_rss_article: base.filter(j => j.type === "onboard_rss_article").length,
      ads_campaign: base.filter(j => j.type === "ads_campaign").length,
    };
  }, [teamJobs, dateRange, channelFilter, sourceFilter]);

  const filteredJobs = useMemo(() => {
    return teamJobs.filter((job) => {
      const matchesDate = isInPeriod(job.createdAt, dateRange);
      const matchesType = typeFilter === "all" || job.type === typeFilter;
      const matchesChannel =
        channelFilter === "all" || job.params?.channelId === channelFilter;
      const matchesSource =
        sourceFilter === "all" || job.params?.sourceId === sourceFilter;
      return matchesDate && matchesType && matchesChannel && matchesSource;
    });
  }, [teamJobs, dateRange, typeFilter, channelFilter, sourceFilter]);

  const { totalPages, paginate, totalItems } = usePagination(filteredJobs, PAGE_SIZE);

  // ── Early returns only after all hooks ───────────────────────────────
  if (!team) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Команда не выбрана</h2>
        <p className="text-gray-600">Выберите команду в верхнем меню</p>
      </div>
    );
  }

  if (jobsState.status === "loading" || jobsState.status === "idle") {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const pageJobs = paginate(page);

  const hasActiveFilters =
    typeFilter !== "all" ||
    dateRange !== undefined || channelFilter !== "all" || sourceFilter !== "all";

  const resetFilters = () => {
    setDateRange(undefined);
    setTypeFilter("all");
    setChannelFilter("all");
    setSourceFilter("all");
    setPage(1);
  };

  const handleSelectChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "success": return <CheckCircle className="size-4 text-green-500" />;
      case "failed": return <AlertCircle className="size-4 text-red-500" />;
      case "running": return <Clock className="size-4 text-blue-500 animate-pulse" />;
      default: return <Clock className="size-4 text-gray-400" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "success": return "Выполнено";
      case "failed": return "Ошибка";
      case "running": return "В работе";
      case "pending": return "Ожидает";
      default: return status;
    }
  };

  const statusVariant = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (status) {
      case "success": return "default";
      case "failed": return "destructive";
      case "running": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Задачи</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {team.name} · {teamJobs.length} задач
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
          <Select value={typeFilter} onValueChange={v => handleSelectChange(setTypeFilter as (v: string) => void, v)}>
            <SelectTrigger className={`h-8 text-sm w-auto min-w-[140px] ${typeFilter !== "all" ? "border-blue-400 bg-blue-50" : ""}`}>
              <SelectValue placeholder="Тип задачи" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                  {" "}
                  <span className="text-gray-400 tabular-nums">{typeCounts[value]}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <PeriodPicker
            value={dateRange}
            onChange={(range) => { setDateRange(range); setPage(1); }}
          />

          {teamChannels.length > 0 && (
            <Select value={channelFilter} onValueChange={v => handleSelectChange(setChannelFilter, v)}>
              <SelectTrigger className={`h-8 text-sm w-auto min-w-[140px] ${channelFilter !== "all" ? "border-blue-400 bg-blue-50" : ""}`}>
                <SelectValue placeholder="Канал" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все каналы</SelectItem>
                {teamChannels.map(ch => (
                  <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {teamSources.length > 0 && (
            <Select value={sourceFilter} onValueChange={v => handleSelectChange(setSourceFilter, v)}>
              <SelectTrigger className={`h-8 text-sm w-auto min-w-[140px] ${sourceFilter !== "all" ? "border-blue-400 bg-blue-50" : ""}`}>
                <SelectValue placeholder="Источник" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все источники</SelectItem>
                {teamSources.map(src => (
                  <SelectItem key={src.id} value={src.id}>{src.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-auto"
            >
              Сбросить
            </button>
          )}
      </div>

      {/* Jobs List */}
      <div className="bg-white rounded-lg border divide-y">
        {pageJobs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-gray-300 text-4xl mb-3">⚡</div>
            <div className="font-medium">Задач не найдено</div>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-blue-600 text-sm mt-2 hover:underline"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        ) : (
          pageJobs.map((job) => {
            const relatedChannel = job.params?.channelId
              ? teamChannels.find(c => c.id === job.params.channelId)
              : null;
            const relatedSource = job.params?.sourceId
              ? teamSources.find(s => s.id === job.params.sourceId)
              : null;

            return (
              <div key={job.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => navigate(`/jobs/${job.id}`)}
              >
                <div className="flex-shrink-0">{statusIcon(job.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-medium text-sm text-gray-900">
                      {job.type === "publish_to_channel" ? "Публикация в канал"
                        : job.type === "fetch_rss" ? "Сбор RSS"
                        : job.type === "fetch_rss_hybrid" ? "Сбор RSS + HTML"
                        : job.type === "fetch_telegram" ? "Сбор Telegram"
                        : job.type === "fetch_website" ? "Сбор сайта"
                        : job.type === "onboard_website" ? "Онбординг сайта"
                        : job.type === "onboard_rss_article" ? "Онбординг RSS-агента"
                        : job.type === "ads_campaign" ? "Рассылка рекламы"
                        : job.type.replace(/_/g, " ")}
                    </span>
                    <Badge
                      variant={statusVariant(job.status)}
                      className={`text-xs ${job.status === "running" ? "bg-blue-100 text-blue-700 border-blue-200" : ""}`}
                    >
                      {statusLabel(job.status)}
                    </Badge>
                    {relatedChannel && (
                      <Link
                        to={`/channels/${relatedChannel.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:opacity-80 transition-opacity"
                      >
                        <Badge variant="outline" className="text-xs cursor-pointer hover:bg-gray-100">
                          📡 {relatedChannel.name}
                        </Badge>
                      </Link>
                    )}
                    {relatedSource && (
                      <Link
                        to={`/sources/${relatedSource.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:opacity-80 transition-opacity"
                      >
                        <Badge variant="outline" className="text-xs cursor-pointer hover:bg-gray-100">
                          🔗 {relatedSource.name}
                        </Badge>
                      </Link>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(job.createdAt).toLocaleString("ru-RU")}
                    {job.completedAt && (
                      <span className="ml-2 text-gray-300">
                        · {Math.round(
                          (new Date(job.completedAt).getTime() -
                            new Date(job.createdAt).getTime()) / 1000
                        )}с
                      </span>
                    )}
                  </div>
                  {job.error && (
                    <div className="text-xs text-red-500 mt-0.5 truncate">{job.error}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {job.llmTraceIds.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      LLM ×{job.llmTraceIds.length}
                    </Badge>
                  )}
                  <ChevronRight className="size-4 text-gray-400" />
                </div>
              </div>
            );
          })
        )}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={totalItems}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}