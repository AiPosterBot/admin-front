import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Link, useParams, useNavigate } from "react-router";
import {
  Save, Link as LinkIcon, Unlink, TestTube, ArrowLeft, CheckCircle,
  ExternalLink, Trash2, Eye, Heart, CalendarIcon, X, LayoutDashboard,
  History, Settings, Database, Clock, Zap, Calendar as CalendarSchedule,
  TrendingUp, FileText, AlertCircle, Plus, Newspaper, Pause, Play,
  Users, Loader2, Bot, Sparkles, DollarSign, ChevronDown, ChevronUp, Send,
  ShieldAlert,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { NumericInput } from "../components/ui/numeric-input";
import { Switch } from "../components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "../components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "../components/ui/popover";
import { Calendar } from "../components/ui/calendar";
import { createDefaultSchedule, SchedulePicker, scheduleToHuman } from "../components/SchedulePicker";
import { getTimezoneLabel, getZonedDateParts } from "../lib/timezones";
import { Progress } from "../components/ui/progress";
import { Pagination } from "../components/Pagination";
import type { Item } from "../types/domain";
import { useTeam } from "../context/TeamContext";
import type { DateRange } from "react-day-picker";
// ── Service + guard layer ─────────────────────────────────────────────
import * as channelService from "../services/channelService";
import * as sourceService from "../services/sourceService";
import { useTeamPosts } from "../hooks/useTeamPosts";
import { useTeamItems } from "../hooks/useTeamItems";
import { useAsync } from "../lib/asyncState";
import { useTeamScopedEntity } from "../hooks/useTeamScopedEntity";
import { TeamScopeGuard } from "../components/TeamScopeGuard";
import { TagBadge } from "../components/TagBadge";
import { TagFilter } from "../components/TagFilter";
import { AssignTagsPopover } from "../components/AssignTagsPopover";

const HISTORY_PAGE_SIZE = 5;
const OVERVIEW_RECENT_COUNT = 5;

// Тип иконки-метки источника
const SOURCE_TYPE_LABEL: Record<string, string> = {
  rss: "RSS",
  website: "Web",
  telegram: "TG",
};

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

export function ChannelDetailPage() {
  const { channelId } = useParams();
  const { currentTeam, currentTeamId } = useTeam();
  const navigate = useNavigate();
  const team = currentTeam;

  // ── Team scope guard: хук загружает канал через сервис и
  //    автоматически редиректит если он не принадлежит текущей команде ──
  const { state: channelState, invalidate: invalidateChannel } = useTeamScopedEntity(
    () => channelService.getChannelById(channelId!, currentTeamId!),
    [channelId, currentTeamId],
    "/channels",
  );
  // Локальная ссылка для TypeScript — будет undefined пока загружается
  const channel = channelState.status === "success" ? channelState.data : undefined;

  // ── UI State ────────────────────────────────────────────────────────
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [testStep, setTestStep] = useState<"select" | "generating" | "result">("select");
  const [selectedTestItem, setSelectedTestItem] = useState<Item | null>(null);
  const [testGeneratedContent, setTestGeneratedContent] = useState("");
  const [testPreviewContentFormat, setTestPreviewContentFormat] = useState<"plain" | "telegram_html">("telegram_html");
  const [testLLMStats, setTestLLMStats] = useState({ model: "", tokens: 0, cost: 0, latencyMs: 0, usedLlm: true });
  const [testPreviewTraceId, setTestPreviewTraceId] = useState<string | null>(null);
  const [testProgress, setTestProgress] = useState(0);
  const [isPublishingTestPost, setIsPublishingTestPost] = useState(false);
  const [, setDataVersion] = useState(0);
  const [publishMode, setPublishMode] = useState(channel?.publishMode || "periodic");
  const [publishIntervalMin, setPublishIntervalMin] = useState(() => resolveChannelPublishIntervalMinutes(channel));
  // ИСПРАВЛЕНО: читаем contentStrategy из channel, а не хардкод "newest"
  const [contentStrategy, setContentStrategy] = useState<"newest" | "agent">(channel?.contentStrategy || "newest");
  const [scheduleValue, setScheduleValue] = useState(() => resolveChannelSchedule(channel));

  // ── Settings form state (controlled) ──────────────────────────────────
  const [postStyle, setPostStyle] = useState(channel?.postStyle || "");
  const [disableMedia, setDisableMedia] = useState(channel?.disableMedia ?? false);
  const [agentInstructions, setAgentInstructions] = useState(channel?.agentInstructions || "");
  const [skipLlmRewrite, setSkipLlmRewrite] = useState(channel?.skipLlmRewrite ?? false);

  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshingMetadata, setIsRefreshingMetadata] = useState(false);

  // Track initial values for dirty detection
  const initialSettings = useRef({
    postStyle: channel?.postStyle || "",
    disableMedia: channel?.disableMedia ?? false,
    agentInstructions: channel?.agentInstructions || "",
    skipLlmRewrite: channel?.skipLlmRewrite ?? false,

    publishMode: channel?.publishMode || "periodic",
    publishIntervalMin: resolveChannelPublishIntervalMinutes(channel),
    contentStrategy: (channel?.contentStrategy || "newest") as "newest" | "agent",
    scheduleValue: resolveChannelSchedule(channel),
  });

  const hasUnsavedChanges =
    postStyle !== initialSettings.current.postStyle ||
    disableMedia !== initialSettings.current.disableMedia ||
    agentInstructions !== initialSettings.current.agentInstructions ||
    skipLlmRewrite !== initialSettings.current.skipLlmRewrite ||

    publishMode !== initialSettings.current.publishMode ||
    publishIntervalMin !== initialSettings.current.publishIntervalMin ||
    contentStrategy !== initialSettings.current.contentStrategy ||
    JSON.stringify(scheduleValue) !== JSON.stringify(initialSettings.current.scheduleValue);

  const [historyPage, setHistoryPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [linkedSourceIds, setLinkedSourceIds] = useState<string[]>(
    channelService.getLinkedSourceIds(channelId ?? "")
  );
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [sourceToUnlink, setSourceToUnlink] = useState<string | null>(null);
  const [, forceTagUpdate] = useState(0);
  const [linkDialogTagFilter, setLinkDialogTagFilter] = useState<string[]>([]);

  const { state: historyPostsState, invalidate: invalidateHistoryPosts } = useTeamPosts({
    page: historyPage,
    limit: HISTORY_PAGE_SIZE,
    channelId: channelId,
    status: statusFilter !== "all" ? statusFilter : undefined,
    from: startOfDayIso(dateRange?.from),
    to: endOfDayIso(dateRange?.to),
  });
  const { state: recentPostsState, invalidate: invalidateRecentPosts } = useTeamPosts({
    page: 1,
    limit: OVERVIEW_RECENT_COUNT,
    channelId: channelId,
  });
  const { state: testItemsState, invalidate: invalidateTestItems } = useTeamItems({
    page: 1,
    limit: 20,
    sourceIds: linkedSourceIds,
  });
  const fetchChannelStats = useCallback(() => {
    if (!channelId) {
      return Promise.resolve(null);
    }

    return channelService.getChannelStats(channelId);
  }, [channelId]);
  const { state: channelStatsState, invalidate: invalidateChannelStats } = useAsync(fetchChannelStats, [fetchChannelStats]);

  const refreshChannelData = useCallback(async () => {
    if (!currentTeamId || !channelId) {
      return;
    }

    await Promise.all([
      channelService.getChannelById(channelId, currentTeamId),
      sourceService.getTeamSources(currentTeamId),
    ]);

    setLinkedSourceIds(channelService.getLinkedSourceIds(channelId));
    invalidateHistoryPosts();
    invalidateRecentPosts();
    invalidateChannelStats();
    invalidateTestItems();
    setDataVersion((version) => version + 1);
  }, [channelId, currentTeamId, invalidateChannelStats, invalidateHistoryPosts, invalidateRecentPosts, invalidateTestItems]);

  const handleSaveSettings = useCallback(async () => {
    if (!channel || !currentTeamId) {
      return;
    }

    setIsSaving(true);

    try {
      const saveResult = await channelService.updateChannelSettings(channel.id, currentTeamId, {
        postStyle,
        disableMedia,
        agentInstructions,
        skipLlmRewrite,
        contentStrategy,
        publishMode: publishMode as "periodic" | "scheduled" | "every_material",
        publishIntervalSec: publishMode === "scheduled" ? undefined : publishIntervalMin * 60,
        scheduleJson: scheduleValue,
      });

      if (saveResult.ok === false) {
        toast.error(saveResult.error);
        return;
      }

      initialSettings.current = {
        postStyle,
        disableMedia,
        agentInstructions,
        skipLlmRewrite,
        publishMode,
        publishIntervalMin,
        contentStrategy,
        scheduleValue: structuredClone(scheduleValue),
      };

      invalidateChannel();
      await refreshChannelData();

      toast.success("Настройки сохранены", {
        description: "Изменения канала применены успешно",
      });
    } finally {
      setIsSaving(false);
    }
  }, [agentInstructions, channel, contentStrategy, currentTeamId, disableMedia, invalidateChannel, postStyle, publishIntervalMin, publishMode, refreshChannelData, scheduleValue, skipLlmRewrite]);

  const handleDiscardSettings = useCallback(() => {
    setPostStyle(initialSettings.current.postStyle);
    setDisableMedia(initialSettings.current.disableMedia);
    setAgentInstructions(initialSettings.current.agentInstructions);
    setSkipLlmRewrite(initialSettings.current.skipLlmRewrite);

    setPublishMode(initialSettings.current.publishMode);
    setPublishIntervalMin(initialSettings.current.publishIntervalMin);
    setContentStrategy(initialSettings.current.contentStrategy);
    setScheduleValue(structuredClone(initialSettings.current.scheduleValue));
    toast("Изменения отменены");
  }, []);

  const handleRefreshMetadata = useCallback(async () => {
    if (!channel || !currentTeamId) {
      return;
    }

    setIsRefreshingMetadata(true);
    try {
      const result = await channelService.refreshChannelMetadata(channel.id, currentTeamId);
      if (result.ok === false) {
        toast.error(result.error);
        return;
      }

      invalidateChannel();
      await refreshChannelData();
      toast.success(result.data.reused ? "Обновление уже стоит в очереди" : "Обновление канала поставлено в очередь", {
        description: "Метаданные канала обновятся после выполнения job refresh_channel_metadata.",
      });
    } finally {
      setIsRefreshingMetadata(false);
    }
  }, [channel, currentTeamId, invalidateChannel, refreshChannelData]);

  // ── Channel active state (pause/resume) ─────────────────────────────
  // Инициализируется после загрузки канала через useEffect
  const [isChannelActive, setIsChannelActive] = useState(true);
  // Синхронизируем все form-состояния при загрузке канала через хук
  useEffect(() => {
    if (channelState.status !== "success") return;
    const ch = channelState.data;
    setIsChannelActive(ch.isActive);
    setPublishMode(ch.publishMode || "periodic");
    setPublishIntervalMin(resolveChannelPublishIntervalMinutes(ch));
    setContentStrategy(ch.contentStrategy || "newest");
    setScheduleValue(resolveChannelSchedule(ch));
    setPostStyle(ch.postStyle || "");
    setDisableMedia(ch.disableMedia ?? false);
    setAgentInstructions(ch.agentInstructions || "");
    setSkipLlmRewrite(ch.skipLlmRewrite ?? false);
    setLinkedSourceIds(channelService.getLinkedSourceIds(ch.id));
    initialSettings.current = {
      postStyle: ch.postStyle || "",
      disableMedia: ch.disableMedia ?? false,
      agentInstructions: ch.agentInstructions || "",
      skipLlmRewrite: ch.skipLlmRewrite ?? false,
      publishMode: ch.publishMode || "periodic",
      publishIntervalMin: resolveChannelPublishIntervalMinutes(ch),
      contentStrategy: (ch.contentStrategy || "newest") as "newest" | "agent",
      scheduleValue: resolveChannelSchedule(ch),
    };
  }, [channelState]);
  useEffect(() => {
    void refreshChannelData();

    const timer = window.setInterval(() => {
      void refreshChannelData();
    }, 15000);

    return () => window.clearInterval(timer);
  }, [refreshChannelData]);

  useEffect(() => {
    if (!currentTeamId) {
      return;
    }

    let isMounted = true;
    void channelService.getTelegramBotInfo(currentTeamId)
      .then((result) => {
        if (isMounted) {
          setBotUsername(result.botUsername ?? null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setBotUsername(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentTeamId]);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);

  if (!team) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Команда не выбрана</h2>
        <p className="text-gray-600 mb-4">Выберите команду, чтобы просмотреть канал.</p>
        <Link to="/channels"><Button>← Вернуться к каналам</Button></Link>
      </div>
    );
  }

  // ── Computed: sources (через сервис) ────────────────────────────────
  const allTeamSources = sourceService.getTeamSourcesList(currentTeamId!);
  const linkedSources = channelId ? channelService.getLinkedSources(channelId) : [];
  const availableToLink = allTeamSources.filter(s => !linkedSourceIds.includes(s.id));

  const historyPostsResult = historyPostsState.status === "success" ? historyPostsState.data : null;
  const recentPostsResult = recentPostsState.status === "success" ? recentPostsState.data : null;
  const channelStats = channelStatsState.status === "success" ? channelStatsState.data : null;
  const testItemsResult = testItemsState.status === "success" ? testItemsState.data : null;

  const allPostedItems = historyPostsResult?.data ?? [];
  const postsToday = channelStats?.postsToday ?? 0;
  const postsWeek = channelStats?.postsWeek ?? 0;
  const postsMonth = channelStats?.postsMonth ?? 0;
  const postsTotal = channelStats?.postsTotal ?? 0;
  const recentPosts = recentPostsResult?.data ?? [];
  const publicationsBySource = new Map<string, number>((channelStats?.publicationsBySource ?? []).map((entry) => [entry.sourceId, entry.count]));

  const pubsBySource = (sourceId: string) => publicationsBySource.get(sourceId) ?? 0;

  // ── Schedule ────────────────────────────────────────────────────────
  const nextPublication = publishMode === "scheduled"
    ? getNextPublication(scheduleValue)
    : getNextIntervalPublication(channel?.lastPublishedAt, publishIntervalMin * 60);
  const scheduleHuman = publishMode === "scheduled" ? scheduleToHuman(scheduleValue) : "";

  // ── Filtered history ───────────────────────────────────────────────
  const filteredPostedItems = allPostedItems;
  const hasActiveFilters = statusFilter !== "all" || !!dateRange;
  const historyTotal = historyPostsResult?.total ?? 0;
  const historyTotalPages = Math.max(1, Math.ceil(historyTotal / HISTORY_PAGE_SIZE));
  const pageHistory = filteredPostedItems;

  // ── Test generation materials (через сервис) ─────────────────────────
  const testItems = testItemsResult?.data ?? [];

  const handleOpenTestDialog = () => {
    setTestStep("select");
    setSelectedTestItem(null);
    setTestGeneratedContent("");
    setTestPreviewContentFormat("telegram_html");
    setTestLLMStats({ model: "", tokens: 0, cost: 0, latencyMs: 0, usedLlm: true });
    setTestPreviewTraceId(null);
    setTestProgress(0);
    setShowTestDialog(false);
  };

  const handleRunTestGeneration = async () => {
    if (!selectedTestItem || !channel) return;
    setTestStep("generating");
    setTestProgress(15);
    setShowTestDialog(true);
    const previewResult = await channelService.generateChannelTestingPreview(channel.id, selectedTestItem.id);
    if (previewResult.ok === false) {
      toast.error(previewResult.error);
      setTestStep("select");
      setShowTestDialog(false);
      setTestProgress(0);
      return;
    }

    setTestProgress(100);
    setTestGeneratedContent(previewResult.data.generatedContent);
    setTestPreviewContentFormat(previewResult.data.generatedContentFormat);
    setTestPreviewTraceId(previewResult.data.llm.traceId ?? null);
    setTestLLMStats({
      model: previewResult.data.llm.traceId ? previewResult.data.llm.model : "Без AI",
      tokens: previewResult.data.llm.totalTokens ?? 0,
      cost: previewResult.data.llm.costUsd ?? 0,
      latencyMs: previewResult.data.llm.latencyMs ?? 0,
      usedLlm: Boolean(previewResult.data.llm.traceId),
    });
    setTestStep("result");
  };

  const handlePublishSelectedTestItem = async () => {
    if (!selectedTestItem || !channel) return;

    setIsPublishingTestPost(true);
    const publishResult = await channelService.publishChannelItem(channel.id, selectedTestItem.id, {
      previewGeneratedContent: testGeneratedContent,
      previewGeneratedContentFormat: testPreviewContentFormat,
      previewTraceId: testPreviewTraceId,
    });
    setIsPublishingTestPost(false);

    if (publishResult.ok === false) {
      toast.error(publishResult.error);
      return;
    }

    invalidateChannel();
    await refreshChannelData();
    toast.success(publishResult.data.reused ? "Публикация уже стоит в очереди" : "Публикация поставлена в очередь");
  };

  // ── Handlers ───────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!channel) return;
    await channelService.deleteChannel(channel.id, currentTeamId!);
    toast.success(`Канал "${channel.name}" удалён`);
    // Delay navigate so Radix AlertDialog portal can unmount cleanly
    setTimeout(() => navigate("/channels"), 0);
  };

  const handleToggleActive = async () => {
    if (!channel) return;
    const newState = !isChannelActive;
    // Мутируем через сервисный слой
    await channelService.toggleChannelActive(channel.id, currentTeamId!, newState);
    setIsChannelActive(newState);
    invalidateChannel();
    await refreshChannelData();
    toast.success(newState ? "Канал возобновлён" : "Канал поставлен на паузу");
  };

  const handleLinkSource = async (sourceId: string) => {
    const source = allTeamSources.find(s => s.id === sourceId);
    await channelService.linkSource(channelId!, sourceId);
    setLinkedSourceIds(prev => [...prev, sourceId]);
    invalidateChannel();
    await refreshChannelData();
    toast.success(`Источник "${source?.name ?? sourceId}" привязан`);
  };

  const handleUnlinkSource = async () => {
    if (!sourceToUnlink) return;
    const source = linkedSources.find(s => s.id === sourceToUnlink);
    await channelService.unlinkSource(channelId!, sourceToUnlink);
    setLinkedSourceIds(prev => prev.filter(id => id !== sourceToUnlink));
    invalidateChannel();
    await refreshChannelData();
    setSourceToUnlink(null);
    toast.success(`Источник "${source?.name ?? ""}" отвязан`);
  };

  const sourceBeingUnlinked = linkedSources.find(s => s.id === sourceToUnlink);
  const channelPublicUrl = channel ? channelService.getChannelPublicUrl(channel) : null;
  const channelDisplayLabel = channel ? channelService.getChannelDisplayLabel(channel) : "";
  const channelTechnicalId = channel ? channelService.getChannelTechnicalId(channel) : "";

  // ════════════════════════════════════════════════════════════════════
  return (
    <TeamScopeGuard state={channelState} notFoundLabel="Канал не найден или недоступен в этой команде">
    {(channel) => (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/channels" className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft className="size-3.5" />
          Каналы
        </Link>
        <span>/</span>
        <span className="text-gray-900">{channel.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{channel.name}</h1>
            {!isChannelActive ? (
              <Badge variant="secondary" className="gap-1">
                <Pause className="size-3" />
                На паузе
              </Badge>
            ) : channel.lastError ? (
              <Badge variant="destructive">Ошибка</Badge>
            ) : (
              <Badge variant="default">Активен</Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-500 text-sm">
            {channelPublicUrl ? (
              <a
                href={channelPublicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-100 px-1.5 py-0.5 rounded text-blue-600 hover:text-blue-700 text-sm"
              >
                {channelDisplayLabel}
              </a>
            ) : (
              <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 text-sm">
                {channelDisplayLabel}
              </span>
            )}
            <span>·</span>
            <span>ID: <span className="font-mono text-gray-700">{channelTechnicalId}</span></span>
            <span>·</span>
            <span>{team.name}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-3 inline" />
              {channel.subscribersCount.toLocaleString("ru-RU")} подписчиков
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            {channelService.getChannelTagsById(channel.id).map(t => (
              <TagBadge key={t.id} name={t.name} color={t.color} />
            ))}
            <AssignTagsPopover
              entityId={channel.id}
              teamId={currentTeamId!}
              kind="channel"
              allTags={channelService.getTeamChannelTags(currentTeamId!)}
              assignedTagIds={channelService.getChannelTagsById(channel.id).map(t => t.id)}
              onChanged={() => forceTagUpdate(n => n + 1)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap w-full sm:w-auto">
          {isChannelActive ? (
            <AlertDialog open={showPauseConfirm} onOpenChange={setShowPauseConfirm}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="text-amber-600 border-amber-200 hover:bg-amber-50"
                >
                  <Pause className="size-4 mr-2" />Поставить на паузу
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Поставить канал на паузу?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Канал <strong>{channel.name}</strong> будет приостановлен и новые посты не будут публиковаться.
                    <br /><br />
                    Сбор контента из источников продолжится. Вы сможете возобновить в любой момент.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => { handleToggleActive(); setShowPauseConfirm(false); }}
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    Да, поставить на паузу
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button
              variant="outline"
              onClick={handleToggleActive}
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              <Play className="size-4 mr-2" />Возобновить
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                <Trash2 className="size-4 mr-2" />
                Удалить
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить канал?</AlertDialogTitle>
                <AlertDialogDescription>
                  Вы уверены, что хотите удалить канал <strong>{channel.name}</strong>?
                  <br /><br />
                  Все настройки и история публикаций будут потеряны.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                  Удалить канал
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Paused banner */}
      {!isChannelActive && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm bg-amber-50 text-amber-800 border border-amber-200">
          <div className="flex items-center gap-2.5">
            <Pause className="size-4 shrink-0" />
            <span>Канал на паузе — публикации приостановлены. Новый контент из источников продолжает собираться, но не публикуется.</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 text-green-600 border-green-300 hover:bg-green-50"
            onClick={handleToggleActive}
          >
            <Play className="size-3.5 mr-1.5" />
            Возобновить
          </Button>
        </div>
      )}

      {/* botCanPost warning banner */}
      {!channel.botCanPost && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm bg-red-50 text-red-800 border border-red-200">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="size-4 shrink-0" />
            <span>Бот не имеет прав на публикацию в этом канале. Добавьте <strong>{botUsername ? `@${botUsername}` : 'бота'}</strong> как администратора канала с правом отправки сообщений.</span>
          </div>
        </div>
      )}

      {/* Error / Warning banner */}
      {channel.lastError && (
        <div className="flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{channel.lastError}</span>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="w-max sm:w-fit">
            <TabsTrigger value="overview" className="gap-1.5">
              <LayoutDashboard className="size-3.5" />
              Обзор
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <Newspaper className="size-3.5" />
              <span className="hidden sm:inline">История</span> публикаций
              {(recentPostsResult?.total ?? postsTotal) > 0 && (
                <span className="ml-0.5 text-xs font-medium leading-5 text-gray-500">
                  {recentPostsResult?.total ?? postsTotal}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="sources" className="gap-1.5">
              <Database className="size-3.5" />
              Источники
              {linkedSourceIds.length > 0 && (
                <span className="ml-0.5 text-xs font-medium leading-5 text-gray-500">
                  {linkedSourceIds.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <Settings className="size-3.5" />
              Настройки
            </TabsTrigger>
            <TabsTrigger value="testing" className="gap-1.5">
              <TestTube className="size-3.5" />
              <span className="hidden sm:inline">Тестирование</span><span className="sm:hidden">Тест</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ══════════════════════════════════════════════
            ОБЗОР
        ══════════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-5">

          {/* Row 1: Публикации + Статус */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Card: Подписчики + Публикации по периодам */}
            <Card className="overflow-hidden">
              <div className="px-5 pt-4 pb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-md bg-blue-50 flex items-center justify-center">
                    <FileText className="size-3.5 text-blue-500" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">Публикации</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Users className="size-3.5 text-gray-400" />
                  <span className="font-semibold text-gray-900 tabular-nums">{channel.subscribersCount.toLocaleString("ru-RU")}</span>
                  <span className="text-xs text-gray-400">подп.</span>
                </div>
              </div>
              <CardContent className="pt-3 pb-4">
                <div className="grid grid-cols-2 divide-x divide-y divide-border rounded-xl border border-border overflow-hidden">
                  {[
                    { label: "Сегодня", value: postsToday },
                    { label: "Неделя",  value: postsWeek  },
                    { label: "Месяц",   value: postsMonth  },
                    { label: "Всего",   value: postsTotal  },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col items-center justify-center bg-card px-2 py-3 transition-colors hover:bg-muted/40">
                      <span className="text-2xl font-bold text-foreground tabular-nums leading-none">{value}</span>
                      <span className="mt-1 text-xs text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Card: Статус канала */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Статус канала</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-6">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`size-7 rounded-md flex items-center justify-center shrink-0 ${
                        publishMode === "scheduled"
                          ? "bg-blue-50"
                          : publishMode === "every_material"
                            ? "bg-emerald-50"
                            : "bg-yellow-50"
                      }`}
                    >
                      {publishMode === "scheduled" ? (
                        <CalendarSchedule className="size-3.5 text-blue-500" />
                      ) : publishMode === "every_material" ? (
                        <Send className="size-3.5 text-emerald-600" />
                      ) : (
                        <Clock className="size-3.5 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Режим</p>
                      <p className="text-sm font-medium">{channelService.getChannelPublishModeLabel(publishMode)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Clock className="size-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Следующая</p>
                      <p className="text-sm font-medium">
                        {publishMode === "scheduled" ? nextPublication ?? "—" : nextPublication ?? "После появления нового материала"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                  <CheckCircle className="size-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Последняя публ.</p>
                      <p className="text-sm font-medium">
                        {channel.lastPublishedAt
                          ? new Date(channel.lastPublishedAt).toLocaleString("ru-RU", {
                              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                            })
                          : recentPosts[0]
                            ? new Date(recentPosts[0].postedAt).toLocaleString("ru-RU", {
                                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                              })
                            : "Никогда"}
                      </p>
                    </div>
                  </div>
                  {publishMode !== "scheduled" && (
                    <div className="col-span-2 sm:col-span-3 flex items-start gap-2.5 border-t pt-3 mt-0.5">
                      <div
                        className={`size-7 rounded-md flex items-center justify-center shrink-0 ${
                          publishMode === "every_material" ? "bg-emerald-50" : "bg-yellow-50"
                        }`}
                      >
                        <Clock className={`size-3.5 ${publishMode === "every_material" ? "text-emerald-600" : "text-yellow-600"}`} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">
                          {publishMode === "every_material" ? "Минимальный интервал между постами" : "Интервал публикации"}
                        </p>
                        <p className="text-sm font-medium">{channelService.formatPublishInterval(publishIntervalMin * 60)}</p>
                      </div>
                    </div>
                  )}
                  {publishMode === "scheduled" && scheduleHuman && (
                    <div className="col-span-2 sm:col-span-3 flex items-start gap-2.5 border-t pt-3 mt-0.5">
                      <div className="size-7 rounded-md bg-blue-50 flex items-center justify-center shrink-0">
                        <CalendarSchedule className="size-3.5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Расписание</p>
                        <p className="text-sm font-medium">{scheduleHuman}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Источники канала */}
          <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="size-4 text-green-500" />
                    <CardTitle className="text-base">Источники канала</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 text-xs h-7"
                    onClick={() => setActiveTab("sources")}
                  >
                    Управление →
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {linkedSources.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">
                    <Database className="size-8 mx-auto mb-2 text-gray-200" />
                    Источники не привязаны.{" "}
                    <button
                      className="text-blue-500 hover:underline"
                      onClick={() => setActiveTab("sources")}
                    >
                      Привязать
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Mobile: compact source cards */}
                    <div className="sm:hidden space-y-2">
                      {linkedSources.map(src => (
                        <Link key={src.id} to={`/sources/${src.id}`} className="block">
                          <div className="flex items-center justify-between gap-2 py-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <StatusDot status={src.status} />
                              <span className="font-medium text-sm truncate">{src.name}</span>
                              <span className="text-xs text-gray-400 shrink-0">{SOURCE_TYPE_LABEL[src.type]}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs tabular-nums shrink-0">
                              <span className="text-gray-500">{src.itemsCount24h} сег.</span>
                              <span className="text-blue-600 font-medium">{pubsBySource(src.id)} публ.</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    {/* Desktop: full table */}
                    <table className="w-full text-sm hidden sm:table">
                      <thead>
                    <tr className="border-b border-border">
                      <th className="w-16 pb-2 pr-4 text-left text-xs font-normal text-muted-foreground">Источник</th>
                      <th className="w-16 pb-2 text-right text-xs font-normal text-muted-foreground">Сегодня</th>
                      <th className="w-16 pb-2 text-right text-xs font-normal text-muted-foreground">Неделя</th>
                      <th className="w-16 pb-2 text-right text-xs font-normal text-muted-foreground">Месяц</th>
                      <th className="w-16 pb-2 text-right text-xs font-normal text-muted-foreground">Всего</th>
                      <th className="w-14 pb-2 text-right text-xs font-normal text-muted-foreground">Публ.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {linkedSources.map(src => (
                          <tr key={src.id} className="group">
                            <td className="py-2.5 pr-4">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <StatusDot status={src.status} />
                                <Link
                                  to={`/sources/${src.id}`}
                                  className="font-medium hover:text-blue-600 truncate"
                                >
                                  {src.name}
                                </Link>
                                <span className="text-xs text-gray-400 shrink-0">
                                  {SOURCE_TYPE_LABEL[src.type]}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 text-right tabular-nums text-gray-700">{src.itemsCount24h}</td>
                            <td className="py-2.5 text-right tabular-nums text-gray-700">{src.itemsCountWeek}</td>
                            <td className="py-2.5 text-right tabular-nums text-gray-700">{src.itemsCountMonth}</td>
                            <td className="py-2.5 text-right tabular-nums text-gray-700">{src.itemsCount}</td>
                            <td className="py-2.5 text-right tabular-nums font-medium text-blue-600">
                              {pubsBySource(src.id)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-xs text-gray-400 mt-2.5">
                      Публ. — использовано в публикациях этого канала
                    </p>
                  </div>
                )}
              </CardContent>
          </Card>

          {/* Row 3: Последние публикации */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Последние публикации</CardTitle>
                {postsTotal > OVERVIEW_RECENT_COUNT && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 text-xs h-7"
                    onClick={() => setActiveTab("history")}
                  >
                    Смотреть все →
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {recentPosts.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Публикаций пока нет
                </div>
              ) : (
                <div className="divide-y">
                  {recentPosts.map((pi) => (
                    <Link key={pi.id} to={`/posts/${pi.id}`}>
                  <div className="-mx-1 rounded px-1 py-2.5 transition-colors hover:bg-muted/40">
                      {/* Desktop row */}
                      <div className="hidden sm:flex items-center gap-3">
                        <span className={`size-1.5 rounded-full shrink-0 ${pi.status === "success" ? "bg-green-400" : "bg-red-400"}`} />
                        <span className="text-xs text-gray-400 shrink-0 w-24 tabular-nums">
                          {new Date(pi.postedAt).toLocaleString("ru-RU", {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                        <span className="text-sm text-gray-700 truncate flex-1 min-w-0">
                          {pi.generatedContent.replace(/\n/g, " ").substring(0, 80)}
                          {pi.generatedContent.length > 80 ? "…" : ""}
                        </span>
                        <span className="text-xs text-gray-400 shrink-0">{pi.sourceName}</span>
                        {pi.status === "success" ? (
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Eye className="size-3" />{pi.views?.toLocaleString("ru-RU") ?? "—"}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Heart className="size-3" />{pi.reactions?.toLocaleString("ru-RU") ?? "—"}
                            </span>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-red-400 shrink-0">
                            <AlertCircle className="size-3" />Ошибка
                          </span>
                        )}
                      </div>
                      {/* Mobile compact */}
                      <div className="sm:hidden">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`size-1.5 rounded-full shrink-0 ${pi.status === "success" ? "bg-green-400" : "bg-red-400"}`} />
                          <span className="text-sm text-gray-700 truncate flex-1 min-w-0">
                            {pi.generatedContent.replace(/\n/g, " ").substring(0, 60)}
                            {pi.generatedContent.length > 60 ? "…" : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 ml-3.5 text-xs text-gray-400">
                          <span className="tabular-nums">
                            {new Date(pi.postedAt).toLocaleString("ru-RU", {
                              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                          {pi.status === "success" ? (
                            <>
                              <span className="flex items-center gap-0.5"><Eye className="size-3" />{pi.views ?? "—"}</span>
                              <span className="flex items-center gap-0.5"><Heart className="size-3" />{pi.reactions ?? "—"}</span>
                            </>
                          ) : (
                            <span className="text-red-400">Ошибка</span>
                          )}
                        </div>
                      </div>
                    </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════
            ИСТОРИЯ ПУБЛИКАЦИЙ
        ══════════════════════════════════════════════ */}
        <TabsContent value="history" className="space-y-4">
          {/* Header + фильтры — без обёртки Card */}
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">История публикаций</h2>
              <p className="text-xs text-gray-400 mt-0.5">{postsTotal} публикаций всего</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline" size="sm"
                    className={`gap-2 ${dateRange ? "border-blue-400 text-blue-700 bg-blue-50" : ""}`}
                  >
                    <CalendarIcon className="size-3.5" />
                    {dateRange?.from ? (
                      dateRange.to
                        ? <>{dateRange.from.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} — {dateRange.to.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</>
                        : dateRange.from.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
                    ) : "Период"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) => {
                      setDateRange(range);
                      setHistoryPage(1);
                      if (range?.from && range?.to) setCalendarOpen(false);
                    }}
                    numberOfMonths={typeof window !== "undefined" && window.innerWidth < 640 ? 1 : 2}
                    disabled={{ after: new Date() }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as "all" | "success" | "failed"); setHistoryPage(1); }}>
                <SelectTrigger className={`h-8 w-full sm:w-36 text-xs ${statusFilter !== "all" ? "border-blue-400 text-blue-700 bg-blue-50" : ""}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="success">✅ Опубликован</SelectItem>
                  <SelectItem value="failed">❌ Ошибка</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="h-8 px-2 text-gray-400 hover:text-gray-600"
                  onClick={() => { setDateRange(undefined); setStatusFilter("all"); setHistoryPage(1); }}>
                  <X className="size-3.5 mr-1" />Сбросить
                </Button>
              )}
            </div>
          </div>

          {hasActiveFilters && (
            <p className="text-xs text-gray-400 -mt-2">
              Показано {historyTotal} из {postsTotal} публикаций
            </p>
          )}

          {/* Посты — каждый своя карточка */}
          {historyTotal === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-400">
                <Newspaper className="size-10 mx-auto mb-3 text-gray-200" />
                <p className="text-sm">
                  {hasActiveFilters ? "Нет публикаций, соответствующих фильтрам" : "Публикаций пока нет"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pageHistory.map((pi) => (
                <Card key={pi.id}>
                  <CardContent className="py-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={pi.status === "success" ? "default" : "destructive"} className="text-xs">
                            {pi.status === "success"
                              ? <><CheckCircle className="size-3 mr-1" />Опубликован</>
                              : <><AlertCircle className="size-3 mr-1" />Ошибка</>}
                          </Badge>
                          <span className="text-xs text-gray-400 tabular-nums">
                            {new Date(pi.postedAt).toLocaleString("ru-RU")}
                          </span>
                          {pi.status === "success" && (
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <Eye className="size-3" />{pi.views?.toLocaleString("ru-RU") ?? "—"}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <Heart className="size-3" />{pi.reactions?.toLocaleString("ru-RU") ?? "—"}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          <Link to={`/sources/${pi.sourceId}`} className="text-blue-600 hover:underline">{pi.sourceName}</Link>
                          {" · "}<span className="italic">{pi.itemTitle}</span>
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0 flex-wrap">
                        <Link to={`/posts/${pi.id}`}>
                          <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
                            <ExternalLink className="size-3" />Пост
                          </Button>
                        </Link>
                        <Link to={`/jobs/${pi.jobId}`}>
                          <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
                            <ExternalLink className="size-3" />Job
                          </Button>
                        </Link>
                        {pi.llmTraceId && (
                          <Link to={`/llm-traces/${pi.llmTraceId}`}>
                            <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
                              <ExternalLink className="size-3" />LLM
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                    {pi.mediaUrl && (
                      <img
                        src={pi.mediaUrl}
                        alt=""
                        className="w-full max-h-64 object-cover rounded-lg"
                      />
                    )}
                  <div className="rounded-lg bg-muted/40 px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                      {pi.generatedContent}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Пагинация снаружи карточек */}
          {historyTotal > 0 && (
            <Pagination
              currentPage={historyPage}
              totalPages={historyTotalPages}
              onPageChange={setHistoryPage}
              totalItems={historyTotal}
              pageSize={HISTORY_PAGE_SIZE}
            />
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════
            ИСТОЧНИКИ
        ══════════════════════════════════════════════ */}
        <TabsContent value="sources" className="space-y-4">
          {/* Header actions */}
          <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Привязанные источники
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {linkedSources.length} из {allTeamSources.length} источников привязано
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => { setLinkDialogTagFilter([]); setShowLinkDialog(true); }}
              disabled={availableToLink.length === 0}
            >
              <Plus className="size-4 mr-1.5" />
              Привязать источник
            </Button>
          </div>

          {/* Linked sources table */}
          {linkedSources.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-400">
                <Database className="size-10 mx-auto mb-3 text-gray-200" />
                <p className="text-sm">Нет привязанных источников</p>
                <p className="text-xs mt-1">
                  {allTeamSources.length === 0
                    ? <>Сначала добавьте источники в разделе <Link to="/sources" className="text-blue-500 hover:underline">Источники</Link></>
                    : "Нажмите «Привязть источник» чтобы добавить"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {linkedSources.map(src => {
                const usedCount = pubsBySource(src.id);
                return (
                  <Card key={src.id}>
                    <CardContent className="py-4">
                      <div className="flex flex-col sm:flex-row items-start gap-4">
                        {/* Left: name + meta */}
                        <div className="flex-1 min-w-0 w-full sm:w-auto">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Link
                              to={`/sources/${src.id}`}
                              className="font-medium text-gray-900 hover:text-blue-600 text-sm"
                            >
                              {src.name}
                            </Link>
                            <Badge variant="outline" className="text-xs capitalize">
                              {SOURCE_TYPE_LABEL[src.type]}
                            </Badge>
                            <SourceStatusBadge status={src.status} />
                          </div>
                          <p className="text-xs text-gray-400 mb-3 truncate">{src.url}</p>

                          {/* Stats row */}
                          <div className="flex flex-wrap gap-x-5 gap-y-2">
                            <StatChip label="Сегодня" value={src.itemsCount24h} />
                            <StatChip label="Неделя" value={src.itemsCountWeek} />
                            <StatChip label="Месяц" value={src.itemsCountMonth} />
                            <StatChip label="Всего собрано" value={src.itemsCount} />
                            <StatChip
                              label="Использовано в публ."
                              value={usedCount}
                              highlight={usedCount > 0}
                            />
                          </div>

                          {src.lastError && (
                            <div className="flex items-start gap-1.5 mt-2.5 text-xs text-red-700 bg-red-50 rounded px-2.5 py-1.5">
                              <AlertCircle className="size-3 shrink-0 mt-0.5" />
                              {src.lastError}
                            </div>
                          )}
                        </div>

                        {/* Right: last fetched + unlink */}
                        <div className="flex items-center sm:items-end sm:flex-col gap-2 shrink-0">
                          <span className="text-xs text-gray-400">
                            {src.lastFetchedAt
                              ? `Обновлён ${new Date(src.lastFetchedAt).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                              : "Не обновлялся"}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 border-red-200 hover:bg-red-50 text-xs h-7"
                            onClick={() => setSourceToUnlink(src.id)}
                          >
                            <Unlink className="size-3 mr-1" />
                            Отвязать
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Unlink confirmation dialog */}
          <AlertDialog open={!!sourceToUnlink} onOpenChange={open => !open && setSourceToUnlink(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Отвязать источник?</AlertDialogTitle>
                <AlertDialogDescription>
                  Источник <strong>{sourceBeingUnlinked?.name}</strong> будет отвязан от канала <strong>{channel.name}</strong>.
                  <br /><br />
                  История публикаций из этого источника останется. Источник не будет удалён из команды.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={handleUnlinkSource} className="bg-red-600 hover:bg-red-700">
                  Отвязать
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Link source dialog */}
          <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Привязать источник</DialogTitle>
                <DialogDescription>
                  Выберите источник из команды для привязки к каналу <strong>{channel.name}</strong>.
                </DialogDescription>
              </DialogHeader>
              {(() => {
                const teamSourceTags = sourceService.getTeamSourceTags(currentTeamId!);
                const filteredAvailable = linkDialogTagFilter.length === 0
                  ? availableToLink
                  : availableToLink.filter(s => {
                      const sTags = sourceService.getSourceTagsById(s.id);
                      return sTags.some(t => linkDialogTagFilter.includes(t.id));
                    });

                return availableToLink.length === 0 ? (
                  <div className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                    Все источники команды уже привязаны к этому каналу.
                  </div>
                ) : (
                  <div className="min-h-0 space-y-3">
                    {teamSourceTags.length > 0 && (
                      <TagFilter
                        tags={teamSourceTags}
                        selectedTagIds={linkDialogTagFilter}
                        onChange={setLinkDialogTagFilter}
                        label="Фильтр по тегам"
                      />
                    )}
                    <div className="max-h-80 space-y-2 overflow-x-hidden overflow-y-auto py-1 pr-1">
                      {filteredAvailable.map(src => (
                        <div
                          key={src.id}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-gray-800 sm:items-center"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <StatusDot status={src.status} />
                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 items-center gap-1.5">
                                <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{src.name}</span>
                                <Badge variant="outline" className="shrink-0 text-xs">{SOURCE_TYPE_LABEL[src.type]}</Badge>
                              </div>
                              <p className="truncate text-xs text-gray-400 dark:text-gray-500">{src.url}</p>
                              {(() => {
                                const tags = sourceService.getSourceTagsById(src.id);
                                return tags.length > 0 ? (
                                  <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                    {tags.map(t => (
                                      <TagBadge key={t.id} name={t.name} color={t.color} />
                                    ))}
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-3 self-start sm:self-center">
                            <div className="text-right">
                              <p className="text-xs text-gray-500 dark:text-gray-400">{src.itemsCount24h} сег.</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">{src.itemsCount} всего</p>
                            </div>
                            <Button size="sm" className="h-8 shrink-0 text-xs" onClick={() => handleLinkSource(src.id)}>
                              <LinkIcon className="size-3 mr-1" />
                              Привязать
                            </Button>
                          </div>
                        </div>
                      ))}
                      {filteredAvailable.length === 0 && linkDialogTagFilter.length > 0 && (
                        <div className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
                          Нет источников с выбранными тегами
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
              {allTeamSources.length === 0 && (
                <div className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  В команде нет источников.{" "}
                  <Link to="/sources" className="text-blue-600 hover:underline" onClick={() => setShowLinkDialog(false)}>
                    Добавить источник
                  </Link>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ══════════════════════════════════════════════
            НАСТРОЙКИ
        ═════════════════════════════════════════════ */}
        <TabsContent value="settings" className="space-y-5">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Telegram-метаданные</CardTitle>
                <p className="mt-1 text-sm text-gray-500">
                  Обновляет username, chat id, права бота и текущее число подписчиков через Telegram Bot API.
                </p>
              </div>
              <Button variant="outline" onClick={handleRefreshMetadata} disabled={isRefreshingMetadata}>
                {isRefreshingMetadata ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Обновляем...
                  </>
                ) : (
                  <>
                    <Users className="size-4 mr-2" />
                    Обновить инфо
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Публичный username</div>
                    <div className="mt-1 text-sm font-medium text-foreground">{channel.telegramUsername ? `@${channel.telegramUsername}` : "Не задан"}</div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Chat ID</div>
                    <div className="mt-1 font-mono text-sm text-foreground">{channelTechnicalId}</div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Подписчики</div>
                    <div className="mt-1 text-sm font-medium text-foreground">{channel.subscribersCount.toLocaleString("ru-RU")}</div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Права бота</div>
                <div className={`mt-1 text-sm font-medium ${channel.botCanPost ? "text-emerald-700" : "text-red-600"}`}>
                  {channel.botCanPost ? "Бот может публиковать" : "Бот не может публиковать"}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Стиль постов</CardTitle>
            </CardHeader>
            <CardContent className={skipLlmRewrite ? "opacity-60" : ""}>
              <div className="space-y-2">
                <Label htmlFor="postStyle" className="mb-2 block">Опишите желаемый стиль</Label>
                <Textarea
                  id="postStyle"
                  placeholder="Например: пиши кратко и неформально, используй эмодзи, обращайся на «ты», добавляй хэштеги..."
                  className="min-h-[100px]"
                  value={postStyle}
                  disabled={skipLlmRewrite}
                  onChange={(e) => setPostStyle(e.target.value)}
                />
                {skipLlmRewrite ? (
                  <p className="text-xs text-amber-600">
                    Этот блок не используется, пока включён режим публикации исходного текста без AI.
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">
                    Система уже знает, что нужно переписывать материал, сохраняя смысл и факты. Здесь укажите только стилистику: тон, формат, аудиторию, язык, хэштеги, эмодзи и т.д.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Политика публикации</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-foreground">Публиковать без фото</div>
                      <p className="text-xs leading-5 text-muted-foreground">
                        Канал всегда отправляет только текст, даже если у материала есть изображение или Telegram media.
                      </p>
                    </div>
                    <Switch checked={disableMedia} onCheckedChange={setDisableMedia} />
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-foreground">Публиковать исходный текст без AI</div>
                      <p className="text-xs leading-5 text-muted-foreground">
                        Материал публикуется без переписывания LLM. Если текст слишком длинный, он аккуратно обрезается по границе текста под лимит Telegram.
                      </p>
                    </div>
                    <Switch checked={skipLlmRewrite} onCheckedChange={setSkipLlmRewrite} />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Режим публикации</Label>
                <div className="flex flex-col sm:flex-row gap-3">
                  {[
                    { value: "periodic", label: "⏱️ Периодически", desc: "Публикует по интервалу: например, раз в 30 минут" },
                    { value: "scheduled", label: "📅 По расписанию", desc: "Публикует в заданные дни и время" },
                    { value: "every_material", label: "📰 Каждый материал", desc: "Публикует все новые материалы по очереди с минимальным интервалом" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setPublishMode(opt.value as "periodic" | "scheduled" | "every_material");
                        if (opt.value === "every_material") {
                          setContentStrategy("newest");
                        }
                      }}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors text-left ${
                        publishMode === opt.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {opt.label}
                      <div className="text-xs font-normal mt-0.5 text-gray-500">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              {publishMode !== "scheduled" && (
                <div className="border-t pt-5 space-y-2">
                  <Label htmlFor="publishIntervalMin">
                    {publishMode === "every_material" ? "Минимальный интервал между постами" : "Публиковать не чаще чем раз в"}
                  </Label>
                  <div className="flex items-center gap-3 max-w-sm">
                    <NumericInput
                      id="publishIntervalMin"
                      min={5}
                      max={24 * 60}
                      step={5}
                      value={publishIntervalMin}
                      fallbackValue={30}
                      onValueChange={setPublishIntervalMin}
                    />
                    <span className="text-sm text-gray-500 whitespace-nowrap">минут</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Допустимый диапазон: от 5 минут до 24 часов. Сейчас: {channelService.formatPublishInterval(publishIntervalMin * 60)}.
                  </p>
                </div>
              )}
              {publishMode === "scheduled" && (
                <div className="border-t pt-5">
                  <SchedulePicker value={scheduleValue} onChange={setScheduleValue} />
                </div>
              )}
              {publishMode === "every_material" ? (
                <div className="border-t pt-4">
                <div className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                    <span className="mt-0.5">ℹ️</span>
                    <span>С момента включения режима канал будет публиковать все новые материалы из привязанных источников по одному, соблюдая указанный минимальный интервал.</span>
                  </div>
                </div>
              ) : (
                <div className="border-t pt-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-3">Стратегия выбора контента</h4>
                    <Select value={contentStrategy} onValueChange={(v: "newest" | "agent") => setContentStrategy(v)}>
                      <SelectTrigger className="w-full sm:w-72"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Самый новый материал</SelectItem>
                        <SelectItem value="agent">На выбор агента (AI)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {contentStrategy === "agent" && (
                    <div className="space-y-2">
                      <Label htmlFor="agentInstructions">Инструкции для агента</Label>
                      <Textarea
                        id="agentInstructions"
                        placeholder="Например: выбирай самый интересный и актуальный материал, приоритет — эксклюзивы и громкие новости..."
                        className="min-h-[80px]"
                        value={agentInstructions}
                        onChange={(e) => setAgentInstructions(e.target.value)}
                      />
                      <p className="text-xs text-gray-400">
                        Объясните агенту, по какому принципу выбирать материал для публикации из накопленного контента
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sticky save bar */}
          <div
            className={`sticky bottom-4 z-10 transition-all duration-300 ease-out ${
              hasUnsavedChanges
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4 pointer-events-none"
            }`}
          >
            <div className="mx-auto max-w-2xl rounded-xl border border-blue-200 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-lg shadow-blue-100/50 dark:shadow-blue-900/30 px-4 sm:px-5 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2.5">
                <span className="relative flex size-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-blue-500" />
                </span>
                <span className="text-sm text-gray-600">Несохранённые изменения</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDiscardSettings}
                  disabled={isSaving}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Сбросить
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                      Сохранение…
                    </>
                  ) : (
                    <>
                      <Save className="size-3.5 mr-1.5" />
                      Сохранить
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

        </TabsContent>

        {/* ══════════════════════════════════════════════
            ТЕСТИРОВАНИЕ
        ═════════════════════════════════════════════ */}
        <TabsContent value="testing" className="space-y-5">
          <TestGenerationTab
            channel={channel}
            testItems={testItems}
            showTestDialog={showTestDialog}
            setShowTestDialog={setShowTestDialog}
            testStep={testStep}
            selectedTestItem={selectedTestItem}
            setSelectedTestItem={setSelectedTestItem}
            testProgress={testProgress}
            testGeneratedContent={testGeneratedContent}
            testLLMStats={testLLMStats}
            testPreviewTraceId={testPreviewTraceId}
            isPublishingTestPost={isPublishingTestPost}
            handleOpenTestDialog={handleOpenTestDialog}
            handleRunTestGeneration={handleRunTestGeneration}
            handlePublishSelectedTestItem={handlePublishSelectedTestItem}
          />
        </TabsContent>
      </Tabs>
    </div>
    )}
    </TeamScopeGuard>
  );
}

// ── Small reusable components ───────────────────────────────────────────────

function StatusDot({ status }: { status: "ok" | "error" }) {
  return (
    <span className={`size-2 rounded-full shrink-0 ${
      status === "ok" ? "bg-green-400" : "bg-red-400"
    }`} />
  );
}

function SourceStatusBadge({ status }: { status: "ok" | "error" }) {
  if (status === "ok") return <Badge variant="default" className="text-xs">OK</Badge>;
  return <Badge variant="destructive" className="text-xs">Ошибка</Badge>;
}

function StatChip({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${highlight ? "text-blue-600" : "text-gray-800"}`}>
        {value.toLocaleString("ru-RU")}
      </p>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveChannelSchedule(channel?: { scheduleJson?: { timezone: string; slots: Array<{ days: string[]; times: string[] }> } }) {
  if (channel?.scheduleJson?.slots?.length) {
    return structuredClone(channel.scheduleJson)
  }

  return createDefaultSchedule("UTC")
}

function resolveChannelPublishIntervalMinutes(channel?: { publishIntervalSec?: number | null }) {
  const seconds = channel?.publishIntervalSec && channel.publishIntervalSec > 0 ? channel.publishIntervalSec : 30 * 60
  return Math.min(24 * 60, Math.max(5, Math.round(seconds / 60)))
}

function getNextPublication(scheduleValue: {
  timezone: string;
  slots: Array<{ days: string[]; times: string[] }>;
}): string {
  const dayMap: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  const dayLabels = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
  const zonedNow = getZonedDateParts(scheduleValue.timezone);
  const currentDay = dayMap[zonedNow.weekdayShort.slice(0, 3) as keyof typeof dayMap] ?? 0;
  const currentTimeStr = `${String(zonedNow.hour).padStart(2, "0")}:${String(zonedNow.minute).padStart(2, "0")}`;

  const normalizedSlots = scheduleValue.slots
    .map((slot) => ({
      days: slot.days.map((day) => dayMap[day]).filter((day): day is number => day !== undefined).sort((a, b) => a - b),
      times: [...slot.times].sort(),
    }))
    .filter((slot) => slot.days.length > 0 && slot.times.length > 0);

  if (normalizedSlots.length === 0) return "—";

  for (const slot of normalizedSlots) {
    if (slot.days.includes(currentDay)) {
      const nextTime = slot.times.find((time) => time > currentTimeStr);
      if (nextTime) return `сегодня в ${nextTime} (${getTimezoneLabel(scheduleValue.timezone)})`;
    }
  }

  for (let offset = 1; offset <= 7; offset += 1) {
    const checkDay = (currentDay + offset) % 7;
    const matchingSlot = normalizedSlots.find((slot) => slot.days.includes(checkDay));
    if (matchingSlot) {
      const label = offset === 1 ? "завтра" : dayLabels[checkDay];
      return `${label} в ${matchingSlot.times[0]} (${getTimezoneLabel(scheduleValue.timezone)})`;
    }
  }

  return "—";
}

function getNextIntervalPublication(lastPublishedAt?: string, intervalSec?: number | null) {
  if (!intervalSec || intervalSec <= 0) {
    return null
  }

  if (!lastPublishedAt) {
    return null
  }

  const nextAt = new Date(new Date(lastPublishedAt).getTime() + intervalSec * 1000)
  return nextAt.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ── Test Generation Tab Component ────────────────────────────────────────────

function TestGenerationTab({
  channel, testItems, showTestDialog, setShowTestDialog,
  testStep, selectedTestItem, setSelectedTestItem,
  testProgress, testGeneratedContent, testLLMStats, testPreviewTraceId,
  isPublishingTestPost, handleOpenTestDialog, handleRunTestGeneration, handlePublishSelectedTestItem,
}: {
  channel: { name: string };
  testItems: Item[];
  showTestDialog: boolean;
  setShowTestDialog: (v: boolean) => void;
  testStep: "select" | "generating" | "result";
  selectedTestItem: Item | null;
  setSelectedTestItem: (v: Item | null) => void;
  testProgress: number;
  testGeneratedContent: string;
  testLLMStats: { model: string; tokens: number; cost: number; latencyMs: number; usedLlm: boolean };
  testPreviewTraceId: string | null;
  isPublishingTestPost: boolean;
  handleOpenTestDialog: () => void;
  handleRunTestGeneration: () => void | Promise<void>;
  handlePublishSelectedTestItem: () => void | Promise<void>;
}) {
  const [postExpanded, setPostExpanded] = useState(false);

  return (
    <>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Тестовая генерация</h3>
          <p className="text-sm text-gray-500 mt-1">
            Выберите материал из привязанных источников и запустите тестовую генерацию поста с текущими промптами канала.
            Пост не будет опубликован в канал.
          </p>
        </div>

        {testItems.length === 0 ? (
          <div className="border rounded-lg">
            <div className="text-center py-12">
              <FileText className="size-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500 mb-1">Нет доступных материалов</p>
              <p className="text-xs text-gray-400">Привяжите источники к каналу и дождитесь сбора контента</p>
            </div>
          </div>
        ) : (
          <>
            {/* Material selection */}
            <div className="border rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b">
                <span className="text-sm font-medium text-gray-700">Выберите материал</span>
                <span className="text-xs text-gray-400 ml-2">({testItems.length} доступно)</span>
              </div>
              <div className="divide-y max-h-[350px] overflow-y-auto">
                {testItems.map((item) => {
                  const source = sourceService.getSourceByIdSync(item.sourceId);
                  const isSelected = selectedTestItem?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedTestItem(item)}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        isSelected
                          ? "bg-blue-50 border-l-4 border-l-blue-500"
                          : "hover:bg-gray-50 border-l-4 border-l-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {item.title}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {item.content.substring(0, 120)}...
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {source?.name || item.sourceName}
                            </Badge>
                            <span className="text-xs text-gray-400">
                              {new Date(item.extractedAt).toLocaleDateString("ru-RU")}
                            </span>
                            <span className="text-xs text-gray-400">
                              {item.content.length.toLocaleString("ru-RU")} сим.
                            </span>
                          </div>
                        </div>
                        {item.mediaUrl && (
                          <img
                            src={item.mediaUrl}
                            alt=""
                            className="size-12 rounded object-cover flex-shrink-0"
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              disabled={!selectedTestItem}
              onClick={handleRunTestGeneration}
            >
              <Sparkles className="size-4 mr-2" />
              Сгенерировать пост
            </Button>
          </>
        )}
      </div>

      {/* Generation Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {testStep === "generating" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bot className="size-5 text-blue-600" />
                  Генерация поста...
                </DialogTitle>
                <DialogDescription>
                  LLM обрабатывает материал с промптами канала
                </DialogDescription>
              </DialogHeader>

              <div className="py-8 space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Обработка материала</span>
                    <span className="tabular-nums text-gray-400 dark:text-gray-500">{testProgress}%</span>
                  </div>
                  <Progress value={testProgress} className="h-2" />
                </div>

                <div className="space-y-2 rounded-lg bg-gray-50 p-3 font-mono text-xs text-gray-500 dark:bg-gray-900/70 dark:text-gray-400">
                  {testProgress >= 10 && <div className="flex items-center gap-2"><Loader2 className="size-3 animate-spin text-blue-500" /> Загрузка материала...</div>}
                  {testProgress >= 30 && <div className="flex items-center gap-2"><CheckCircle className="size-3 text-green-500" /> Материал загружен ({selectedTestItem?.content.length.toLocaleString("ru-RU")} сим.)</div>}
                  {testProgress >= 50 && <div className="flex items-center gap-2"><Loader2 className="size-3 animate-spin text-blue-500" /> Применение промптов канала...</div>}
                  {testProgress >= 70 && <div className="flex items-center gap-2"><Loader2 className="size-3 animate-spin text-blue-500" /> Генерация текста через LLM...</div>}
                  {testProgress >= 90 && <div className="flex items-center gap-2"><Loader2 className="size-3 animate-spin text-blue-500" /> Финализация...</div>}
                </div>

                <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-500/10">
                  <div className="mb-1 text-xs font-medium text-blue-700 dark:text-blue-300">Входной материал</div>
                  <div className="truncate text-xs text-blue-600 dark:text-blue-200">{selectedTestItem?.title}</div>
                </div>
              </div>
            </>
          )}

          {testStep === "result" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle className="size-5 text-green-600" />
                  Генерация завершена
                </DialogTitle>
                <DialogDescription>
                  Тестовый пост сгенерирован. Он не будет опубликован в канал.
                </DialogDescription>
              </DialogHeader>

              {!testLLMStats.usedLlm && (
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  Текст подготовлен без AI. Канал возьмёт исходный материал и при необходимости обрежет его по границе текста.
                </div>
              )}

              {/* LLM Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-lg bg-gray-50 px-3 py-2 text-center dark:bg-gray-900/70">
                  <div className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">Модель</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{testLLMStats.model}</div>
                </div>
                <div className="rounded-lg bg-gray-50 px-3 py-2 text-center dark:bg-gray-900/70">
                  <div className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">Токены</div>
                  <div className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">{testLLMStats.tokens.toLocaleString("ru-RU")}</div>
                </div>
                <div className="rounded-lg bg-gray-50 px-3 py-2 text-center dark:bg-gray-900/70">
                  <div className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">Стоимость</div>
                  <div className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">{testLLMStats.cost > 0 ? `$${testLLMStats.cost}` : "—"}</div>
                </div>
              </div>

              {/* Source material */}
              <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900/70">
                  <div className="flex items-center gap-2">
                    <FileText className="size-3.5 text-gray-400 dark:text-gray-500" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Исходный материал</span>
                  </div>
                </div>
                <div className="px-3 py-2">
                  <div className="mb-1 text-sm font-medium text-gray-900 dark:text-gray-100">{selectedTestItem?.title}</div>
                  <div className="line-clamp-3 text-xs text-gray-500 dark:text-gray-400">{selectedTestItem?.content.substring(0, 200)}...</div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{selectedTestItem?.sourceName}</Badge>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {selectedTestItem && new Date(selectedTestItem.extractedAt).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Generated post — expandable */}
              <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setPostExpanded(!postExpanded)}
                  className="flex w-full items-center justify-between border-b border-green-100 bg-green-50 px-3 py-2 transition-colors hover:bg-green-100 dark:border-green-500/20 dark:bg-green-500/10 dark:hover:bg-green-500/15"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-3.5 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-300">Сгенерированный пост</span>
                  </div>
                  {postExpanded ? (
                    <ChevronUp className="size-3.5 text-green-600 dark:text-green-400" />
                  ) : (
                    <ChevronDown className="size-3.5 text-green-600 dark:text-green-400" />
                  )}
                </button>
                <div className="p-3 space-y-2">
                  {selectedTestItem?.mediaUrl && (
                    <img
                      src={selectedTestItem.mediaUrl}
                      alt=""
                      className="w-full max-h-48 object-cover rounded-lg"
                    />
                  )}
                  <pre className={`font-sans whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 ${
                    !postExpanded ? "line-clamp-4" : ""
                  }`}>
                    {testGeneratedContent}
                  </pre>
                  {!postExpanded && (
                    <button
                      type="button"
                      onClick={() => setPostExpanded(true)}
                      className="mt-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Показать полностью
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-between gap-2 border-t border-gray-200 pt-2 dark:border-gray-800">
                <Button variant="outline" onClick={() => { setPostExpanded(false); handleOpenTestDialog(); }}>
                  <TestTube className="size-4 mr-2" />
                  Новый тест
                </Button>
                <Button onClick={handlePublishSelectedTestItem} disabled={isPublishingTestPost}>
                  {isPublishingTestPost ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="size-4 mr-2" />
                  )}
                  Опубликовать
                </Button>
                <Button variant="outline" onClick={() => { setPostExpanded(false); setShowTestDialog(false); }}>
                  Закрыть
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
