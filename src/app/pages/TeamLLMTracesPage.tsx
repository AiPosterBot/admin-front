// All React hooks MUST be called unconditionally before any early return (Rules of Hooks).
import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { Activity, Filter, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Pagination, usePagination } from "../components/Pagination";
import { useTeam } from "../context/TeamContext";
import { useTeamLLMTraces } from "../hooks/useTeamLLMTraces";
import { useTeamJobs } from "../hooks/useTeamJobs";
import { PeriodPicker, isInPeriod } from "../components/PeriodPicker";
import type { DateRange } from "react-day-picker";
import * as teamService from "../services/teamService";

const PAGE_SIZE = 15;

type TypeFilter = "all" | "publish_to_channel" | "onboard_website";

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all",                label: "Все" },
  { value: "publish_to_channel", label: "Публикация" },
  { value: "onboard_website",    label: "Онбординг источника" },
];

export function TeamLLMTracesPage() {
  // ─── 1. All hooks first — no conditional calls ──────────────────────
  const { currentTeamId } = useTeam();
  const navigate = useNavigate();

  const { state: tracesState } = useTeamLLMTraces();
  const { state: jobsState }   = useTeamJobs();

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateRange | undefined>(undefined);
  const [page, setPage]             = useState(1);

  // Derived data — useMemo must stay above early returns
  const teamTraces = useMemo(
    () => (tracesState.status === "success" ? tracesState.data : []),
    [tracesState],
  );
  const teamJobs = useMemo(
    () => (jobsState.status === "success" ? jobsState.data : []),
    [jobsState],
  );
  const teamJobMap = useMemo(
    () => new Map(teamJobs.map((j) => [j.id, j])),
    [teamJobs],
  );

  const typeCounts = useMemo(() => {
    const base = teamTraces.filter((t) => isInPeriod(t.createdAt, dateFilter));
    const getJobType = (jobId: string | undefined) =>
      jobId ? teamJobMap.get(jobId)?.type : undefined;
    return {
      all: base.length,
      publish_to_channel: base.filter(
        (t) => getJobType(t.jobId) !== "onboard_website",
      ).length,
      onboard_website: base.filter(
        (t) => getJobType(t.jobId) === "onboard_website",
      ).length,
    };
  }, [teamTraces, dateFilter, teamJobMap]);

  const filteredTraces = useMemo(
    () =>
      teamTraces.filter((t) => {
        if (!isInPeriod(t.createdAt, dateFilter)) return false;
        if (typeFilter === "all") return true;
        const jobType = t.jobId ? teamJobMap.get(t.jobId)?.type : undefined;
        if (typeFilter === "onboard_website") return jobType === "onboard_website";
        return jobType !== "onboard_website";
      }),
    [teamTraces, typeFilter, dateFilter, teamJobMap],
  );

  // usePagination is a plain function (no hooks inside), safe to call anywhere.
  const { totalPages, paginate, totalItems } = usePagination(filteredTraces, PAGE_SIZE);

  // ─── 2. Early returns — only after every hook ────────────────────────
  const team = teamService.getTeamById(currentTeamId);
  if (!team) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Команда не выбрана</h2>
        <p className="text-gray-600">Выберите команду в верхнем меню</p>
      </div>
    );
  }

  const isLoading =
    tracesState.status === "loading" || tracesState.status === "idle" ||
    jobsState.status   === "loading" || jobsState.status   === "idle";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // ─── 3. Render ───────────────────────────────────────────────────────
  const pageTraces       = paginate(page);
  const hasActiveFilters = typeFilter !== "all" || dateFilter !== undefined;
  const resetFilters     = () => { setTypeFilter("all"); setDateFilter(undefined); setPage(1); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">LLM Трейсы</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {team.name} · {teamTraces.length} запросов к модели
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Type toggles */}
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-gray-400" />
            <div className="flex items-center gap-1">
              {TYPE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => { setTypeFilter(value); setPage(1); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    typeFilter === value
                      ? "bg-gray-900 text-white"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  }`}
                >
                  {label}
                  <span
                    className={`text-xs tabular-nums ${
                      typeFilter === value ? "text-gray-300" : "text-gray-400"
                    }`}
                  >
                    {typeCounts[value]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="h-5 w-px bg-gray-200" />

          {/* Period picker */}
          <PeriodPicker
            value={dateFilter}
            onChange={(range) => { setDateFilter(range); setPage(1); }}
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Сбросить
          </button>
        )}
      </div>

      {/* List */}
      {filteredTraces.length === 0 ? (
        <div className="bg-white rounded-lg border py-12 text-center text-gray-400">
          <Activity className="size-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">
            {teamTraces.length === 0
              ? "Трейсов пока нет"
              : "Нет трейсов с выбранным фильтром"}
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-blue-500 hover:underline mt-2"
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border divide-y">
          {pageTraces.map((trace) => {
            const job       = trace.jobId ? teamJobMap.get(trace.jobId) : undefined;
            const isOnboard = job?.type === "onboard_website";

            return (
              <div
                key={trace.id}
                className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50/80 transition-colors cursor-pointer"
                onClick={() => navigate(`/llm-traces/${trace.id}`)}
              >
                {/* Icon */}
                <div className="size-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                  <Activity className="size-4 text-purple-500" />
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <Badge variant="outline" className="text-xs font-mono">
                      {trace.model}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        isOnboard
                          ? "text-amber-700 bg-amber-50 border-amber-200"
                          : "text-blue-700 bg-blue-50 border-blue-200"
                      }`}
                    >
                      {isOnboard ? "Онбординг источника" : "Публикация"}
                    </Badge>
                    {trace.toolCalls && trace.toolCalls.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        tools ×{trace.toolCalls.length}
                      </Badge>
                    )}
                    {job && (
                      <Link
                        to={`/jobs/${job.id}`}
                        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="size-3" />
                        Job
                      </Link>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">
                    {trace.prompt
                      .replace(/^System:.*?\n\n/, "")
                      .replace(/^User:\s*/, "")
                      .slice(0, 120)}
                    …
                  </p>
                </div>

                {/* Metrics */}
                <div className="hidden sm:flex items-center gap-5 shrink-0 text-right">
                  <div>
                    <p className="text-xs font-medium text-gray-700 tabular-nums">
                      {trace.totalTokens.toLocaleString("ru-RU")}
                    </p>
                    <p className="text-xs text-gray-400">токенов</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 tabular-nums">
                      ${trace.cost.toFixed(4)}
                    </p>
                    <p className="text-xs text-gray-400">стоимость</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 tabular-nums">
                      {new Date(trace.createdAt).toLocaleString("ru-RU", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-xs text-gray-300">{trace.id}</p>
                  </div>
                </div>

                <ChevronRight className="size-4 text-gray-300 shrink-0" />
              </div>
            );
          })}
        </div>
      )}

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