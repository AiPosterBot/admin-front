import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  RefreshCw, Power, AlertCircle, ArrowLeft, ExternalLink,
  CheckCircle, FileText, Newspaper, Activity,
  Settings, Eye, Heart, ChevronRight, Clock, Filter, LayoutDashboard, Database,
  Loader2, Rss, Globe, Bot, Copy, ChevronDown, ChevronUp,
  Pause, Play, Image, Send, ShieldCheck, Save,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { NumericInput } from "../components/ui/numeric-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Pagination } from "../components/Pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import type { Job, RssArticleOnlyConfig, WebsiteFullConfig } from "../types/domain";
import { useTeam } from "../context/TeamContext";
// ── Service + guard layer ─────────────────────────────────────────────
import * as sourceService from "../services/sourceService";
import * as channelService from "../services/channelService";
import * as jobService from "../services/jobService";
import { useTeamItems } from "../hooks/useTeamItems";
import { useTeamPosts } from "../hooks/useTeamPosts";
import { useTeamJobs } from "../hooks/useTeamJobs";
import { useTeamScopedEntity } from "../hooks/useTeamScopedEntity";
import { TeamScopeGuard } from "../components/TeamScopeGuard";
import { TagBadge } from "../components/TagBadge";
import { AssignTagsPopover } from "../components/AssignTagsPopover";
import { PeriodPicker } from "../components/PeriodPicker";
import type { DateRange } from "react-day-picker";
import { useAsync } from "../lib/asyncState";
import { listTeamPosts } from "../services/postService";
import { MediaStatusHint } from "../components/MediaStatusHint";

const ITEMS_PAGE_SIZE     = 8;
const PUBLISHED_PAGE_SIZE = 8;
const JOBS_PAGE_SIZE      = 10;
const OVERVIEW_ITEMS_COUNT = 5;
const OVERVIEW_POSTS_COUNT = 5;

const SOURCE_TYPE_LABEL: Record<string, string> = {
  telegram: "Telegram канал",
  rss:      "RSS лента",
  website:  "Веб-сайт",
};

type ItemPublishFilter = "all" | "published" | "unpublished";
type JobStatusFilter   = "all" | "success" | "failed" | "running" | "pending";
type SourceScanIntervalUnit = "minutes" | "hours";

function startOfDayIso(date?: Date) {
  if (!date) return undefined;
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value.toISOString();
}

function endOfDayIso(date?: Date) {
  if (!date) return undefined;
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value.toISOString();
}

function formatIntervalLabel(value?: number | null) {
  if (!value || !Number.isFinite(value)) return "не задан";
  if (value % 3600 === 0) return `${value / 3600} ч`;
  if (value % 60 === 0) return `${value / 60} мин`;
  return `${value} сек`;
}

function getScanIntervalUnitSeconds(unit: SourceScanIntervalUnit) {
  return unit === "hours" ? 3600 : 60;
}

function getScanIntervalDraftUnit(valueSec: number): SourceScanIntervalUnit {
  return valueSec >= 3600 && valueSec % 3600 === 0 ? "hours" : "minutes";
}

function getScanIntervalDraftAmount(valueSec: number, unit: SourceScanIntervalUnit) {
  const unitSeconds = getScanIntervalUnitSeconds(unit);
  return Math.max(1, Math.ceil(valueSec / unitSeconds));
}

function clampScanIntervalDraftAmount(
  amount: number,
  unit: SourceScanIntervalUnit,
  minSec: number,
  maxSec: number,
) {
  const unitSeconds = getScanIntervalUnitSeconds(unit);
  const minAmount = Math.max(1, Math.ceil(minSec / unitSeconds));
  const maxAmount = Math.max(minAmount, Math.floor(maxSec / unitSeconds));

  return Math.min(Math.max(amount, minAmount), maxAmount);
}

function toScanIntervalSec(
  amount: number,
  unit: SourceScanIntervalUnit,
  minSec: number,
  maxSec: number,
) {
  return clampScanIntervalDraftAmount(amount, unit, minSec, maxSec) * getScanIntervalUnitSeconds(unit);
}

export function SourceDetailPage() {
  const { sourceId } = useParams();
  const { currentTeam, currentTeamId } = useTeam();
  const navigate = useNavigate();
  const team = currentTeam;

  // ── Team scope guard: хук загружает источник через сервис и
  //    автоматически редиректит если он не принадлежит текущей команде ──
  const { state: sourceState, invalidate: invalidateSource } = useTeamScopedEntity(
    () => sourceService.getSourceById(sourceId!, currentTeamId!, { fresh: true }),
    [sourceId, currentTeamId],
    "/sources",
  );

  // ── Pagination state ──────────────────────────────────────────────────
  const [itemsPage,     setItemsPage]     = useState(1);
  const [publishedPage, setPublishedPage] = useState(1);
  const [jobsPage,      setJobsPage]      = useState(1);

  // ── Content tab filters ─────────────────────────────────────────────
  const [itemPublishFilter, setItemPublishFilter] = useState<ItemPublishFilter>("all");
  const [itemDateFilter,    setItemDateFilter]    = useState<DateRange | undefined>();

  // ── Publications tab filters ─────────────────────────────────────────
  const [pubsChannelFilter, setPubsChannelFilter] = useState<string>("all");
  const [pubsDateFilter,    setPubsDateFilter]    = useState<DateRange | undefined>();

  // ── Jobs tab filters ──────────────────────────────────────────────────
  const [jobStatusFilter, setJobStatusFilter] = useState<JobStatusFilter>("all");
  const [jobDateFilter,   setJobDateFilter]   = useState<DateRange | undefined>();
  const [activeTab, setActiveTab] = useState("overview");

  // ── Scanning state ──────────────────────────────────────────────────
  const [isScanning, setIsScanning] = useState(false);

  // ── Active toggle state ────────────────────────────────────────────
  // Инициализируется после загрузки источника через useEffect
  const [localIsActive, setLocalIsActive] = useState(true);
  const [sourceNameDraft, setSourceNameDraft] = useState("");
  const [sourceScanIntervalMode, setSourceScanIntervalMode] = useState<"default" | "custom">("default");
  const [sourceScanIntervalDraft, setSourceScanIntervalDraft] = useState(5);
  const [sourceScanIntervalUnitDraft, setSourceScanIntervalUnitDraft] = useState<SourceScanIntervalUnit>("minutes");
  const [isSavingSourceSettings, setIsSavingSourceSettings] = useState(false);
  const sourceData = sourceState.status === "success" ? sourceState.data : null;

  useEffect(() => {
    if (sourceData) {
      setLocalIsActive(sourceData.isActive);
    }
  }, [sourceData]);

  useEffect(() => {
    if (sourceData) {
      setSourceNameDraft(sourceData.name);
      const fallbackInterval = sourceData.minScanIntervalSec ?? sourceData.effectiveScanIntervalSec ?? 300;
      setSourceScanIntervalMode(sourceData.scanIntervalSec && sourceData.scanIntervalSec > 0 ? "custom" : "default");
      const nextIntervalSec = sourceData.scanIntervalSec ?? sourceData.effectiveScanIntervalSec ?? fallbackInterval;
      const nextUnit = getScanIntervalDraftUnit(nextIntervalSec);
      setSourceScanIntervalUnitDraft(nextUnit);
      setSourceScanIntervalDraft(getScanIntervalDraftAmount(nextIntervalSec, nextUnit));
    }
  }, [sourceData]);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);

  // ── Delete confirmation ─────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Settings tab: agent re-run state ───────────────────────────────
  // agentNewConfig — строго WebsiteFullConfig (proper typed diff)
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentDone, setAgentDone] = useState(false);
  const [agentNewConfig, setAgentNewConfig] = useState<WebsiteFullConfig | null>(null);
  const [agentJob, setAgentJob] = useState<Job | null>(null);
  const [agentStages, setAgentStages] = useState<AgentRuntimeStage[]>([]);
  const [configExpanded, setConfigExpanded] = useState(false);

  // ── RSS article agent re-onboard state ───────────────────────────
  const [rssAgentRunning, setRssAgentRunning] = useState(false);
  const [rssAgentDone, setRssAgentDone] = useState(false);
  const [rssAgentNewConfig, setRssAgentNewConfig] = useState<RssArticleOnlyConfig | null>(null);
  const [rssAgentJob, setRssAgentJob] = useState<Job | null>(null);
  const [rssAgentStages, setRssAgentStages] = useState<AgentRuntimeStage[]>([]);
  const [rssConfigExpanded, setRssConfigExpanded] = useState(false);

  // ── Telegram permissions check ────────────────────────────────────
  const [checkingPermissions, setCheckingPermissions] = useState(false);
  const [, forceTagUpdate] = useState(0);
  const [, setDataVersion] = useState(0);
  const [agentPreviewArticles, setAgentPreviewArticles] = useState<AgentArticle[]>([]);
  const [rssAgentSampleItems, setRssAgentSampleItems] = useState<Array<{ title?: string; url?: string; content?: string; date?: string; imageUrl?: string | null }>>([]);

  const now = new Date();
  const weekAgoDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { state: sourceItemsState, invalidate: invalidateSourceItems } = useTeamItems({
    page: itemsPage,
    limit: ITEMS_PAGE_SIZE,
    sourceId: sourceId,
    published: itemPublishFilter,
    from: startOfDayIso(itemDateFilter?.from),
    to: endOfDayIso(itemDateFilter?.to),
  });
  const { state: sourceItemsSummaryState, invalidate: invalidateSourceItemsSummary } = useTeamItems({
    page: 1,
    limit: 1,
    sourceId: sourceId,
  });
  const { state: overviewItemsState, invalidate: invalidateOverviewItems } = useTeamItems({
    page: 1,
    limit: OVERVIEW_ITEMS_COUNT,
    sourceId: sourceId,
  });
  const { state: sourcePostsState, invalidate: invalidateSourcePosts } = useTeamPosts({
    page: publishedPage,
    limit: PUBLISHED_PAGE_SIZE,
    sourceId: sourceId,
    channelId: pubsChannelFilter !== "all" ? pubsChannelFilter : undefined,
    from: startOfDayIso(pubsDateFilter?.from),
    to: endOfDayIso(pubsDateFilter?.to),
  });
  const { state: sourcePostsSummaryState, invalidate: invalidateSourcePostsSummary } = useTeamPosts({
    page: 1,
    limit: 1,
    sourceId: sourceId,
  });
  const { state: overviewPostsState, invalidate: invalidateOverviewPosts } = useTeamPosts({
    page: 1,
    limit: OVERVIEW_POSTS_COUNT,
    sourceId: sourceId,
  });
  const { state: sourcePostsTodayState, invalidate: invalidateSourcePostsToday } = useTeamPosts({
    page: 1,
    limit: 1,
    sourceId: sourceId,
    from: startOfDayIso(now),
  });
  const { state: sourcePostsWeekState, invalidate: invalidateSourcePostsWeek } = useTeamPosts({
    page: 1,
    limit: 1,
    sourceId: sourceId,
    from: startOfDayIso(weekAgoDate),
  });
  const { state: sourceJobsState, invalidate: invalidateSourceJobs } = useTeamJobs({
    page: jobsPage,
    limit: JOBS_PAGE_SIZE,
    sourceId: sourceId,
    status: jobStatusFilter !== "all" ? jobStatusFilter : undefined,
    from: startOfDayIso(jobDateFilter?.from),
    to: endOfDayIso(jobDateFilter?.to),
  });
  const { state: sourceJobsSummaryState, invalidate: invalidateSourceJobsSummary } = useTeamJobs({
    page: 1,
    limit: 1,
    sourceId: sourceId,
  });

  const refreshSourceData = useCallback(async () => {
    if (!currentTeamId || !sourceId) {
      return;
    }

    await sourceService.getSourceById(sourceId, currentTeamId, { fresh: true });

    invalidateSource();
    invalidateSourceItems();
    invalidateSourceItemsSummary();
    invalidateOverviewItems();
    invalidateSourcePosts();
    invalidateSourcePostsSummary();
    invalidateOverviewPosts();
    invalidateSourcePostsToday();
    invalidateSourcePostsWeek();
    invalidateSourceJobs();
    invalidateSourceJobsSummary();
    invalidateChannelPublicationCounts();
    setDataVersion((version) => version + 1);
  }, [
    currentTeamId,
    invalidateSource,
    invalidateSourceItems,
    invalidateSourceItemsSummary,
    invalidateOverviewItems,
    invalidateSourceJobs,
    invalidateSourceJobsSummary,
    invalidateOverviewPosts,
    invalidateSourcePosts,
    invalidateSourcePostsSummary,
    invalidateSourcePostsToday,
    invalidateSourcePostsWeek,
    sourceId,
  ]);

  const waitForJobCompletion = useCallback(
    async (jobId: string, options: { intervalMs?: number } = {}) => {
      if (!currentTeamId) {
        return null;
      }

      const intervalMs = options.intervalMs ?? 2000;
      while (true) {
        const job = await jobService.getJobById(jobId, currentTeamId);
        if (!job) {
          return null;
        }

        if (["success", "failed", "canceled", "timed_out"].includes(job.status)) {
          return job;
        }

        await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
      }

      return null;
    },
    [currentTeamId],
  );

  const waitForAgentResult = useCallback(
    async (jobId: string, onUpdate?: (job: AgentJobState) => void) => {
      while (true) {
        const job = await sourceService.getSourceAgentJob(jobId);
        onUpdate?.(job);
        if (["success", "failed", "canceled", "timed_out"].includes(job.status)) {
          return job;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 2000));
      }

      return null;
    },
    [],
  );

  const handleScan = useCallback(async () => {
    if (sourceState.status !== "success" || !currentTeamId) return;

    const src = sourceState.data;
    setIsScanning(true);
    const result = await sourceService.scanSourceNow(src.id, currentTeamId);
    if (!result.ok) {
      setIsScanning(false);
      toast.error(result.error);
      return;
    }

    toast.success("Сканирование запущено", { description: `Job ${result.data.id} создан` });
    await refreshSourceData();

    const completedJob = await waitForJobCompletion(result.data.id);
    setIsScanning(false);
    await refreshSourceData();

    if (!completedJob) {
      toast("Сканирование ещё выполняется", {
        description: "Данные на странице продолжат обновляться автоматически.",
      });
      return;
    }

    if (completedJob.status === "success") {
      toast.success("Сканирование завершено", {
        description: `Новых материалов: ${Number((completedJob.result as { newItemsCount?: number } | undefined)?.newItemsCount ?? 0)}`,
      });
      return;
    }

    toast.error(completedJob.error ?? "Сканирование завершилось с ошибкой");
  }, [currentTeamId, refreshSourceData, sourceState, waitForJobCompletion]);

  const handlePauseSource = useCallback(async () => {
    if (sourceState.status !== "success" || !currentTeamId) {
      return;
    }

    const result = await sourceService.pauseSource(sourceState.data.id, currentTeamId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setLocalIsActive(false);
    setShowPauseConfirm(false);
    await refreshSourceData();
    toast.success("Источник остановлен");
  }, [currentTeamId, refreshSourceData, sourceState]);

  const handleResumeSource = useCallback(async () => {
    if (sourceState.status !== "success" || !currentTeamId) {
      return;
    }

    const result = await sourceService.resumeSource(sourceState.data.id, currentTeamId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setLocalIsActive(true);
    await refreshSourceData();
    toast.success("Источник включён");
  }, [currentTeamId, refreshSourceData, sourceState]);

  const handleSaveSourceSettings = useCallback(async () => {
    if (sourceState.status !== "success" || !currentTeamId) {
      return;
    }

    const nextName = sourceNameDraft.trim();
    if (!nextName) {
      toast.error("Введите название источника");
      return;
    }

    const minScanIntervalSec = sourceState.data.minScanIntervalSec ?? sourceState.data.effectiveScanIntervalSec ?? 300;
    const maxScanIntervalSec = sourceState.data.maxScanIntervalSec ?? 86400;
    const nextScanIntervalSec =
      sourceScanIntervalMode === "default"
        ? null
        : toScanIntervalSec(
            sourceScanIntervalDraft,
            sourceScanIntervalUnitDraft,
            minScanIntervalSec,
            maxScanIntervalSec,
          );
    const currentScanIntervalSec = sourceState.data.scanIntervalSec ?? null;

    if (nextName === sourceState.data.name && nextScanIntervalSec === currentScanIntervalSec) {
      return;
    }

    setIsSavingSourceSettings(true);
    const result = await sourceService.updateSourceSettings(sourceState.data.id, currentTeamId, {
      name: nextName,
      scanIntervalSec: nextScanIntervalSec,
    });
    if (!result.ok) {
      setIsSavingSourceSettings(false);
      toast.error(result.error);
      return;
    }

    setSourceNameDraft(result.data.name);
    setSourceScanIntervalMode(result.data.scanIntervalSec && result.data.scanIntervalSec > 0 ? "custom" : "default");
    const nextIntervalSec =
      result.data.scanIntervalSec
      ?? result.data.effectiveScanIntervalSec
      ?? result.data.minScanIntervalSec
      ?? minScanIntervalSec;
    const nextUnit = getScanIntervalDraftUnit(nextIntervalSec);
    setSourceScanIntervalUnitDraft(nextUnit);
    setSourceScanIntervalDraft(getScanIntervalDraftAmount(nextIntervalSec, nextUnit));
    await refreshSourceData();
    setIsSavingSourceSettings(false);
    toast.success("Настройки источника сохранены");
  }, [currentTeamId, refreshSourceData, sourceNameDraft, sourceScanIntervalDraft, sourceScanIntervalMode, sourceScanIntervalUnitDraft, sourceState]);

  const handleRunWebsiteAgent = useCallback(async () => {
    if (sourceState.status !== "success" || !currentTeamId) {
      return;
    }

    setAgentRunning(true);
    setAgentDone(false);
    setAgentNewConfig(null);
    setAgentPreviewArticles([]);
    setAgentStages([]);

    const result = await sourceService.reonboardSource(sourceState.data.id, currentTeamId);
    if (!result.ok) {
      setAgentRunning(false);
      toast.error(result.error);
      return;
    }

    setAgentJob(result.data);
    const finalJob = await waitForAgentResult(result.data.id, (nextJob) => {
      setAgentStages(nextJob.liveStages ?? nextJob.stages ?? []);
    });
    setAgentRunning(false);

    if (!finalJob) {
      toast.error("Не удалось получить результат агента");
      return;
    }

    if (finalJob.status !== "success" || !finalJob.config) {
      toast.error(finalJob.errorText ?? "Агент завершился с ошибкой");
      return;
    }

    setAgentDone(true);
    setAgentNewConfig(finalJob.config as WebsiteFullConfig);
    setAgentPreviewArticles((finalJob.preview?.sampleArticles as AgentArticle[] | undefined) ?? []);
    setAgentStages(finalJob.stages ?? finalJob.liveStages ?? []);
  }, [currentTeamId, sourceState, waitForAgentResult]);

  const handleRunRssAgent = useCallback(async () => {
    if (sourceState.status !== "success" || !currentTeamId) {
      return;
    }

    setRssAgentRunning(true);
    setRssAgentDone(false);
    setRssAgentNewConfig(null);
    setRssAgentSampleItems([]);
    setRssAgentStages([]);

    const result = await sourceService.reonboardRssArticle(sourceState.data.id, currentTeamId);
    if (!result.ok) {
      setRssAgentRunning(false);
      toast.error(result.error);
      return;
    }

    setRssAgentJob(result.data);
    const finalJob = await waitForAgentResult(result.data.id, (nextJob) => {
      setRssAgentStages(nextJob.liveStages ?? nextJob.stages ?? []);
    });
    setRssAgentRunning(false);

    if (!finalJob) {
      toast.error("Не удалось получить результат article-агента");
      return;
    }

    if (finalJob.status !== "success" || !finalJob.config) {
      toast.error(finalJob.errorText ?? "Article-агент завершился с ошибкой");
      return;
    }

    setRssAgentDone(true);
    setRssAgentNewConfig(finalJob.config as RssArticleOnlyConfig);
    setRssAgentSampleItems((finalJob.preview?.sampleItems as Array<{ title?: string; url?: string; content?: string; date?: string; imageUrl?: string | null }> | undefined) ?? []);
    setRssAgentStages(finalJob.stages ?? finalJob.liveStages ?? []);
  }, [currentTeamId, sourceState, waitForAgentResult]);

  const handleApplyWebsiteConfig = useCallback(async () => {
    if (sourceState.status !== "success" || !currentTeamId || !agentNewConfig || !agentJob) {
      return;
    }

    const result = await sourceService.applySourceConfig(sourceState.data.id, currentTeamId, agentJob.id, agentNewConfig);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setAgentDone(false);
    setAgentNewConfig(null);
    setAgentPreviewArticles([]);
    setAgentStages([]);
    setAgentJob(null);
    await refreshSourceData();
    toast.success("Конфигурация обновлена");
  }, [agentJob, agentNewConfig, currentTeamId, refreshSourceData, sourceState]);

  const handleApplyRssConfig = useCallback(async () => {
    if (sourceState.status !== "success" || !currentTeamId || !rssAgentNewConfig || !rssAgentJob) {
      return;
    }

    const result = await sourceService.applySourceRssConfig(sourceState.data.id, currentTeamId, rssAgentJob.id, rssAgentNewConfig);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setRssAgentDone(false);
    setRssAgentNewConfig(null);
    setRssAgentSampleItems([]);
    setRssAgentStages([]);
    setRssAgentJob(null);
    await refreshSourceData();
    toast.success("Конфигурация article-парсера обновлена");
  }, [currentTeamId, refreshSourceData, rssAgentJob, rssAgentNewConfig, sourceState]);

  const handleCheckTelegramPermissions = useCallback(async () => {
    if (sourceState.status !== "success" || !currentTeamId) {
      return;
    }

    setCheckingPermissions(true);
    const result = await sourceService.checkTelegramSourceAccess(sourceState.data.id, currentTeamId);
    setCheckingPermissions(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    await refreshSourceData();
    if (result.data === "ok") {
      toast.success("Доступ подтверждён — userbot может читать этот канал");
      return;
    }

    toast.error("Userbot пока не может читать этот канал. Проверьте username и авторизацию user-account.");
  }, [currentTeamId, refreshSourceData, sourceState]);

  const handleDeleteSource = useCallback(async () => {
    if (sourceState.status !== "success" || !currentTeamId) {
      return;
    }

    const result = await sourceService.deleteSource(sourceState.data.id, currentTeamId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Источник удалён");
    navigate("/sources");
  }, [currentTeamId, navigate, sourceState]);

  if (!team) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Команда не выбрана</h2>
        <p className="text-gray-600 mb-4">Выберите команду, чтобы просмотреть источник.</p>
        <Link to="/sources"><Button>← Вернуться к источникам</Button></Link>
      </div>
    );
  }

  const sourceItemsResult = sourceItemsState.status === "success" ? sourceItemsState.data : null;
  const sourceItemsSummaryResult = sourceItemsSummaryState.status === "success" ? sourceItemsSummaryState.data : null;
  const overviewItemsResult = overviewItemsState.status === "success" ? overviewItemsState.data : null;
  const sourcePostsResult = sourcePostsState.status === "success" ? sourcePostsState.data : null;
  const sourcePostsSummaryResult = sourcePostsSummaryState.status === "success" ? sourcePostsSummaryState.data : null;
  const overviewPostsResult = overviewPostsState.status === "success" ? overviewPostsState.data : null;
  const sourcePostsTodayResult = sourcePostsTodayState.status === "success" ? sourcePostsTodayState.data : null;
  const sourcePostsWeekResult = sourcePostsWeekState.status === "success" ? sourcePostsWeekState.data : null;
  const sourceJobsResult = sourceJobsState.status === "success" ? sourceJobsState.data : null;
  const sourceJobsSummaryResult = sourceJobsSummaryState.status === "success" ? sourceJobsSummaryState.data : null;

  const sourceItems = sourceItemsResult?.data ?? [];
  const overviewItems = overviewItemsResult?.data ?? [];
  const publishedFromSource = sourcePostsResult?.data ?? [];
  const overviewPublished = overviewPostsResult?.data ?? [];
  const sourceJobs = sourceJobsResult?.data ?? [];
  const linkedChannels = sourceService.getChannelsForSource(sourceId!, currentTeamId!);
  const linkedChannelIdsKey = linkedChannels.map((channel) => channel.id).join(",");
  const fetchChannelPublicationTotals = useCallback(async () => {
    if (!currentTeamId || !sourceId || linkedChannels.length === 0) {
      return [];
    }

    const counts = await Promise.all(
      linkedChannels.map(async (channel) => {
        const result = await listTeamPosts(currentTeamId, {
          page: 1,
          limit: 1,
          sourceId,
          channelId: channel.id,
        });

        return [channel.id, result.total] as const;
      }),
    );

    return counts;
  }, [currentTeamId, linkedChannelIdsKey, sourceId]);
  const { state: channelPublicationCountsState, invalidate: invalidateChannelPublicationCounts } = useAsync(
    fetchChannelPublicationTotals,
    [fetchChannelPublicationTotals],
    { keepPreviousData: true },
  );
  const channelPublicationCounts = new Map<string, number>(channelPublicationCountsState.status === "success"
    ? channelPublicationCountsState.data
    : []);

  const countAll = sourceItemsSummaryResult?.total ?? 0;
  const countPublished = sourceItemsSummaryResult?.facets?.publishCounts.published ?? 0;
  const countUnpublished = sourceItemsSummaryResult?.facets?.publishCounts.unpublished ?? 0;

  const filteredItems = sourceItems;

  const handleItemPublishFilter = (v: ItemPublishFilter) => { setItemPublishFilter(v); setItemsPage(1); };
  const handleItemDateFilter    = (v: DateRange | undefined) => { setItemDateFilter(v);    setItemsPage(1); };

  // ── Publications tab filtering ─────────────────────────────────────
  // Unique channels that appear in publications
  const pubChannelOptions = linkedChannels.map((channel) => [channel.id, channel.name] as const);
  const filteredPubs = publishedFromSource;

  const handlePubsChannelFilter = (v: string)                => { setPubsChannelFilter(v); setPublishedPage(1); };
  const handlePubsDateFilter    = (v: DateRange | undefined) => { setPubsDateFilter(v);    setPublishedPage(1); };

  // ── Jobs tab filtering ───────────────────────────────────────────────
  const jobStatusCounts: Record<string, number> = sourceJobsSummaryResult?.facets?.statusCounts ?? { all: sourceJobsSummaryResult?.total ?? 0 };
  const filteredJobs = sourceJobs;

  const handleJobStatusFilter = (v: JobStatusFilter)         => { setJobStatusFilter(v); setJobsPage(1); };
  const handleJobDateFilter   = (v: DateRange | undefined)   => { setJobDateFilter(v);   setJobsPage(1); };

  // ── Pagination ────────────────────────────────────────────────────────
  const itemsTotal = sourceItemsResult?.total ?? 0;
  const publishedTotal = sourcePostsResult?.total ?? 0;
  const jobsTotal = sourceJobsResult?.total ?? 0;
  const itemsTotalPages = Math.max(1, Math.ceil(itemsTotal / ITEMS_PAGE_SIZE));
  const publishedTotalPages = Math.max(1, Math.ceil(publishedTotal / PUBLISHED_PAGE_SIZE));
  const jobsTotalPages = Math.max(1, Math.ceil(jobsTotal / JOBS_PAGE_SIZE));

  const pageItems = filteredItems;
  const pagePublished = filteredPubs;
  const pageJobs = filteredJobs;

  // ── Stats for summary cards ───────────────────────────────────────────
  const pubsToday = sourcePostsTodayResult?.total ?? 0;
  const pubsWeek  = sourcePostsWeekResult?.total ?? 0;

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
  const sourceSettingsMinScanIntervalSec = sourceData?.minScanIntervalSec ?? sourceData?.effectiveScanIntervalSec ?? 300;
  const sourceSettingsMaxScanIntervalSec = sourceData?.maxScanIntervalSec ?? 86400;
  const sourceSettingsCurrentScanIntervalSec = sourceData?.scanIntervalSec ?? null;
  const sourceSettingsNextScanIntervalSec =
    sourceScanIntervalMode === "default"
      ? null
      : toScanIntervalSec(
          sourceScanIntervalDraft,
          sourceScanIntervalUnitDraft,
          sourceSettingsMinScanIntervalSec,
          sourceSettingsMaxScanIntervalSec,
        );
  const sourceSettingsEffectiveScanIntervalSec =
    sourceData?.effectiveScanIntervalSec
    ?? sourceData?.scanIntervalSec
    ?? sourceSettingsMinScanIntervalSec;
  const sourceSettingsMinScanIntervalDraft = clampScanIntervalDraftAmount(
    getScanIntervalDraftAmount(sourceSettingsMinScanIntervalSec, sourceScanIntervalUnitDraft),
    sourceScanIntervalUnitDraft,
    sourceSettingsMinScanIntervalSec,
    sourceSettingsMaxScanIntervalSec,
  );
  const sourceSettingsMaxScanIntervalDraft = clampScanIntervalDraftAmount(
    getScanIntervalDraftAmount(sourceSettingsMaxScanIntervalSec, sourceScanIntervalUnitDraft),
    sourceScanIntervalUnitDraft,
    sourceSettingsMinScanIntervalSec,
    sourceSettingsMaxScanIntervalSec,
  );
  const hasSourceSettingsChanges = sourceData
    ? sourceNameDraft.trim() !== sourceData.name
      || sourceSettingsNextScanIntervalSec !== sourceSettingsCurrentScanIntervalSec
    : false;

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
                  onClick={handlePauseSource}
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
              onClick={handleResumeSource}
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
            onClick={handleResumeSource}
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

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="w-max sm:w-fit">
            <TabsTrigger value="overview" className="gap-1.5">
              <LayoutDashboard className="size-3.5" />
              Обзор
            </TabsTrigger>
            <TabsTrigger value="items" className="gap-1.5">
              <FileText className="size-3.5" />
              Контент
              {countAll > 0 && (
                <span className="ml-0.5 text-xs font-medium leading-5 text-gray-500">
                  {countAll}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="published" className="gap-1.5">
              <Newspaper className="size-3.5" />
              Публикации
              {(sourcePostsSummaryResult?.total ?? 0) > 0 && (
                <span className="ml-0.5 text-xs font-medium leading-5 text-gray-500">
                  {sourcePostsSummaryResult?.total ?? 0}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-1.5">
              <Activity className="size-3.5" />
              Задачи
              {(sourceJobsSummaryResult?.total ?? 0) > 0 && (
                <span className="ml-0.5 text-xs font-medium leading-5 text-gray-500">
                  {sourceJobsSummaryResult?.total ?? 0}
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
            ОБЗОР
        ═════════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="overflow-hidden">
              <div className="flex items-center gap-2 px-5 pt-4 pb-1">
                <div className="flex size-7 items-center justify-center rounded-md bg-blue-50">
                  <FileText className="size-3.5 text-blue-500" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Материалы</span>
              </div>
              <CardContent className="pt-3 pb-4">
                <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border divide-x divide-y divide-border">
                  {[
                    { label: "Сегодня", value: source.itemsCount24h },
                    { label: "Неделя", value: source.itemsCountWeek },
                    { label: "Месяц", value: source.itemsCountMonth },
                    { label: "Всего", value: source.itemsCount },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col items-center justify-center bg-card px-2 py-3 transition-colors hover:bg-muted/40">
                      <span className="text-2xl font-bold leading-none tabular-nums text-foreground">{value}</span>
                      <span className="mt-1 text-xs text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex items-center gap-2 px-5 pt-4 pb-1">
                <div className="flex size-7 items-center justify-center rounded-md bg-green-50">
                  <Newspaper className="size-3.5 text-green-500" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Публикации</span>
              </div>
              <CardContent className="pt-3 pb-4">
                <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border divide-x divide-y divide-border">
                  {[
                    { label: "Сегодня", value: pubsToday },
                    { label: "Неделя", value: pubsWeek },
                    { label: "Всего", value: sourcePostsSummaryResult?.total ?? 0 },
                    { label: "Задач", value: sourceJobsSummaryResult?.total ?? 0 },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col items-center justify-center bg-card px-2 py-3 transition-colors hover:bg-muted/40">
                      <span className="text-2xl font-bold leading-none tabular-nums text-foreground">{value}</span>
                      <span className="mt-1 text-xs text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Статус источника</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                      {source.type === "telegram"
                        ? <Send className="size-3.5 text-muted-foreground" />
                        : source.type === "rss"
                          ? <Rss className="size-3.5 text-muted-foreground" />
                          : <Globe className="size-3.5 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Тип</p>
                      <p className="text-sm font-medium text-foreground">{SOURCE_TYPE_LABEL[source.type]}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Activity className="size-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Состояние</p>
                      <p className="text-sm font-medium text-foreground">
                        {!localIsActive ? "Остановлен" : source.status === "error" ? "Ошибка" : "Активен"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Clock className="size-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Последнее обновление</p>
                      <p className="text-sm font-medium text-foreground">
                        {source.lastFetchedAt
                          ? new Date(source.lastFetchedAt).toLocaleString("ru-RU", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Никогда"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Database className="size-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Каналы</p>
                      <p className="text-sm font-medium text-foreground">
                        {linkedChannels.length > 0 ? `${linkedChannels.length} шт.` : "Не привязан"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 border-t pt-3 sm:col-span-2 lg:col-span-1">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                      <CheckCircle className="size-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Создан</p>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(source.createdAt).toLocaleString("ru-RU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="size-4 text-green-500" />
                  <CardTitle className="text-base">Каналы источника</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {linkedChannels.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-400">
                  <Database className="mx-auto mb-2 size-8 text-gray-200" />
                  Источник пока не привязан ни к одному каналу.
                </div>
              ) : (
                <div>
                  <div className="space-y-2 sm:hidden">
                    {linkedChannels.map((channel) => (
                      <Link key={channel.id} to={`/channels/${channel.id}`} className="block">
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2 transition-colors hover:bg-muted/30">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-foreground">{channel.name}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{channel.telegramUsername ? `@${channel.telegramUsername.replace(/^@/, "")}` : channel.telegramTarget}</span>
                              <span>·</span>
                              <span>{channelPublicationCounts.get(channel.id) ?? 0} публ.</span>
                            </div>
                          </div>
                          <ChevronRight className="size-4 shrink-0 text-gray-300" />
                        </div>
                      </Link>
                    ))}
                  </div>
                  <div className="hidden sm:block">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="pb-2 pr-4 text-left text-xs font-normal text-muted-foreground">Канал</th>
                          <th className="pb-2 pr-4 text-left text-xs font-normal text-muted-foreground">Telegram</th>
                          <th className="pb-2 pr-4 text-right text-xs font-normal text-muted-foreground">Публ.</th>
                          <th className="pb-2 text-right text-xs font-normal text-muted-foreground">Статус</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {linkedChannels.map((channel) => (
                          <tr key={channel.id}>
                            <td className="py-2.5 pr-4">
                              <Link to={`/channels/${channel.id}`} className="font-medium hover:text-blue-600">
                                {channel.name}
                              </Link>
                            </td>
                            <td className="py-2.5 pr-4 text-gray-500">
                          {channel.telegramUsername ? `@${channel.telegramUsername.replace(/^@/, "")}` : channel.telegramTarget}
                            </td>
                            <td className="py-2.5 pr-4 text-right tabular-nums font-medium text-blue-600">
                              {channelPublicationCounts.get(channel.id) ?? 0}
                            </td>
                            <td className="py-2.5 text-right">
                              <Badge variant={channel.isActive ? "default" : "secondary"} className="text-xs">
                                {channel.isActive ? "Активен" : "Остановлен"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Последние материалы</CardTitle>
                  {countAll > OVERVIEW_ITEMS_COUNT && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600" onClick={() => setActiveTab("items")}>
                      Смотреть все →
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {overviewItems.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Материалы пока не собраны</div>
                ) : (
                  <div className="space-y-3">
                    {overviewItems.map((item) => (
                      <Link key={item.id} to={`/items/${item.id}`}>
                        <div className="group rounded-xl border border-border/70 bg-card px-4 py-3 transition-colors hover:bg-muted/25">
                          <div className="flex gap-3">
                            {item.mediaUrl && item.mediaPreviewAvailable !== false ? (
                              <img src={item.mediaUrl} alt="" className="mt-0.5 h-14 w-14 shrink-0 rounded-lg object-cover" />
                            ) : (
                              <div className="mt-0.5 flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                <FileText className="size-4" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex items-center gap-2 text-xs text-gray-400">
                                <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                  Материал
                                </span>
                                <span className="tabular-nums">
                                  {new Date(item.extractedAt).toLocaleString("ru-RU", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {(item.publicationsCount ?? 0) > 0 && (
                                  <>
                                    <span>·</span>
                                    <span>{item.publicationsCount} публ.</span>
                                  </>
                                )}
                              </div>
                              <div className="line-clamp-2 text-sm font-semibold leading-5 text-foreground group-hover:text-blue-600">
                                {item.title}
                              </div>
                              <div className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                                {item.content}
                              </div>
                              <MediaStatusHint item={item} className="mt-2" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Последние публикации</CardTitle>
                  {(sourcePostsSummaryResult?.total ?? 0) > OVERVIEW_POSTS_COUNT && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600" onClick={() => setActiveTab("published")}>
                      Смотреть все →
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {overviewPublished.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Публикаций пока нет</div>
                ) : (
                  <div className="space-y-3">
                    {overviewPublished.map((publication) => (
                      <Link key={publication.id} to={`/posts/${publication.id}`}>
                        <div className="group rounded-xl border border-border/70 bg-card px-4 py-3 transition-colors hover:bg-muted/25">
                          <div className="mb-2 flex items-center gap-2 text-xs text-gray-400">
                            <Badge variant="default" className="text-xs">{publication.channelName}</Badge>
                            <span className="tabular-nums">
                              {new Date(publication.postedAt).toLocaleString("ru-RU", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="line-clamp-3 text-sm leading-5 text-foreground group-hover:text-blue-600">
                            {publication.generatedContent}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                            <span className="text-muted-foreground italic line-clamp-1">
                              {publication.itemTitle}
                            </span>
                            {(publication.views !== undefined || publication.reactions !== undefined) && (
                              <>
                                <span className="flex items-center gap-1">
                                  <Eye className="size-3" />
                                  {publication.views?.toLocaleString("ru-RU") ?? "—"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Heart className="size-3" />
                                  {publication.reactions?.toLocaleString("ru-RU") ?? "—"}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═════════════════════════════════════════════
            КОНТЕНТ
        ═════════════════════════════════════════════ */}
        <TabsContent value="items" className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
            <div className="flex flex-wrap items-start gap-3 sm:items-center">
              <div className="flex items-center gap-2">
                <Filter className="size-3.5 text-gray-400" />
                <div className="flex flex-wrap items-center gap-1 sm:flex-nowrap">
                  {itemPublishFilterOptions.map(({ value, label, count }) => (
                    <button
                      key={value}
                      onClick={() => handleItemPublishFilter(value)}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                        itemPublishFilter === value
                          ? "bg-foreground text-background shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {label}
                      <span className={`text-xs tabular-nums ${itemPublishFilter === value ? "opacity-70" : "text-muted-foreground"}`}>
                        {count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="hidden h-5 w-px bg-border sm:block" />
              <PeriodPicker value={itemDateFilter} onChange={handleItemDateFilter} />
            </div>
            {(itemPublishFilter !== "all" || itemDateFilter !== undefined) && (
              <button
                onClick={() => { setItemPublishFilter("all"); setItemDateFilter(undefined); setItemsPage(1); }}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Сбросить
              </button>
            )}
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-lg border border-border bg-card py-12 text-center text-muted-foreground">
              <FileText className="mx-auto mb-3 size-10 text-muted-foreground" />
              <p className="text-sm">
                {countAll === 0
                  ? "Материалы пока не собраны — запустите получение"
                  : "Нет материалов с выбранным фильтром"}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card divide-y">
              {pageItems.map((item) => {
                const pubs = item.publicationsPreview ?? [];
                const publicationsCount = item.publicationsCount ?? pubs.length;
                const isPublished = publicationsCount > 0;
                return (
                  <div
                    key={item.id}
                    className="flex cursor-pointer items-start gap-4 px-4 py-4 transition-colors hover:bg-muted/40"
                    onClick={() => navigate(`/items/${item.id}`)}
                  >
                    {item.mediaUrl && item.mediaPreviewAvailable !== false && (
                      <img src={item.mediaUrl} alt="" className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <h3 className="line-clamp-1 text-sm font-medium leading-snug text-foreground">{item.title}</h3>
                        {isPublished ? (
                          <Badge variant="default" className="text-xs flex-shrink-0 gap-1">
                            <CheckCircle className="size-3" />
                            {publicationsCount > 1 ? `${publicationsCount} канала` : "Опубликован"}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs flex-shrink-0">Не опубликован</Badge>
                        )}
                      </div>
                        <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">{item.content}</p>
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
                      <MediaStatusHint item={item} className="mt-2" />
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
          <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
            <div className="flex flex-wrap items-start gap-3 sm:items-center">
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
                {(sourcePostsSummaryResult?.total ?? 0) === 0
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
                        <span className="text-xs text-muted-foreground tabular-nums">
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
                  {pi.mediaUrl && pi.mediaPreviewAvailable !== false && (
                    <img
                      src={pi.mediaUrl}
                      alt=""
                      className="w-full max-h-64 object-cover rounded-lg"
                    />
                  )}
                  <MediaStatusHint item={pi} />
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
        ══════════════════════════════════════════════ */}
        <TabsContent value="jobs" className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
            <div className="flex flex-wrap items-start gap-3 sm:items-center">
              <div className="flex items-center gap-2">
                <Filter className="size-3.5 text-gray-400" />
                <div className="flex flex-wrap items-center gap-1 sm:flex-nowrap">
                  {jobStatusOptions.map(({ value, label }) => {
                    const cnt = value === "all" ? (sourceJobsSummaryResult?.total ?? 0) : (jobStatusCounts[value] ?? 0);
                    if (value !== "all" && cnt === 0) return null;
                    return (
                      <button
                        key={value}
                        onClick={() => handleJobStatusFilter(value)}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                          jobStatusFilter === value
                            ? "bg-foreground text-background shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {label}
                        <span className={`text-xs tabular-nums ${jobStatusFilter === value ? "opacity-70" : "text-muted-foreground"}`}>
                          {cnt}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="h-5 w-px bg-border" />
              <PeriodPicker value={jobDateFilter} onChange={handleJobDateFilter} />
            </div>
            {(jobStatusFilter !== "all" || jobDateFilter !== undefined) && (
              <button
                onClick={() => { setJobStatusFilter("all"); setJobDateFilter(undefined); setJobsPage(1); }}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Сбросить
              </button>
            )}
          </div>

          {filteredJobs.length === 0 ? (
            <div className="rounded-lg border border-border bg-card py-12 text-center text-muted-foreground">
              <Activity className="mx-auto mb-3 size-10 text-muted-foreground" />
              <p className="text-sm">
                {(sourceJobsSummaryResult?.total ?? 0) === 0 ? "Заач не найдено" : "Нет задач с выбранным фильтром"}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card divide-y">
              {pageJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40"
                  onClick={() => navigate(`/jobs/${job.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-sm font-medium text-foreground">
                        {job.type.replace(/_/g, " ")}
                      </span>
                      <JobStatusBadge status={job.status} />
                    </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
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

        {/* ══════════════════════════════════════════════
            НАСТРОЙКА
        ══════════════════════════════════════════════ */}
        <TabsContent value="actions" className="space-y-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Основные настройки</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="source-name">Название источника</Label>
                  <Input
                    id="source-name"
                    value={sourceNameDraft}
                    onChange={(event) => setSourceNameDraft(event.target.value)}
                    placeholder="Введите название"
                    disabled={isSavingSourceSettings}
                  />
                  <p className="text-xs text-gray-500">
                    Это название отображается в списке источников, задачах и публикациях.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source-scan-interval-mode">{"\u0418\u043D\u0442\u0435\u0440\u0432\u0430\u043B \u0441\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F"}</Label>
                  <Select
                    value={sourceScanIntervalMode}
                    onValueChange={(value: "default" | "custom") => setSourceScanIntervalMode(value)}
                    disabled={isSavingSourceSettings}
                  >
                    <SelectTrigger id="source-scan-interval-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">{"\u041E\u0442 \u0433\u043B\u043E\u0431\u0430\u043B\u044C\u043D\u043E\u0433\u043E scheduler"}</SelectItem>
                      <SelectItem value="custom">{"\u0421\u0432\u043E\u0439 \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B"}</SelectItem>
                    </SelectContent>
                  </Select>
                  {sourceScanIntervalMode === "custom" && (
                    <div className="space-y-2 rounded-lg border border-border/70 bg-muted/30 p-3">
                      <Label htmlFor="source-scan-interval-value">{"\u041A\u0430\u0436\u0434\u044B\u0435"}</Label>
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
                        <NumericInput
                          id="source-scan-interval-value"
                          value={sourceScanIntervalDraft}
                          onValueChange={setSourceScanIntervalDraft}
                          min={sourceSettingsMinScanIntervalDraft}
                          max={sourceSettingsMaxScanIntervalDraft}
                          step={1}
                          fallbackValue={sourceSettingsMinScanIntervalDraft}
                          disabled={isSavingSourceSettings}
                        />
                        <Select
                          value={sourceScanIntervalUnitDraft}
                          onValueChange={(value: SourceScanIntervalUnit) => {
                            const currentIntervalSec = toScanIntervalSec(
                              sourceScanIntervalDraft,
                              sourceScanIntervalUnitDraft,
                              sourceSettingsMinScanIntervalSec,
                              sourceSettingsMaxScanIntervalSec,
                            );
                            setSourceScanIntervalUnitDraft(value);
                            setSourceScanIntervalDraft(
                              clampScanIntervalDraftAmount(
                                getScanIntervalDraftAmount(currentIntervalSec, value),
                                value,
                                sourceSettingsMinScanIntervalSec,
                                sourceSettingsMaxScanIntervalSec,
                              ),
                            );
                          }}
                          disabled={isSavingSourceSettings}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minutes">{"\u043C\u0438\u043D\u0443\u0442"}</SelectItem>
                            <SelectItem value="hours">{"\u0447\u0430\u0441\u043E\u0432"}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    {"\u041C\u0438\u043D\u0438\u043C\u0443\u043C: "}
                    {formatIntervalLabel(sourceSettingsMinScanIntervalSec)}
                    {". "}
                    {"\u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C: "}
                    {formatIntervalLabel(sourceSettingsMaxScanIntervalSec)}
                    {". "}
                    {"\u0421\u0435\u0439\u0447\u0430\u0441 \u044D\u0444\u0444\u0435\u043A\u0442\u0438\u0432\u043D\u043E: "}
                    {formatIntervalLabel(sourceSettingsEffectiveScanIntervalSec)}
                    {"."}
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveSourceSettings}
                    disabled={isSavingSourceSettings || !sourceNameDraft.trim() || !hasSourceSettingsChanges}
                  >
                    <Save className="mr-2 size-4" />
                    {isSavingSourceSettings ? "Сохранение..." : "Сохранить настройки"}
                  </Button>
                </div>
              </CardContent>
            </Card>

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
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-gray-700">Конфигурация парсера</span>
                    {source.activeConfigJson && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfigExpanded((value) => !value)}
                      >
                        {configExpanded ? "Свернуть полный конфиг" : "Развернуть полный конфиг"}
                      </Button>
                    )}
                  </div>
                  {source.activeConfigJson ? (
                    <div className="space-y-3">
                    <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs space-y-2">
                      <ConfigSummaryRow label="kind" value={source.activeConfigJson.kind} />
                      {source.activeConfigJson.kind === 'website_full' && (
                        <>
                          {source.activeConfigJson.list.itemSelectors.slice(0, 2).map((sel, i) => (
                            <ConfigSummaryRow key={`list-${i}`} label={`list.itemSelectors[${i}]`} value={sel} />
                          ))}
                          {source.activeConfigJson.list.linkSelectors.slice(0, 2).map((sel, i) => (
                            <ConfigSummaryRow key={`link-${i}`} label={`list.linkSelectors[${i}]`} value={sel} />
                          ))}
                        </>
                      )}
                      {source.activeConfigJson.article.titleSelectors.slice(0, 2).map((sel, i) => (
                        <ConfigSummaryRow key={`title-${i}`} label={`article.titleSelectors[${i}]`} value={sel} />
                      ))}
                      {source.activeConfigJson.article.contentSelectors.slice(0, 2).map((sel, i) => (
                        <ConfigSummaryRow key={`content-${i}`} label={`article.contentSelectors[${i}]`} value={sel} />
                      ))}
                      <ConfigSummaryRow label="quality.minContentChars" value={String(source.activeConfigJson.quality.minContentChars)} />
                    </div>
                    {configExpanded && (
                      <div className="grid gap-3 lg:grid-cols-2">
                        <ConfigFullView title="List" payload={source.activeConfigJson.kind === 'website_full' ? source.activeConfigJson.list : {}} />
                        <ConfigFullView title="Article" payload={source.activeConfigJson.article} />
                        <ConfigFullView title="Quality" payload={source.activeConfigJson.quality} />
                        <ConfigFullView title="Raw config" payload={source.activeConfigJson} />
                      </div>
                    )}
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
                            <Bot className="size-3 mr-0.5" /> Article-first
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
                        <div key={key} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
                          <span className="w-full text-orange-600 sm:w-auto sm:min-w-[150px] sm:shrink-0">{key}:</span>
                          <span className="text-gray-700 break-all">{value}</span>
                        </div>
                      ))}
                      {source.rssMode === 'feed_with_article_agent' && source.rssArticleConfig && (
                        <>
                          <div className="border-t border-gray-200 my-1" />
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
                            <span className="w-full text-purple-600 sm:w-auto sm:min-w-[150px] sm:shrink-0">minFeedContentChars:</span>
                            <span className="text-gray-700">{source.rssArticleConfig.rssFallbackPolicy.minFeedContentChars}</span>
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
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Bot className="size-3.5 text-purple-500" />
                          Article parser config
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRssConfigExpanded((value) => !value)}
                        >
                          {rssConfigExpanded ? "Свернуть полный конфиг" : "Развернуть полный конфиг"}
                        </Button>
                      </div>

                      <div className="rounded-lg border border-purple-100 bg-purple-50 p-3 font-mono text-xs space-y-2 dark:border-purple-800/50 dark:bg-purple-950/20">
                        <div className="mb-1 text-[11px] font-medium text-purple-700 dark:text-purple-300">rss_article_only</div>
                        {source.rssArticleConfig.article.titleSelectors.slice(0, 2).map((sel, i) => (
                          <ConfigSummaryRow key={`rss-title-${i}`} label={`titleSelectors[${i}]`} value={sel} />
                        ))}
                        {source.rssArticleConfig.article.contentSelectors.slice(0, 2).map((sel, i) => (
                          <ConfigSummaryRow key={`rss-content-${i}`} label={`contentSelectors[${i}]`} value={sel} />
                        ))}
                        {source.rssArticleConfig.article.dateSelectors.slice(0, 2).map((sel, i) => (
                          <ConfigSummaryRow key={`rss-date-${i}`} label={`dateSelectors[${i}]`} value={sel} />
                        ))}
                        {source.rssArticleConfig.article.mediaSelectors?.slice(0, 2).map((sel, i) => (
                          <ConfigSummaryRow key={`rss-media-${i}`} label={`mediaSelectors[${i}]`} value={sel} />
                        ))}
                        <ConfigSummaryRow label="quality.minChars" value={String(source.rssArticleConfig.quality.minContentChars)} />
                      </div>
                      {rssConfigExpanded && (
                        <div className="grid gap-3 lg:grid-cols-2">
                          <ConfigFullView title="Article" payload={source.rssArticleConfig.article} />
                          <ConfigFullView title="Quality" payload={source.rssArticleConfig.quality} />
                          <ConfigFullView title="RSS fallback" payload={{ minFeedContentChars: source.rssArticleConfig.rssFallbackPolicy.minFeedContentChars }} />
                          <ConfigFullView title="Raw config" payload={source.rssArticleConfig} />
                        </div>
                      )}

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
                              onClick={handleRunRssAgent}
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
                            <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                              <div className="h-full bg-purple-500 rounded-full animate-pulse" style={{ width: "60%" }} />
                            </div>
                            <AgentStageStepper stages={rssAgentStages} />
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
                                  <div className="rounded-lg border bg-gray-50 dark:bg-gray-900/60 dark:border-gray-700 p-3 font-mono text-xs space-y-1.5">
                                    {curEntries.length === 0 ? (
                                      <span className="text-gray-400 dark:text-gray-500 italic">Конфиг отсутствует</span>
                                    ) : allKeys.map((key) => {
                                      const val = curMap.get(key);
                                      if (!val) return null;
                                      const changed = val !== newMap.get(key);
                                      return (
                                        <div key={key} className={`flex flex-col gap-1 sm:flex-row sm:items-start ${changed ? "text-red-400 dark:text-red-300 line-through" : "text-gray-500 dark:text-gray-400"}`}>
                                          <span className="w-full sm:w-auto sm:min-w-[180px] sm:shrink-0">{key}:</span>
                                          <span className="break-all">{val}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-gray-500 mb-1.5">Новый конфиг</div>
                                  <div className="rounded-lg border border-purple-200 bg-purple-50 dark:border-purple-800/50 dark:bg-purple-950/20 p-3 font-mono text-xs space-y-1.5">
                                    {allKeys.map((key) => {
                                      const val = newMap.get(key);
                                      if (!val) return null;
                                      const changed = val !== curMap.get(key);
                                      return (
                                        <div key={key} className={`flex flex-col gap-1 sm:flex-row sm:items-start ${changed ? "text-purple-700 dark:text-purple-300 font-medium" : "text-gray-500 dark:text-gray-400"}`}>
                                          <span className="w-full sm:w-auto sm:min-w-[180px] sm:shrink-0">{key}:</span>
                                          <span className="break-all">{val}</span>
                                          {changed && <span className="text-green-600 dark:text-green-400 shrink-0 sm:ml-auto">NEW</span>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 pt-1">
                                <Button
                                  size="sm"
                                  onClick={handleApplyRssConfig}
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
                                  onClick={handleRunRssAgent}
                                >
                                  <RefreshCw className="size-3.5 mr-1.5" />
                                  Запустить ещё раз
                                </Button>
                              </div>
                              <AgentStageStepper stages={rssAgentStages} />
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
                          onClick={handleRunWebsiteAgent}
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
                              {agentJob ? `Job ${agentJob.id} · это займёт несколько минут` : "Это займёт несколько секунд"}
                            </p>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full animate-pulse" style={{ width: "60%" }} />
                        </div>
                        <AgentStageStepper stages={agentStages} />
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
                              <div className="rounded-lg border bg-gray-50 dark:bg-gray-900/60 dark:border-gray-700 p-3 font-mono text-xs space-y-1.5">
                                {curEntries.length === 0 ? (
                                  <span className="text-gray-400 dark:text-gray-500 italic">Конфиг отсутствует</span>
                                ) : allKeys.map((key) => {
                                  const val = curMap.get(key);
                                  if (!val) return null;
                                  const changed = val !== newMap.get(key);
                                  return (
                                    <div key={key} className={`flex flex-col gap-1 sm:flex-row sm:items-start ${changed ? "text-red-400 dark:text-red-300 line-through" : "text-gray-500 dark:text-gray-400"}`}>
                                      <span className="w-full sm:w-auto sm:min-w-[160px] sm:shrink-0">{key}:</span>
                                      <span className="break-all">{val}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-gray-500 mb-1.5">Новый конфиг</div>
                              <div className="rounded-lg border border-purple-200 bg-purple-50 dark:border-purple-800/50 dark:bg-purple-950/20 p-3 font-mono text-xs space-y-1.5">
                                {allKeys.map((key) => {
                                  const val = newMap.get(key);
                                  if (!val) return null;
                                  const changed = val !== curMap.get(key);
                                  return (
                                    <div key={key} className={`flex flex-col gap-1 sm:flex-row sm:items-start ${changed ? "text-purple-700 dark:text-purple-300 font-medium" : "text-gray-500 dark:text-gray-400"}`}>
                                      <span className="w-full sm:w-auto sm:min-w-[160px] sm:shrink-0">{key}:</span>
                                      <span className="break-all">{val}</span>
                                      {changed && <span className="text-green-600 dark:text-green-400 shrink-0 sm:ml-auto">NEW</span>}
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
                              {agentPreviewArticles.map((article, i) => (
                                <AgentArticleCard key={i} article={article} />
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              size="sm"
                              onClick={handleApplyWebsiteConfig}
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
                                  onClick={handleRunWebsiteAgent}
                                >
                              <RefreshCw className="size-3.5 mr-1.5" />
                              Запустить ещё раз
                                </Button>
                              </div>
                              <AgentStageStepper stages={agentStages} />
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
                  <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-900/20">
                    <CardContent className="py-4">
                      <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500 dark:text-amber-400" />
                          <div>
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Проблема с доступом</p>
                            <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                              {source.lastError || "Userbot не может прочитать этот Telegram source. Для публичного канала проверьте username и авторизацию user-account сессии."}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700/50 dark:text-amber-300 dark:hover:bg-amber-900/30"
                          disabled={checkingPermissions}
                          onClick={handleCheckTelegramPermissions}
                        >
                          {checkingPermissions ? (
                            <><Loader2 className="size-3.5 mr-1.5 animate-spin" />Проверяю...</>
                          ) : (
                            <><ShieldCheck className="size-3.5 mr-1.5" />Проверить доступ userbot</>
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
                        onClick={handleDeleteSource}
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

interface AgentRuntimeStage {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
}

interface AgentJobState {
  jobId: string;
  status: "pending" | "running" | "success" | "failed" | "canceled" | "timed_out";
  progress: number;
  errorText: string | null;
  preview: Record<string, unknown> | null;
  config: WebsiteFullConfig | RssArticleOnlyConfig | null;
  stages: AgentRuntimeStage[];
  liveStages: AgentRuntimeStage[];
  logs: string[];
  logEntries: Array<{
    id: string;
    ts: string;
    level: string;
    scope: string;
    message: string;
    meta?: Record<string, unknown> | null;
  }>;
}

function ConfigSummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
      <span className="w-full text-purple-600 sm:w-auto sm:min-w-[160px] sm:shrink-0">{label}:</span>
      <span className="text-gray-700 break-all">{value}</span>
    </div>
  );
}

function ConfigFullView({ title, payload }: { title: string; payload: unknown }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-950 p-4">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">{title}</div>
      <pre className="overflow-x-auto text-xs text-gray-100">{JSON.stringify(payload, null, 2)}</pre>
    </div>
  );
}

function AgentStageStepper({ stages }: { stages: AgentRuntimeStage[] }) {
  if (stages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-lg border border-purple-100 bg-purple-50/60 dark:border-purple-800/50 dark:bg-purple-950/20 p-3">
      {stages.map((stage, index) => {
        const isDone = stage.status === "done";
        const isRunning = stage.status === "running";
        const isError = stage.status === "error";

        return (
          <div key={stage.id} className="flex items-center gap-3">
            <div
              className={[
                "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium",
                isDone ? "border-green-200 bg-green-100 text-green-700 dark:border-green-800/50 dark:bg-green-900/30 dark:text-green-300" : "",
                isRunning ? "border-purple-200 bg-purple-100 text-purple-700 dark:border-purple-800/50 dark:bg-purple-900/30 dark:text-purple-300" : "",
                isError ? "border-red-200 bg-red-100 text-red-700 dark:border-red-800/50 dark:bg-red-900/30 dark:text-red-300" : "",
                !isDone && !isRunning && !isError ? "border-gray-200 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500" : "",
              ].join(" ")}
            >
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{stage.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {stage.status === "done" && "Завершено"}
                {stage.status === "running" && "Выполняется"}
                {stage.status === "error" && "Ошибка"}
                {stage.status === "pending" && "Ожидает"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


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














