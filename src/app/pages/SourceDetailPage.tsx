import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  RefreshCw, Power, AlertCircle, ArrowLeft, ExternalLink,
  CheckCircle, FileText, Newspaper, Activity,
  Settings, Eye, Heart, ChevronRight, Clock, Filter,
  Loader2, Rss, Globe, Bot, Copy, ChevronDown, ChevronUp,
  Pause, Play, Image, Send, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Pagination, usePagination } from "../components/Pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  type WebsiteFullConfig, type RssArticleOnlyConfig, type Job,
} from "../data/mock-data";
import { useTeam } from "../context/TeamContext";
// ── Service + guard layer ─────────────────────────────────────────────
import * as sourceService from "../services/sourceService";
import * as channelService from "../services/channelService";
import * as itemService from "../services/itemService";
import * as postService from "../services/postService";
import * as jobService from "../services/jobService";
import * as teamService from "../services/teamService";
import { useTeamScopedEntity } from "../hooks/useTeamScopedEntity";
import { TeamScopeGuard } from "../components/TeamScopeGuard";
import { TagBadge } from "../components/TagBadge";
import { AssignTagsPopover } from "../components/AssignTagsPopover";
import { PeriodPicker, isInPeriod } from "../components/PeriodPicker";
import type { DateRange } from "react-day-picker";

const ITEMS_PAGE_SIZE     = 8;
const PUBLISHED_PAGE_SIZE = 8;
const JOBS_PAGE_SIZE      = 10;

const SOURCE_TYPE_LABEL: Record<string, string> = {
  telegram: "Telegram канал",
  rss:      "RSS лента",
  website:  "Веб-сайт",
};

type ItemPublishFilter = "all" | "published" | "unpublished";
type JobStatusFilter   = "all" | "success" | "failed" | "running" | "pending";

export function SourceDetailPage() {
  const { sourceId } = useParams();
  const { currentTeamId } = useTeam();
  const navigate = useNavigate();
  const team = teamService.getTeamById(currentTeamId);

  // ── Team scope guard: хук загружает источник через сервис и
  //    автоматически редиректит если он не принадлежит текущей команде ──
  const { state: sourceState } = useTeamScopedEntity(
    () => sourceService.getSourceById(sourceId!, currentTeamId!),
    [sourceId, currentTeamId],
    "/sources",
  );

  // ── Pagination state ──────────────────────────────────────────────────
  const [itemsPage,     setItemsPage]     = useState(1);
  const [publishedPage, setPublishedPage] = useState(1);
  const [jobsPage,      setJobsPage]      = useState(1);

  // ── Content tab filters ──────────────��────────────────────────────────
  const [itemPublishFilter, setItemPublishFilter] = useState<ItemPublishFilter>("all");
  const [itemDateFilter,    setItemDateFilter]    = useState<DateRange | undefined>();

  // ── Publications tab filters ─────────────────────────────────────────
  const [pubsChannelFilter, setPubsChannelFilter] = useState<string>("all");
  const [pubsDateFilter,    setPubsDateFilter]    = useState<DateRange | undefined>();

  // ── Jobs tab filters ──────────────────────────────────────────────────
  const [jobStatusFilter, setJobStatusFilter] = useState<JobStatusFilter>("all");
  const [jobDateFilter,   setJobDateFilter]   = useState<DateRange | undefined>();

  // ── Scanning state ──────────────────────────────────────────────────
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = async () => {
    if (sourceState.status !== "success" || !currentTeamId) return;
    const src = sourceState.data;
    setIsScanning(true);
    const result = await sourceService.scanSourceNow(src.id, currentTeamId);
    if (result.ok) {
      toast.success("Сканирование запущено", { description: `Job ${result.data.id} создан` });
      setTimeout(() => {
        setIsScanning(false);
        toast.success(`Сканирование завершено. Новых материалов: ${(result.data.result as { newItemsCount?: number })?.newItemsCount ?? "?"}`);
      }, 4000);
    } else {
      setIsScanning(false);
      toast.error(result.error);
    }
  };

  // ── Active toggle state ────────────────────────────────────────────
  // Инициализируется после загрузки источника через useEffect
  const [localIsActive, setLocalIsActive] = useState(true);
  useEffect(() => {
    if (sourceState.status === "success") {
      setLocalIsActive(sourceState.data.isActive);
    }
  }, [sourceState.status]);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);

  // ── Delete confirmation ─────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Settings tab: agent re-run state ───────────────────────────────
  // agentNewConfig — строго WebsiteFullConfig (proper typed diff)
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentDone, setAgentDone] = useState(false);
  const [agentNewConfig, setAgentNewConfig] = useState<WebsiteFullConfig | null>(null);
  const [agentJob, setAgentJob] = useState<Job | null>(null);
  const [configExpanded, setConfigExpanded] = useState(false);

  // ── RSS article agent re-onboard state ───────────────────────────
  const [rssAgentRunning, setRssAgentRunning] = useState(false);
  const [rssAgentDone, setRssAgentDone] = useState(false);
  const [rssAgentNewConfig, setRssAgentNewConfig] = useState<RssArticleOnlyConfig | null>(null);
  const [rssAgentJob, setRssAgentJob] = useState<Job | null>(null);

  // ── Telegram permissions check ────────────────────────────────────
  const [checkingPermissions, setCheckingPermissions] = useState(false);
  const [, forceTagUpdate] = useState(0);

  if (!team) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Команда не выбрана</h2>
        <p className="text-gray-600 mb-4">Выберите команду, чтобы просмотреть источник.</p>
        <Link to="/sources"><Button>← Вернуться к источникам</Button></Link>
      </div>
    );
  }

  // ── Raw data (через сервисный слой) ──────────────────────────────────
  const sourceItems = itemService.getItemsBySourceId(sourceId!)
    .sort((a, b) => new Date(b.extractedAt).getTime() - new Date(a.extractedAt).getTime());

  const publishedFromSource = postService.getPostsBySourceId(sourceId!)
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());

  const sourceJobs = jobService.getJobsBySourceId(sourceId!, currentTeamId!)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const linkedChannels = sourceService.getChannelsForSource(sourceId!, currentTeamId!);

  const getPublicationsForItem = (itemId: string) =>
    publishedFromSource.filter(p => p.itemId === itemId);

  // ── Date helpers ────────────────────────────────────────────────────
  const now      = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const weekAgo  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // ── Content tab filtering ─────────────────────────────────────────────
  const publishedItemIds = new Set(publishedFromSource.map(p => p.itemId));

  const countAll         = sourceItems.length;
  const countPublished   = sourceItems.filter(i =>  publishedItemIds.has(i.id)).length;
  const countUnpublished = sourceItems.filter(i => !publishedItemIds.has(i.id)).length;

  const filteredItems = sourceItems.filter((item) => {
    if (itemPublishFilter === "published"   && !publishedItemIds.has(item.id)) return false;
    if (itemPublishFilter === "unpublished" &&  publishedItemIds.has(item.id)) return false;
    return isInPeriod(item.extractedAt, itemDateFilter);
  });

  const handleItemPublishFilter = (v: ItemPublishFilter) => { setItemPublishFilter(v); setItemsPage(1); };
  const handleItemDateFilter    = (v: DateRange | undefined) => { setItemDateFilter(v);    setItemsPage(1); };

  // ── Publications tab filtering ────────────────────────────────────���─
  // Unique channels that appear in publications
  const pubChannelOptions = Array.from(
    new Map(publishedFromSource.map(p => [p.channelId, p.channelName])).entries()
  );

  const filteredPubs = publishedFromSource.filter((p) => {
    if (pubsChannelFilter !== "all" && p.channelId !== pubsChannelFilter) return false;
    return isInPeriod(p.postedAt, pubsDateFilter);
  });

  const handlePubsChannelFilter = (v: string)                => { setPubsChannelFilter(v); setPublishedPage(1); };
  const handlePubsDateFilter    = (v: DateRange | undefined) => { setPubsDateFilter(v);    setPublishedPage(1); };

  // ── Jobs tab filtering ───────────────────────────────────────────────
  const jobStatusCounts: Record<string, number> = { all: sourceJobs.length };
  for (const j of sourceJobs) {
    jobStatusCounts[j.status] = (jobStatusCounts[j.status] ?? 0) + 1;
  }

  const filteredJobs = sourceJobs.filter((j) => {
    if (jobStatusFilter !== "all" && j.status !== jobStatusFilter) return false;
    return isInPeriod(j.createdAt, jobDateFilter);
  });

  const handleJobStatusFilter = (v: JobStatusFilter)         => { setJobStatusFilter(v); setJobsPage(1); };
  const handleJobDateFilter   = (v: DateRange | undefined)   => { setJobDateFilter(v);   setJobsPage(1); };

  // ── Pagination ────────────────────────────────────────────────────────
  const { totalPages: itemsTotalPages,     paginate: itemsPaginate,     totalItems: itemsTotal }     = usePagination(filteredItems,    ITEMS_PAGE_SIZE);
  const { totalPages: publishedTotalPages, paginate: publishedPaginate, totalItems: publishedTotal } = usePagination(filteredPubs,      PUBLISHED_PAGE_SIZE);
  const { totalPages: jobsTotalPages,      paginate: jobsPaginate,      totalItems: jobsTotal }      = usePagination(filteredJobs,      JOBS_PAGE_SIZE);

  const pageItems     = itemsPaginate(itemsPage);
  const pagePublished = publishedPaginate(publishedPage);
  const pageJobs      = jobsPaginate(jobsPage);

  // ── Stats for summary cards ───────────────────────────────────────────
  const pubsToday = publishedFromSource.filter(p => p.postedAt.startsWith(todayStr)).length;
  const pubsWeek  = publishedFromSource.filter(p => new Date(p.postedAt) >= weekAgo).length;

  // ── Filter option arrays ──────────────────────────────────────────────
  const itemPublishFilterOptions: { value: ItemPublishFilter; label: string; count: number }[] = [
    { value: "all",         label: "Все",               count: countAll },
    { value: "published",   label: "Опубликованные",    count: countPublished },
    { value: "unpublished", label: "Не опубликованные", count: countUnpublished },
  ];

  const jobStatusOptions: { value: JobStatusFilter; label: string }[] = [
    { value: "all",     label: "Все" },
    { value: "success", label: "Успех" },
    { value: "failed",  label: "Ошибка" },
    { value: "running", label: "В работе" },
    { value: "pending", label: "Ожидает" },
  ];

  // ═══════════════════════════════════════════════════════════════════
  return (
    <TeamScopeGuard state={sourceState} notFoundLabel="Источник не найден или недоступен в этой команде">
    {(source) => (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/sources" className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft className="size-3.5" />
          Источники
        </Link>
        <span>/</span>
        <span className="text-gray-900">{source.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <StatusDot status={localIsActive ? source.status : "inactive"} />
            <h1 className="text-2xl font-bold text-gray-900">{source.name}</h1>
            <Badge variant="outline" className="text-xs">{SOURCE_TYPE_LABEL[source.type]}</Badge>
            {localIsActive ? (
              source.status === "error"
                ? <Badge variant="destructive" className="text-xs">Ошибка</Badge>
                : <Badge variant="default" className="text-xs">Активен</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs text-gray-500">Остановлен</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={source.type === "telegram"
                ? `https://t.me/${source.url.replace(/^@/, "")}`
                : source.url.startsWith("http") ? source.url : `https://${source.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-100 px-1.5 py-0.5 rounded text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
            >
              {source.url}
            </a>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-400">{team.name}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            {sourceService.getSourceTagsById(source.id).map(t => (
              <TagBadge key={t.id} name={t.name} color={t.color} />
            ))}
            <AssignTagsPopover
              entityId={source.id}
              teamId={currentTeamId!}
              kind="source"
              allTags={sourceService.getTeamSourceTags(currentTeamId!)}
              assignedTagIds={sourceService.getSourceTagsById(source.id).map(t => t.id)}
              onChanged={() => forceTagUpdate(n => n + 1)}
            />
          </div>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap w-full sm:w-auto">
          <Button
            variant="outline"
            disabled={isScanning || !localIsActive}
            onClick={handleScan}
          >
            {isScanning ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Сканирую...
              </>
            ) : (
              <>
                <RefreshCw className="size-4 mr-2" />
                {source.type === "telegram" ? "Получить" : "Сканировать"}
              </>
            )}
          </Button>
          {localIsActive ? (
            showPauseConfirm ? (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-amber-600 border-amber-300 bg-amber-50 hover:bg-amber-100"
                  onClick={async () => {
                    await sourceService.pauseSource(source.id, currentTeamId!);
                    setLocalIsActive(false);
                    setShowPauseConfirm(false);
                    toast.success("Источник остановлен");
                  }}
                >
                  Да, остановить
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPauseConfirm(false)}
                >
                  Отмена
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="text-amber-600 border-amber-200 hover:bg-amber-50"
                onClick={() => setShowPauseConfirm(true)}
              >
                <Pause className="size-4 mr-2" />
                Остановить
              </Button>
            )
          ) : (
            <Button
              variant="outline"
              className="text-green-600 border-green-200 hover:bg-green-50"
              onClick={async () => {
                await sourceService.resumeSource(source.id, currentTeamId!);
                setLocalIsActive(true);
                toast.success("Источник включён");
              }}
            >
              <Play className="size-4 mr-2" />
              Включить
            </Button>
          )}
        </div>
      </div>

      {/* Scanning indicator */}
      {isScanning && (
        <div className="flex items-center gap-2.5 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2.5">
          <Loader2 className="size-4 text-blue-500 animate-spin shrink-0" />
          <span className="text-sm text-blue-800">
            {source.type === "telegram" ? "Получение постов" : "Сканирование"}...
          </span>
          <span className="text-xs text-blue-400 ml-auto truncate">{source.url}</span>
        </div>
      )}

      {/* Inactive banner */}
      {!localIsActive && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm bg-amber-50 text-amber-800 border border-amber-200">
          <div className="flex items-center gap-2.5">
            <Pause className="size-4 shrink-0" />
            <span>Источник остановлен — сбор контента приостановлен</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 text-green-600 border-green-300 hover:bg-green-50"
            onClick={async () => { await sourceService.resumeSource(source.id, currentTeamId!); setLocalIsActive(true); toast.success("Источник включён"); }}
          >
            <Play className="size-3.5 mr-1.5" />
            Включить
          </Button>
        </div>
      )}

      {/* Error banner */}
      {source.lastError && (
        <div className="flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{source.lastError}</span>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="overflow-hidden">
          <div className="px-5 pt-4 pb-1 flex items-center gap-2">
            <div className="size-7 rounded-md bg-blue-50 flex items-center justify-center">
              <FileText className="size-3.5 text-blue-500" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Материалов собрано</span>
          </div>
          <CardContent className="pt-3 pb-4">
            <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
              {[
                { label: "Сегодня", value: source.itemsCount24h },
                { label: "Неделя",  value: source.itemsCountWeek },
                { label: "Месяц",   value: source.itemsCountMonth },
                { label: "Всего",   value: source.itemsCount },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col items-center justify-center py-3 px-2 bg-white hover:bg-gray-50 transition-colors">
                  <span className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{value}</span>
                  <span className="text-xs text-gray-400 mt-1">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="px-5 pt-4 pb-1 flex items-center gap-2">
            <div className="size-7 rounded-md bg-green-50 flex items-center justify-center">
              <Newspaper className="size-3.5 text-green-500" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Публикаций из источника</span>
          </div>
          <CardContent className="pt-3 pb-4">
            <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
              {[
                { label: "Сегодня", value: pubsToday },
                { label: "Неделя",  value: pubsWeek },
                { label: "Всего",   value: publishedFromSource.length },
                { label: "Задач",   value: sourceJobs.length },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col items-center justify-center py-3 px-2 bg-white hover:bg-gray-50 transition-colors">
                  <span className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{value}</span>
                  <span className="text-xs text-gray-400 mt-1">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded-md bg-gray-50 flex items-center justify-center shrink-0">
                <Clock className="size-3.5 text-gray-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Последнее обновление</p>
                <p className="text-sm font-medium text-gray-800">
                  {source.lastFetchedAt
                    ? new Date(source.lastFetchedAt).toLocaleString("ru-RU", {
                        day: "numeric", month: "short",
                        hour: "2-digit", minute: "2-digit",
                      })
                    : "Никогда"}
                </p>
              </div>
            </div>
            {linkedChannels.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs text-gray-400 mb-2">
                  Привязан к {linkedChannels.length === 1 ? "каналу" : "каналам"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {linkedChannels.map(ch => (
                    <Link key={ch.id} to={`/channels/${ch.id}`}>
                      <Badge variant="outline" className="text-xs font-normal hover:border-blue-400 hover:text-blue-600 transition-colors">
                        {ch.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {linkedChannels.length === 0 && (
              <div className="border-t pt-3">
                <p className="text-xs text-gray-400">Не привязан ни к одному каналу</p>
                <Link to="/channels" className="text-xs text-blue-500 hover:underline">
                  Перейти к каналам →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="items" className="space-y-5">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="w-max sm:w-fit">
            <TabsTrigger value="items" className="gap-1.5">
              <FileText className="size-3.5" />
              Контент
              {sourceItems.length > 0 && (
                <span className="ml-1 bg-gray-200 text-gray-600 text-xs rounded-full px-1.5 py-0 leading-5">
                  {sourceItems.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="published" className="gap-1.5">
              <Newspaper className="size-3.5" />
              Публикации
              {publishedFromSource.length > 0 && (
                <span className="ml-1 bg-gray-200 text-gray-600 text-xs rounded-full px-1.5 py-0 leading-5">
                  {publishedFromSource.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-1.5">
              <Activity className="size-3.5" />
              Задачи
              {sourceJobs.length > 0 && (
                <span className="ml-1 bg-gray-200 text-gray-600 text-xs rounded-full px-1.5 py-0 leading-5">
                  {sourceJobs.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="actions" className="gap-1.5">
              <Settings className="size-3.5" />
              Настройка
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ═════════════════════════════════════════════
            КОНТЕНТ
        ═════════════════��════════════════════════════ */}
        <TabsContent value="items" className="space-y-4">
          {/* Filter bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="size-3.5 text-gray-400" />
                <div className="flex items-center gap-1">
                  {itemPublishFilterOptions.map(({ value, label, count }) => (
                    <button
                      key={value}
                      onClick={() => handleItemPublishFilter(value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                        itemPublishFilter === value
                          ? "bg-gray-900 text-white"
                          : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                      }`}
                    >
                      {label}
                      <span className={`text-xs tabular-nums ${itemPublishFilter === value ? "text-gray-300" : "text-gray-400"}`}>
                        {count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-5 w-px bg-gray-200" />
              <PeriodPicker value={itemDateFilter} onChange={handleItemDateFilter} />
            </div>
            {(itemPublishFilter !== "all" || itemDateFilter !== undefined) && (
              <button
                onClick={() => { setItemPublishFilter("all"); setItemDateFilter(undefined); setItemsPage(1); }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Сбросить
              </button>
            )}
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-lg border bg-white py-12 text-center text-gray-400">
              <FileText className="size-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">
                {sourceItems.length === 0
                  ? "Материалы пока не собраны — запустите получение"
                  : "Нет материалов с выбранным фильтром"}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border divide-y">
              {pageItems.map((item) => {
                const pubs = getPublicationsForItem(item.id);
                const isPublished = pubs.length > 0;
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 px-4 py-4 hover:bg-gray-50/80 transition-colors cursor-pointer"
                    onClick={() => navigate(`/items/${item.id}`)}
                  >
                    {item.mediaUrl && (
                      <img src={item.mediaUrl} alt="" className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <h3 className="font-medium text-sm text-gray-900 leading-snug line-clamp-1">{item.title}</h3>
                        {isPublished ? (
                          <Badge variant="default" className="text-xs flex-shrink-0 gap-1">
                            <CheckCircle className="size-3" />
                            {pubs.length > 1 ? `${pubs.length} канала` : "Опубликован"}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs flex-shrink-0">Не опубликован</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-2">{item.content}</p>
                      {pubs.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {pubs.map(pub => (
                            <Link
                              key={pub.id}
                              to={`/channels/${pub.channelId}`}
                              className="inline-flex items-center gap-1 text-xs bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 rounded-md hover:bg-green-100 transition-colors"
                              onClick={e => e.stopPropagation()}
                            >
                              → {pub.channelName}
                            </Link>
                          ))}
                        </div>
                      )}
                      <span className="text-xs text-gray-400 tabular-nums">
                        {new Date(item.extractedAt).toLocaleString("ru-RU", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Pagination
            currentPage={itemsPage}
            totalPages={itemsTotalPages}
            onPageChange={setItemsPage}
            totalItems={itemsTotal}
            pageSize={ITEMS_PAGE_SIZE}
          />
        </TabsContent>

        {/* ══════════════════════════════════════════════
            ПУБЛИКАЦИИ
        ══════════════════════════════════════════════ */}
        <TabsContent value="published" className="space-y-4">
          {/* Filter bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <Filter className="size-3.5 text-gray-400" />
              {pubChannelOptions.length > 0 && (
                <Select value={pubsChannelFilter} onValueChange={handlePubsChannelFilter}>
                  <SelectTrigger className="h-8 w-44 text-sm">
                    <SelectValue placeholder="Все каналы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все каналы</SelectItem>
                    {pubChannelOptions.map(([id, name]) => (
                      <SelectItem key={id} value={id}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="h-5 w-px bg-gray-200" />
              <PeriodPicker value={pubsDateFilter} onChange={handlePubsDateFilter} />
            </div>
            {(pubsChannelFilter !== "all" || pubsDateFilter !== undefined) && (
              <button
                onClick={() => { setPubsChannelFilter("all"); setPubsDateFilter(undefined); setPublishedPage(1); }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Сбросить
              </button>
            )}
          </div>

          {filteredPubs.length === 0 ? (
            <div className="rounded-lg border bg-white py-12 text-center text-gray-400">
              <Newspaper className="size-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">
                {publishedFromSource.length === 0
                  ? "Посты из этого источника ещё не публиковались"
                  : "Нет публикаций с выбранным фильтром"}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border divide-y">
              {pagePublished.map((pi) => (
                <div key={pi.id} className="px-4 py-4 space-y-3">
                  {/* Row header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="default" className="text-xs gap-1">
                          <CheckCircle className="size-3" />
                          {pi.channelName}
                        </Badge>
                        <span className="text-xs text-gray-400 tabular-nums">
                          {new Date(pi.postedAt).toLocaleString("ru-RU", {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                        {pi.views !== undefined && (
                          <>
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Eye className="size-3" />{pi.views?.toLocaleString("ru-RU") ?? "—"}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Heart className="size-3" />{pi.reactions?.toLocaleString("ru-RU") ?? "—"}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 italic line-clamp-1">{pi.itemTitle}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0 flex-wrap">
                      <Link to={`/channels/${pi.channelId}`} onClick={e => e.stopPropagation()}>
                        <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
                          <ExternalLink className="size-3" />Канал
                        </Button>
                      </Link>
                      <Link to={`/jobs/${pi.jobId}`} onClick={e => e.stopPropagation()}>
                        <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
                          <ExternalLink className="size-3" />Job
                        </Button>
                      </Link>
                      {pi.llmTraceId && (
                        <Link to={`/llm-traces/${pi.llmTraceId}`} onClick={e => e.stopPropagation()}>
                          <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
                            <ExternalLink className="size-3" />LLM
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                  {/* Media + Generated content */}
                  {pi.mediaUrl && (
                    <img
                      src={pi.mediaUrl}
                      alt=""
                      className="w-full max-h-64 object-cover rounded-lg"
                    />
                  )}
                  <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {pi.generatedContent}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Pagination
            currentPage={publishedPage}
            totalPages={publishedTotalPages}
            onPageChange={setPublishedPage}
            totalItems={publishedTotal}
            pageSize={PUBLISHED_PAGE_SIZE}
          />
        </TabsContent>

        {/* ══════════════════════════════════════════════
            ЗАДАЧИ
        ══════���══════��════════════════════════════════ */}
        <TabsContent value="jobs" className="space-y-4">
          {/* Filter bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="size-3.5 text-gray-400" />
                <div className="flex items-center gap-1">
                  {jobStatusOptions.map(({ value, label }) => {
                    const cnt = value === "all" ? sourceJobs.length : (jobStatusCounts[value] ?? 0);
                    if (value !== "all" && cnt === 0) return null;
                    return (
                      <button
                        key={value}
                        onClick={() => handleJobStatusFilter(value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                          jobStatusFilter === value
                            ? "bg-gray-900 text-white"
                            : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                        }`}
                      >
                        {label}
                        <span className={`text-xs tabular-nums ${jobStatusFilter === value ? "text-gray-300" : "text-gray-400"}`}>
                          {cnt}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="h-5 w-px bg-gray-200" />
              <PeriodPicker value={jobDateFilter} onChange={handleJobDateFilter} />
            </div>
            {(jobStatusFilter !== "all" || jobDateFilter !== undefined) && (
              <button
                onClick={() => { setJobStatusFilter("all"); setJobDateFilter(undefined); setJobsPage(1); }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Сбросить
              </button>
            )}
          </div>

          {filteredJobs.length === 0 ? (
            <div className="rounded-lg border bg-white py-12 text-center text-gray-400">
              <Activity className="size-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">
                {sourceJobs.length === 0 ? "Заач не найдено" : "Нет задач с выбранным фильтром"}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border divide-y">
              {pageJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-gray-50/80 transition-colors cursor-pointer"
                  onClick={() => navigate(`/jobs/${job.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-medium text-sm text-gray-900">
                        {job.type.replace(/_/g, " ")}
                      </span>
                      <JobStatusBadge status={job.status} />
                    </div>
                    <span className="text-xs text-gray-400 tabular-nums">
                      {new Date(job.createdAt).toLocaleString("ru-RU", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <ChevronRight className="size-4 text-gray-300 shrink-0" />
                </div>
              ))}
            </div>
          )}

          <Pagination
            currentPage={jobsPage}
            totalPages={jobsTotalPages}
            onPageChange={setJobsPage}
            totalItems={jobsTotal}
            pageSize={JOBS_PAGE_SIZE}
          />
        </TabsContent>

        {/* ════════��═════════════════════════════════════
            НАСТРОЙКА
        ══════════════════════════════════════════════ */}
        <TabsContent value="actions" className="space-y-5">

            {/* ── Current config ── */}
            {(source.type === "website" || source.type === "rss") && (
            <>
            <div>
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                {source.type === "website" ? <Globe className="size-4 text-purple-500" /> : <Rss className="size-4 text-orange-500" />}
                Текущая конфигурация
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {source.type === "website"
                  ? "CSS-селекторы, сгенерированные AI-агентом для извлечения контента"
                  : "Параметры подключения к RSS/Atom ленте"
                }
              </p>
            </div>

            {/* ОБНОВЛЕНО: config берётся из source.activeConfigJson */}
            {source.type === "website" && (
              <Card>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Конфигурация парсера</span>
                  </div>
                  {source.activeConfigJson ? (
                    <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-purple-600 shrink-0 min-w-[140px]">kind:</span>
                        <span className="text-gray-700">{source.activeConfigJson.kind}</span>
                      </div>
                      {source.activeConfigJson.kind === 'website_full' && (
                        <>
                          {source.activeConfigJson.list.itemSelectors.map((sel, i) => (
                            <div key={`list-${i}`} className="flex items-start gap-2">
                              <span className="text-purple-600 shrink-0 min-w-[140px]">list.itemSelectors[{i}]:</span>
                              <span className="text-gray-700 break-all">{sel}</span>
                            </div>
                          ))}
                          {source.activeConfigJson.list.linkSelectors.map((sel, i) => (
                            <div key={`link-${i}`} className="flex items-start gap-2">
                              <span className="text-purple-600 shrink-0 min-w-[140px]">list.linkSelectors[{i}]:</span>
                              <span className="text-gray-700 break-all">{sel}</span>
                            </div>
                          ))}
                        </>
                      )}
                      {source.activeConfigJson.article.titleSelectors.map((sel, i) => (
                        <div key={`title-${i}`} className="flex items-start gap-2">
                          <span className="text-purple-600 shrink-0 min-w-[140px]">article.titleSelectors[{i}]:</span>
                          <span className="text-gray-700 break-all">{sel}</span>
                        </div>
                      ))}
                      {source.activeConfigJson.article.contentSelectors.map((sel, i) => (
                        <div key={`content-${i}`} className="flex items-start gap-2">
                          <span className="text-purple-600 shrink-0 min-w-[140px]">article.contentSelectors[{i}]:</span>
                          <span className="text-gray-700 break-all">{sel}</span>
                        </div>
                      ))}
                      <div className="flex items-start gap-2">
                        <span className="text-purple-600 shrink-0 min-w-[140px]">quality.minContentChars:</span>
                        <span className="text-gray-700">{source.activeConfigJson.quality.minContentChars}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-700">
                      Конфигурация не настроена. Запустите AI-агента для автоматической настройки.
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
                    <span>Onboarded: {source.lastOnboardedAt ? new Date(source.lastOnboardedAt).toLocaleDateString("ru-RU") : "—"}</span>
                    <span>·</span>
                    <span>Последний парсинг: {source.lastFetchedAt ? new Date(source.lastFetchedAt).toLocaleDateString("ru-RU") : "—"}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ══ RSS: Feed parameters + hybrid blocks ══ */}
            {source.type === "rss" && (
              <>
                {/* ── Feed meta card ── */}
                <Card>
                  <CardContent className="py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Параметры ленты</span>
                      <div className="flex items-center gap-2">
                        {source.rssMode === 'feed_with_article_agent' ? (
                          <Badge variant="outline" className="text-[10px] border-purple-300 text-purple-600">
                            <Bot className="size-3 mr-0.5" /> RSS + HTML
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600">
                            <Rss className="size-3 mr-0.5" /> Feed only
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] border-green-300 text-green-600">
                          <CheckCircle className="size-3 mr-0.5" /> Активна
                        </Badge>
                      </div>
                    </div>



                    <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs space-y-2">
                      {[
                        { key: "feedUrl", value: source.url },
                        { key: "rssMode", value: source.rssMode === 'feed_with_article_agent' ? 'feed_with_article_agent' : 'feed_only' },
                        { key: "format", value: source.url.includes("atom") ? "Atom 1.0" : "RSS 2.0" },
                        { key: "etag", value: source.etag || "—" },
                        { key: "lastModified", value: source.lastModified || "—" },
                      ].map(({ key, value }) => (
                        <div key={key} className="flex items-start gap-2">
                          <span className="text-orange-600 shrink-0 min-w-[150px]">{key}:</span>
                          <span className="text-gray-700 break-all">{value}</span>
                        </div>
                      ))}
                      {source.rssMode === 'feed_with_article_agent' && source.rssArticleConfig && (
                        <>
                          <div className="border-t border-gray-200 my-1" />
                          <div className="flex items-start gap-2">
                            <span className="text-purple-600 shrink-0 min-w-[150px]">minFeedContentChars:</span>
                            <span className="text-gray-700">{source.rssArticleConfig.rssFallbackPolicy.minFeedContentChars}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-purple-600 shrink-0 min-w-[150px]">preferFeedWhenFull:</span>
                            <span className="text-gray-700">{source.rssArticleConfig.rssFallbackPolicy.preferFeedWhenFull ? 'true' : 'false'}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
                      <span>Добавлено: {new Date(source.createdAt).toLocaleDateString("ru-RU")}</span>
                      <span>·</span>
                      <span>Последний фетч: {source.lastFetchedAt ? new Date(source.lastFetchedAt).toLocaleDateString("ru-RU") : "—"}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* ── Article parser config (hybrid only) ── */}
                {source.rssMode === 'feed_with_article_agent' && source.rssArticleConfig && (
                  <Card>
                    <CardContent className="py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Bot className="size-3.5 text-purple-500" />
                          Article parser config
                        </span>
                      </div>

                      <div className="bg-purple-50 rounded-lg p-3 font-mono text-xs space-y-2 border border-purple-100">
                        <div className="text-purple-700 font-medium text-[11px] mb-1">rss_article_only</div>
                        {source.rssArticleConfig.article.titleSelectors.map((sel, i) => (
                          <div key={`rss-title-${i}`} className="flex items-start gap-2">
                            <span className="text-purple-600 shrink-0 min-w-[150px]">titleSelectors[{i}]:</span>
                            <span className="text-gray-700 break-all">{sel}</span>
                          </div>
                        ))}
                        {source.rssArticleConfig.article.contentSelectors.map((sel, i) => (
                          <div key={`rss-content-${i}`} className="flex items-start gap-2">
                            <span className="text-purple-600 shrink-0 min-w-[150px]">contentSelectors[{i}]:</span>
                            <span className="text-gray-700 break-all">{sel}</span>
                          </div>
                        ))}
                        {source.rssArticleConfig.article.dateSelectors.map((sel, i) => (
                          <div key={`rss-date-${i}`} className="flex items-start gap-2">
                            <span className="text-purple-600 shrink-0 min-w-[150px]">dateSelectors[{i}]:</span>
                            <span className="text-gray-700 break-all">{sel}</span>
                          </div>
                        ))}
                        {source.rssArticleConfig.article.mediaSelectors?.map((sel, i) => (
                          <div key={`rss-media-${i}`} className="flex items-start gap-2">
                            <span className="text-purple-600 shrink-0 min-w-[150px]">mediaSelectors[{i}]:</span>
                            <span className="text-gray-700 break-all">{sel}</span>
                          </div>
                        ))}
                        <div className="flex items-start gap-2">
                          <span className="text-purple-600 shrink-0 min-w-[150px]">quality.minChars:</span>
                          <span className="text-gray-700">{source.rssArticleConfig.quality.minContentChars}</span>
                        </div>
                      </div>

                      {source.rssArticleOnboardedAt && (
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span>Onboarded: {new Date(source.rssArticleOnboardedAt).toLocaleDateString("ru-RU")}</span>
                          {source.rssArticleLastOnboardJobId && (
                            <>
                              <span>·</span>
                              <button
                                onClick={() => navigate(`/jobs/${source.rssArticleLastOnboardJobId}`)}
                                className="text-blue-500 hover:underline flex items-center gap-0.5"
                              >
                                Job {source.rssArticleLastOnboardJobId}
                                <ExternalLink className="size-3" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}



                {/* ── Article agent re-onboard (hybrid only) ── */}
                {source.rssMode === 'feed_with_article_agent' && (
                  <>
                    <div className="pt-2">
                      <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <Bot className="size-4 text-purple-500" />
                        Переподключение article-агента
                      </h2>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Перезапустите агент, чтобы обновить конфигурацию парсинга HTML-статей.
                        Текущий конфиг останется активным до подтверждения.
                      </p>
                    </div>

                    <Card>
                      <CardContent className="py-4">
                        {!rssAgentRunning && !rssAgentDone && (
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="font-medium text-sm text-gray-900">Запустить article-агента</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Агент откроет несколько статей из ленты и сгенерирует обновлённый парсер
                              </p>
                            </div>
                            <Button
                              className="shrink-0"
                              onClick={async () => {
                                setRssAgentRunning(true);
                                setRssAgentDone(false);
                                setRssAgentNewConfig(null);
                                const result = await sourceService.reonboardRssArticle(source.id, currentTeamId!);
                                if (result.ok) setRssAgentJob(result.data);
                                setTimeout(() => {
                                  const currentVer = source.rssArticleConfig?.version ?? 0;
                                  setRssAgentRunning(false);
                                  setRssAgentDone(true);
                                  setRssAgentNewConfig({
                                    kind: 'rss_article_only',
                                    version: currentVer + 1,
                                    article: {
                                      titleSelectors: ['h1.entry-title', "meta[property='og:title']"],
                                      contentSelectors: ['div.entry-content', 'article .post-body'],
                                      dateSelectors: ['time[datetime]', "meta[property='article:published_time']"],
                                      mediaSelectors: ["meta[property='og:image']", 'figure.hero-image img'],
                                      idSelectors: ["meta[name='article:id']", 'article[data-post-id]'],
                                      canonicalSelectors: ["link[rel='canonical']", "meta[property='og:url']"],
                                    },
                                    quality: { minContentChars: 400 },
                                    rssFallbackPolicy: {
                                      minFeedContentChars: source.rssArticleConfig?.rssFallbackPolicy.minFeedContentChars ?? 700,
                                      preferFeedWhenFull: source.rssArticleConfig?.rssFallbackPolicy.preferFeedWhenFull ?? true,
                                    },
                                  });
                                }, 8000);
                              }}
                            >
                              <Bot className="size-4 mr-1.5" />
                              Запустить
                            </Button>
                          </div>
                        )}

                        {rssAgentRunning && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <Loader2 className="size-5 text-purple-500 animate-spin shrink-0" />
                              <div>
                                <p className="font-medium text-sm text-gray-900">Агент анализирует статьи...</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {rssAgentJob ? `Job ${rssAgentJob.id} · займёт несколько секунд` : "Это займёт несколько секунд"}
                                </p>
                              </div>
                            </div>
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-purple-500 rounded-full animate-pulse" style={{ width: "60%" }} />
                            </div>
                          </div>
                        )}

                        {rssAgentDone && rssAgentNewConfig && (() => {
                          const flatRssCfg = (cfg: RssArticleOnlyConfig): [string, string][] => {
                            const e: [string, string][] = [];
                            e.push(['kind', cfg.kind]);
                            e.push(['version', String(cfg.version)]);
                            cfg.article.titleSelectors.forEach((s, i) => e.push([`article.titleSelectors[${i}]`, s]));
                            cfg.article.contentSelectors.forEach((s, i) => e.push([`article.contentSelectors[${i}]`, s]));
                            cfg.article.dateSelectors.forEach((s, i) => e.push([`article.dateSelectors[${i}]`, s]));
                            e.push(['quality.minContentChars', String(cfg.quality.minContentChars)]);
                            e.push(['rssFallback.minFeedContentChars', String(cfg.rssFallbackPolicy.minFeedContentChars)]);
                            return e;
                          };
                          const curEntries = source.rssArticleConfig ? flatRssCfg(source.rssArticleConfig) : [];
                          const newEntries = flatRssCfg(rssAgentNewConfig);
                          const curMap = new Map(curEntries);
                          const newMap = new Map(newEntries);
                          const allKeys = Array.from(new Set([...curEntries.map(([k]) => k), ...newEntries.map(([k]) => k)]));
                          return (
                            <div className="space-y-4">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="size-4 text-green-500" />
                                <p className="font-medium text-sm text-gray-900">
                                  Новая конфигурация article-парсера готова
                                  {rssAgentJob && <span className="text-gray-400 ml-2 text-xs font-normal">Job {rssAgentJob.id}</span>}
                                </p>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <div>
                                  <div className="text-xs font-medium text-gray-500 mb-1.5">Текущий конфиг</div>
                                  <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs space-y-1.5 border">
                                    {curEntries.length === 0 ? (
                                      <span className="text-gray-400 italic">Конфиг отсутствует</span>
                                    ) : allKeys.map((key) => {
                                      const val = curMap.get(key);
                                      if (!val) return null;
                                      const changed = val !== newMap.get(key);
                                      return (
                                        <div key={key} className={`flex items-start gap-1 ${changed ? "text-red-400 line-through" : "text-gray-500"}`}>
                                          <span className="shrink-0 min-w-[180px]">{key}:</span>
                                          <span className="break-all">{val}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-gray-500 mb-1.5">Новый конфиг</div>
                                  <div className="bg-purple-50 rounded-lg p-3 font-mono text-xs space-y-1.5 border border-purple-200">
                                    {allKeys.map((key) => {
                                      const val = newMap.get(key);
                                      if (!val) return null;
                                      const changed = val !== curMap.get(key);
                                      return (
                                        <div key={key} className={`flex items-start gap-1 ${changed ? "text-purple-700 font-medium" : "text-gray-500"}`}>
                                          <span className="shrink-0 min-w-[180px]">{key}:</span>
                                          <span className="break-all">{val}</span>
                                          {changed && <span className="text-green-600 shrink-0 ml-auto">NEW</span>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 pt-1">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const r = sourceService.applySourceRssConfig(source.id, currentTeamId!, rssAgentNewConfig);
                                    if (!r.ok) { toast.error(r.error); return; }
                                    setRssAgentDone(false);
                                    setRssAgentNewConfig(null);
                                    setRssAgentJob(null);
                                    toast.success("Конфигурация article-парсера обновлена");
                                  }}
                                >
                                  <CheckCircle className="size-3.5 mr-1.5" />
                                  Применить новый
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setRssAgentDone(false);
                                    setRssAgentNewConfig(null);
                                    setRssAgentJob(null);
                                    toast("Конфигурация не изменена");
                                  }}
                                >
                                  Оставить текущий
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    setRssAgentRunning(true);
                                    setRssAgentDone(false);
                                    setRssAgentNewConfig(null);
                                    const result = await sourceService.reonboardRssArticle(source.id, currentTeamId!);
                                    if (result.ok) setRssAgentJob(result.data);
                                    setTimeout(() => {
                                      const currentVer = source.rssArticleConfig?.version ?? 0;
                                      setRssAgentRunning(false);
                                      setRssAgentDone(true);
                                      setRssAgentNewConfig({
                                        kind: 'rss_article_only',
                                        version: currentVer + 1,
                                        article: {
                                          titleSelectors: ['h1', "meta[property='og:title']"],
                                          contentSelectors: ['main article', '.post-body'],
                                          dateSelectors: ['time[datetime]'],
                                          mediaSelectors: ["meta[property='og:image']"],
                                          idSelectors: ['article[data-id]'],
                                          canonicalSelectors: ["link[rel='canonical']"],
                                        },
                                        quality: { minContentChars: 300 },
                                        rssFallbackPolicy: {
                                          minFeedContentChars: source.rssArticleConfig?.rssFallbackPolicy.minFeedContentChars ?? 700,
                                          preferFeedWhenFull: source.rssArticleConfig?.rssFallbackPolicy.preferFeedWhenFull ?? true,
                                        },
                                      });
                                    }, 8000);
                                  }}
                                >
                                  <RefreshCw className="size-3.5 mr-1.5" />
                                  Запустить ещё раз
                                </Button>
                              </div>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </>
                )}
              </>
            )}

            {/* ── Agent re-run (website) ── */}
            {source.type === "website" && (
              <>
                <div className="pt-2">
                  <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <Bot className="size-4 text-purple-500" />
                    Переподключение агента
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Запустите агент заново, чтобы получить обновлённую конфигурацию. Текущий конфиг останется до вашего подтверждения.
                  </p>
                </div>

                <Card>
                  <CardContent className="py-4">
                    {!agentRunning && !agentDone && (
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-sm text-gray-900">Запустить AI-агента</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Агент проанализирует текущую структуру сайта и предложит новый конфиг
                          </p>
                        </div>
                        <Button
                          className="shrink-0"
                          onClick={async () => {
                            setAgentRunning(true);
                            setAgentDone(false);
                            setAgentNewConfig(null);
                            const result = await sourceService.reonboardSource(source.id, currentTeamId!);
                            if (result.ok) setAgentJob(result.data);
                            setTimeout(() => {
                              const currentVer = source.activeConfigJson?.kind === 'website_full'
                                ? source.activeConfigJson.version : 0;
                              setAgentRunning(false);
                              setAgentDone(true);
                              setAgentNewConfig({
                                kind: 'website_full',
                                version: currentVer + 1,
                                list: {
                                  itemSelectors: ['main.feed > article.card', '.articles > .article-item'],
                                  linkSelectors: ['a.card-link[href]'],
                                },
                                article: {
                                  titleSelectors: ['h1.post-title', 'h1.entry-title'],
                                  contentSelectors: ['div.post-content', 'article.content'],
                                  dateSelectors: ['time[datetime]', "meta[property='article:published_time']"],
                                  mediaSelectors: ["meta[property='og:image']", 'article img'],
                                  idSelectors: ["meta[name='article:id']", 'article[data-id]'],
                                  canonicalSelectors: ["link[rel='canonical']", "meta[property='og:url']"],
                                },
                                quality: { minContentChars: 200 },
                              });
                            }, 8000);
                          }}
                        >
                          <Bot className="size-4 mr-1.5" />
                          Запустить
                        </Button>
                      </div>
                    )}

                    {agentRunning && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Loader2 className="size-5 text-purple-500 animate-spin shrink-0" />
                          <div>
                            <p className="font-medium text-sm text-gray-900">Агент анализирует сайт...</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {agentJob ? `Job ${agentJob.id} · это займёт несколько секунд` : "Это займёт несколько секунд"}
                            </p>
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full animate-pulse" style={{ width: "60%" }} />
                        </div>
                      </div>
                    )}

                    {agentDone && agentNewConfig && (() => {
                      // Flatten WebsiteFullConfig → [key, value][] for diff display
                      const flatCfg = (cfg: WebsiteFullConfig): [string, string][] => {
                        const e: [string, string][] = [];
                        e.push(['kind', cfg.kind]);
                        e.push(['version', String(cfg.version)]);
                        cfg.list?.itemSelectors.forEach((s, i) => e.push([`list.itemSelectors[${i}]`, s]));
                        cfg.list?.linkSelectors?.forEach((s, i) => e.push([`list.linkSelectors[${i}]`, s]));
                        cfg.article.titleSelectors.forEach((s, i) => e.push([`article.titleSelectors[${i}]`, s]));
                        cfg.article.contentSelectors.forEach((s, i) => e.push([`article.contentSelectors[${i}]`, s]));
                        e.push(['quality.minContentChars', String(cfg.quality.minContentChars)]);
                        return e;
                      };
                      const currentCfg = source.activeConfigJson?.kind === 'website_full' ? source.activeConfigJson : null;
                      const curEntries = currentCfg ? flatCfg(currentCfg) : [];
                      const newEntries = flatCfg(agentNewConfig);
                      const curMap = new Map(curEntries);
                      const newMap = new Map(newEntries);
                      const allKeys = Array.from(new Set([...curEntries.map(([k]) => k), ...newEntries.map(([k]) => k)]));

                      return (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="size-4 text-green-500" />
                            <p className="font-medium text-sm text-gray-900">
                              Новая конфигурация готова
                              {agentJob && <span className="text-gray-400 ml-2 text-xs font-normal">Job {agentJob.id}</span>}
                            </p>
                          </div>

                          {/* Config diff */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs font-medium text-gray-500 mb-1.5">Текущий конфиг</div>
                              <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs space-y-1.5 border">
                                {curEntries.length === 0 ? (
                                  <span className="text-gray-400 italic">Конфиг отсутствует</span>
                                ) : allKeys.map((key) => {
                                  const val = curMap.get(key);
                                  if (!val) return null;
                                  const changed = val !== newMap.get(key);
                                  return (
                                    <div key={key} className={`flex items-start gap-1 ${changed ? "text-red-400 line-through" : "text-gray-500"}`}>
                                      <span className="shrink-0 min-w-[160px]">{key}:</span>
                                      <span className="break-all">{val}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-gray-500 mb-1.5">Новый конфиг</div>
                              <div className="bg-purple-50 rounded-lg p-3 font-mono text-xs space-y-1.5 border border-purple-200">
                                {allKeys.map((key) => {
                                  const val = newMap.get(key);
                                  if (!val) return null;
                                  const changed = val !== curMap.get(key);
                                  return (
                                    <div key={key} className={`flex items-start gap-1 ${changed ? "text-purple-700 font-medium" : "text-gray-500"}`}>
                                      <span className="shrink-0 min-w-[160px]">{key}:</span>
                                      <span className="break-all">{val}</span>
                                      {changed && <span className="text-green-600 shrink-0 ml-auto">NEW</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Sample articles from new config */}
                          <div>
                            <div className="text-xs font-medium text-gray-500 mb-2">Найдено статей с новым конфигом</div>
                            <div className="border rounded-lg divide-y">
                              {AGENT_SAMPLE_ARTICLES.map((article, i) => (
                                <AgentArticleCard key={i} article={article} />
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              size="sm"
                              onClick={() => {
                                const r = sourceService.applySourceConfig(source.id, currentTeamId!, agentNewConfig);
                                if (!r.ok) { toast.error(r.error); return; }
                                setAgentDone(false);
                                setAgentNewConfig(null);
                                setAgentJob(null);
                                toast.success("Конфигурация обновлена");
                              }}
                            >
                              <CheckCircle className="size-3.5 mr-1.5" />
                              Применить новый
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setAgentDone(false);
                                setAgentNewConfig(null);
                                setAgentJob(null);
                                toast("Конфигурация не изменена");
                              }}
                            >
                              Оставить текущий
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setAgentRunning(true);
                                setAgentDone(false);
                                setAgentNewConfig(null);
                                sourceService.reonboardSource(source.id, currentTeamId!).then(r => { if (r.ok) setAgentJob(r.data); });
                                // агент запущен через .then выше
                                setTimeout(() => {
                                  const currentVer = source.activeConfigJson?.kind === 'website_full'
                                    ? source.activeConfigJson.version : 0;
                                  setAgentRunning(false);
                                  setAgentDone(true);
                                  setAgentNewConfig({
                                    kind: 'website_full',
                                    version: currentVer + 1,
                                    list: {
                                      itemSelectors: ['section.posts > div.post-item'],
                                      linkSelectors: ['a.post-link'],
                                    },
                                    article: {
                                      titleSelectors: ['h1.entry-title'],
                                      contentSelectors: ['div.entry-content'],
                                      dateSelectors: ['time[datetime]', "meta[property='article:published_time']"],
                                      mediaSelectors: ["meta[property='og:image']", 'figure img'],
                                      idSelectors: ["meta[name='article:id']", 'article[data-id]'],
                                      canonicalSelectors: ["link[rel='canonical']", "meta[property='og:url']"],
                                    },
                                    quality: { minContentChars: 150 },
                                  });
                                }, 8000);
                              }}
                            >
                              <RefreshCw className="size-3.5 mr-1.5" />
                              Запустить ещё раз
                            </Button>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </>
            )}
            </>
            )}

            {/* ── Telegram settings ── */}
            {source.type === "telegram" && (
              <>
                {/* Error / permissions check */}
                {source.status === "error" && (
                  <Card className="border-amber-200 bg-amber-50/50">
                    <CardContent className="py-4">
                      <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <AlertCircle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-sm text-amber-800">Проблема с доступом</p>
                            <p className="text-xs text-amber-700 mt-0.5">
                              {source.lastError || "Бот не может получить сообщения из канала. Убедитесь, что бот добавлен в канал как администратор с правами на чтение."}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 text-amber-700 border-amber-300 hover:bg-amber-100"
                          disabled={checkingPermissions}
                          onClick={() => {
                            setCheckingPermissions(true);
                            setTimeout(() => {
                              setCheckingPermissions(false);
                              const ok = Math.random() > 0.5;
                              if (ok) {
                                toast.success("Права подтверждены — бот имеет доступ к каналу");
                              } else {
                                toast.error("Бот всё ещё не имеет доступа. Добавьте бота как администратора канала.");
                              }
                            }, 3000);
                          }}
                        >
                          {checkingPermissions ? (
                            <><Loader2 className="size-3.5 mr-1.5 animate-spin" />Проверяю...</>
                          ) : (
                            <><ShieldCheck className="size-3.5 mr-1.5" />Проверить права</>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* ── Danger zone ── */}
            <div className="pt-2">
              <h2 className="text-base font-semibold text-red-600 flex items-center gap-2">
                <AlertCircle className="size-4" />
                Зона риска
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Необратимые действия</p>
            </div>

            <Card className="border-red-200">
              <CardContent className="py-4">
                {!showDeleteConfirm ? (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-sm text-gray-900">Удалить источник</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Все собранные материалы будут сохранены, но новые перестанут поступать
                      </p>
                    </div>
                    <Button variant="destructive" size="sm" className="shrink-0" onClick={() => setShowDeleteConfirm(true)}>
                      Удалить
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm text-red-800">Вы уверены?</p>
                        <p className="text-xs text-red-600 mt-0.5">
                          Источник &laquo;{source.name}&raquo; будет удалён. Собранные материалы сохранятся, но новые поступать не будут. Это действие нельзя отменить.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          await sourceService.deleteSource(source.id, currentTeamId!);
                          toast.success("Источник удалён");
                          navigate("/sources");
                        }}
                      >
                        Да, удалить
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                        Отмена
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
    )}
    </TeamScopeGuard>
  );
}

// ── Small reusable components ─────────────────────────────────────────────────

function StatusDot({ status }: { status: "ok" | "error" | "inactive" }) {
  return (
    <span className={`size-2.5 rounded-full shrink-0 ${
      status === "ok" ? "bg-green-400" : status === "error" ? "bg-red-400" : "bg-gray-400"
    }`} />
  );
}

function SourceStatusBadge({ status }: { status: "ok" | "error" }) {
  if (status === "ok")
    return <Badge variant="default" className="text-xs">OK</Badge>;
  return <Badge variant="destructive" className="text-xs">Ошибка</Badge>;
}

// ── Agent sample articles data ─────────────────────────────────────────────────

interface AgentArticle {
  title: string;
  url: string;
  content: string;
  date: string;
  imageUrl: string;
  charCount: number;
}

const AGENT_SAMPLE_ARTICLES: AgentArticle[] = [
  {
    title: "Стартапы в 2026: тренды и прогнозы венчурного рынка",
    url: "https://example.com/startups-2026",
    date: "28 фев 2026",
    charCount: 1240,
    imageUrl: "https://images.unsplash.com/photo-1758611972271-fce956444233?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNobm9sb2d5JTIwc3RhcnR1cCUyMG5ld3N8ZW58MXx8fHwxNzcyMzY0NTI4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    content: "Венчурный рынок 2026 года демонстрирует устойчивый рост на фоне макроэкономической стабилизации. По данным PitchBook, объём инвестиций в первом квартале вырос на 34% год к году, достигнув $78 млрд. Ключевые тренды — AI-first компании, климатические технологии и deeptech. Особое внимание инвесторов привлекают стартапы в области enterprise AI: автоматизация бизнес-процессов, генеративные инструменты для B2B и вертикальные AI-решения для здравоохранения и финтеха. Средний размер раунда Series A вырос до $18M, что отражает более зрелую экосистему и повышенные ожидания от метрик.",
  },
  {
    title: "Новые модели GPT-5: что изменилось в архитектуре трансформеров",
    url: "https://example.com/gpt5-architecture",
    date: "27 фев 2026",
    charCount: 980,
    imageUrl: "https://images.unsplash.com/photo-1718011087751-e82f1792aa32?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnRpZmljaWFsJTIwaW50ZWxsaWdlbmNlJTIwcmVzZWFyY2h8ZW58MXx8fHwxNzcyMzY0NTI4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    content: "OpenAI представила пятое поколение языковой модели с принципиально новой архитектурой, получившей название Mixture-of-Depths. В отличие от классических трансформеров, где все слои обрабатывают каждый токен, новая архитектура динамически определяет глубину вычислений для каждого токена. Это позволило сократить inference-cost на 40% при сохранении качества. Модель обучена на 15 трлн токенов с использованием synthetic data pipeline и демонстрирует SOTA-результаты на бенчмарках MMLU, HumanEval и BigBench.",
  },
  {
    title: "Обзор уязвимостей: критические CVE за последнюю неделю",
    url: "https://example.com/cve-weekly",
    date: "26 фев 2026",
    charCount: 1580,
    imageUrl: "https://images.unsplash.com/photo-1768224656445-33d078c250b7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjeWJlcnNlY3VyaXR5JTIwZGlnaXRhbHxlbnwxfHx8fDE3NzIzNTQwNjF8MA&ixlib=rb-4.1.0&q=80&w=1080",
    content: "На прошедшей неделе было зарегистрировано 12 критических CVE со score выше 9.0. Наибольшую опасность представляет CVE-2026-1847 — RCE-уязвимость в популярной библиотеке сериализации данных, затрагивающая более 60% проектов на Node.js. Эксплуатация возможна через craft'ированный JSON-payload без аутентификации. Патч уже доступен в версии 4.2.1. Также обнаружена chain of vulnerabilities в Kubernetes RBAC, позволяющая escalation of privileges от pod-level до cluster-admin. Рекомендуется немедленное обновление до K8s 1.31.4.",
  },
  {
    title: "Мультиоблачная инфраструктура: сравнение AWS, GCP и Azure в 2026",
    url: "https://example.com/multicloud-2026",
    date: "25 фев 2026",
    charCount: 2100,
    imageUrl: "https://images.unsplash.com/photo-1744868562210-fffb7fa882d9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbG91ZCUyMGNvbXB1dGluZyUyMHNlcnZlcnxlbnwxfHx8fDE3NzIyNTM4NDJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    content: "Gartner опубликовал ежегодный отчёт по облачным платформам. AWS сохраняет лидерство с долей 31%, но Google Cloud показал наибольший прирост (+4.2 п.п.) благодаря агрессивному позиционированию AI-сервисов и Vertex AI. Azure стабилен на уровне 24%, делая ставку на интеграцию с Microsoft 365 и Copilot Studio. Ключевой тренд года — «AI-native cloud», где платформы конкурируют не столько по базовому compute/storage, сколько по интегрированным AI-инструментам, managed ML pipelines и inference endpoints.",
  },
];

function AgentArticleCard({ article }: { article: AgentArticle }) {
  const [expanded, setExpanded] = useState(false);
  const previewLength = 180;
  const isLong = article.content.length > previewLength;

  return (
    <div className="px-3 py-3">
      <div className="flex gap-3">
        {article.imageUrl && (
          <div className="flex-shrink-0">
            <img src={article.imageUrl} alt="" className="size-16 rounded-lg object-cover bg-gray-100" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <button onClick={() => setExpanded(!expanded)} className="w-full text-left group">
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm text-gray-800">{article.title}</div>
              <div className="flex-shrink-0 mt-0.5 text-gray-300 group-hover:text-gray-500 transition-colors">
                {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-gray-400">{article.date}</span>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-gray-400 tabular-nums">{article.charCount.toLocaleString("ru-RU")} симв.</span>
              {article.imageUrl && (
                <>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="inline-flex items-center gap-0.5 text-xs text-gray-400">
                    <Image className="size-3" /> фото
                  </span>
                </>
              )}
              <span className="text-xs text-gray-300">·</span>
              <span
                className="inline-flex items-center gap-0.5 text-xs text-blue-500 hover:text-blue-700 cursor-pointer hover:underline"
                onClick={(e) => { e.stopPropagation(); window.open(article.url, "_blank"); }}
              >
                <ExternalLink className="size-3" /> источник
              </span>
            </div>
          </button>
          {!expanded && isLong && (
            <div className="mt-1.5 text-xs text-gray-500 leading-relaxed">
              {article.content.slice(0, previewLength)}...
            </div>
          )}
        </div>
      </div>
      {expanded && (
        <div className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3 leading-relaxed whitespace-pre-line">
          {article.imageUrl && (
            <img src={article.imageUrl} alt="" className="w-full h-40 object-cover rounded-lg mb-3" />
          )}
          {article.content}
        </div>
      )}
    </div>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  if (status === "success")
    return <Badge variant="default" className="text-xs">Успех</Badge>;
  if (status === "failed")
    return <Badge variant="destructive" className="text-xs">Ошибка</Badge>;
  if (status === "running")
    return <Badge variant="secondary" className="text-xs text-blue-700 bg-blue-50 border-blue-200">В работе</Badge>;
  if (status === "pending")
    return <Badge variant="secondary" className="text-xs text-gray-600">Ожидает</Badge>;
  return <Badge variant="secondary" className="text-xs">{status}</Badge>;
}