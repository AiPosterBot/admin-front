import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Link, useParams, useNavigate } from "react-router";
import {
  Save, Link as LinkIcon, Unlink, TestTube, ArrowLeft, CheckCircle,
  ExternalLink, Trash2, Eye, Heart, CalendarIcon, X, LayoutDashboard,
  History, Settings, Database, Clock, Zap, Calendar as CalendarSchedule,
  TrendingUp, FileText, AlertCircle, Plus, Newspaper, Pause, Play,
  Users, Loader2, Bot, Sparkles, DollarSign, ChevronDown, ChevronUp,
  ShieldAlert,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
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
import { SchedulePicker, scheduleToCron, scheduleToHuman } from "../components/SchedulePicker";
import { Progress } from "../components/ui/progress";
import { Pagination, usePagination } from "../components/Pagination";
import {
  type Item,
} from "../data/mock-data";
import { useTeam } from "../context/TeamContext";
import type { DateRange } from "react-day-picker";
// ── Service + guard layer ─────────────────────────────────────────────
import * as channelService from "../services/channelService";
import * as sourceService from "../services/sourceService";
import * as postService from "../services/postService";
import * as itemService from "../services/itemService";
import * as teamService from "../services/teamService";
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

export function ChannelDetailPage() {
  const { channelId } = useParams();
  const { currentTeamId } = useTeam();
  const navigate = useNavigate();
  const team = teamService.getTeamById(currentTeamId);

  // ── Team scope guard: хук загружает канал через сервис и
  //    автоматически редиректит если он не принадлежит текущей команде ──
  const { state: channelState } = useTeamScopedEntity(
    () => channelService.getChannelById(channelId!, currentTeamId!),
    [channelId, currentTeamId],
    "/channels",
  );
  // Локальная ссылка для TypeScript — будет undefined пока загружается
  const channel = channelState.status === "success" ? channelState.data : undefined;

  // ── UI State ────────────────────────────────────────────────────────
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testStep, setTestStep] = useState<"select" | "generating" | "result">("select");
  const [selectedTestItem, setSelectedTestItem] = useState<Item | null>(null);
  const [testGeneratedContent, setTestGeneratedContent] = useState("");
  const [testLLMStats, setTestLLMStats] = useState({ model: "", tokens: 0, cost: 0, latencyMs: 0 });
  const [testProgress, setTestProgress] = useState(0);
  const [publishMode, setPublishMode] = useState(channel?.publishMode || "instant");
  // ИСПРАВЛЕНО: читаем contentStrategy из channel, а не хардкод "newest"
  const [contentStrategy, setContentStrategy] = useState<"newest" | "agent">(channel?.contentStrategy || "newest");
  const [scheduleValue, setScheduleValue] = useState({
    days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    times: channel?.cron ? parseCronTimes(channel.cron) : ["09:00"],
    timezone: channel?.timezone || "UTC",
  });

  // ── Settings form state (controlled) ──────────────────────────────────
  const [postStyle, setPostStyle] = useState(channel?.postStyle || "");
  const [agentInstructions, setAgentInstructions] = useState(channel?.agentInstructions || "");

  const [isSaving, setIsSaving] = useState(false);

  // Track initial values for dirty detection
  const initialSettings = useRef({
    postStyle: channel?.postStyle || "",
    agentInstructions: channel?.agentInstructions || "",

    publishMode: channel?.publishMode || "instant",
    contentStrategy: (channel?.contentStrategy || "newest") as "newest" | "agent",
    scheduleValue: {
      days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      times: channel?.cron ? parseCronTimes(channel.cron) : ["09:00"],
      timezone: channel?.timezone || "UTC",
    },
  });

  const hasUnsavedChanges =
    postStyle !== initialSettings.current.postStyle ||
    agentInstructions !== initialSettings.current.agentInstructions ||

    publishMode !== initialSettings.current.publishMode ||
    contentStrategy !== initialSettings.current.contentStrategy ||
    JSON.stringify(scheduleValue) !== JSON.stringify(initialSettings.current.scheduleValue);

  const handleSaveSettings = useCallback(() => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      // Обновляем через сервис (patch mock-data под капотом)
      if (channel) {
        channelService.updateChannelSettings(channel.id, currentTeamId!, {
          postStyle,
          agentInstructions,
          contentStrategy,
          publishMode: publishMode as "instant" | "scheduled",
          cron: publishMode === "scheduled" ? scheduleToCron(scheduleValue) : undefined,
          timezone: publishMode === "scheduled" ? scheduleValue.timezone : undefined,
        });
      }
      // Update initial ref
      initialSettings.current = {
        postStyle,
        agentInstructions,
        publishMode,
        contentStrategy,
        scheduleValue: { ...scheduleValue },
      };
      setIsSaving(false);
      toast.success("Настройки сохранены", {
        description: "Изменения канала применены успешно",
      });
    }, 600);
  }, [channel, postStyle, agentInstructions, publishMode, contentStrategy, scheduleValue]);

  const handleDiscardSettings = useCallback(() => {
    setPostStyle(initialSettings.current.postStyle);
    setAgentInstructions(initialSettings.current.agentInstructions);

    setPublishMode(initialSettings.current.publishMode);
    setContentStrategy(initialSettings.current.contentStrategy);
    setScheduleValue({ ...initialSettings.current.scheduleValue });
    toast("Изменения отменены");
  }, []);
  const [historyPage, setHistoryPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // ── Channel active state (pause/resume) ─────────────────────────────
  // Инициал��зируется после загрузки канала через useEffect
  const [isChannelActive, setIsChannelActive] = useState(true);
  // Синхронизируем все form-состояния при загрузке канала через хук
  useEffect(() => {
    if (channelState.status !== "success") return;
    const ch = channelState.data;
    setIsChannelActive(ch.isActive);
    setPublishMode(ch.publishMode || "instant");
    setContentStrategy(ch.contentStrategy || "newest");
    setScheduleValue({
      days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      times: ch.cron ? parseCronTimes(ch.cron) : ["09:00"],
      timezone: ch.timezone || "UTC",
    });
    setPostStyle(ch.postStyle || "");
    setAgentInstructions(ch.agentInstructions || "");
    initialSettings.current = {
      postStyle: ch.postStyle || "",
      agentInstructions: ch.agentInstructions || "",
      publishMode: ch.publishMode || "instant",
      contentStrategy: (ch.contentStrategy || "newest") as "newest" | "agent",
      scheduleValue: {
        days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
        times: ch.cron ? parseCronTimes(ch.cron) : ["09:00"],
        timezone: ch.timezone || "UTC",
      },
    };
  }, [channelState.status]); // eslint-disable-line react-hooks/exhaustive-deps
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);

  // ── Sources link/unlink state ──────────────────────────────────────
  const [linkedSourceIds, setLinkedSourceIds] = useState<string[]>(
    channelService.getLinkedSourceIds(channelId ?? "")
  );
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [sourceToUnlink, setSourceToUnlink] = useState<string | null>(null);
  const [, forceTagUpdate] = useState(0);
  const [linkDialogTagFilter, setLinkDialogTagFilter] = useState<string[]>([]);

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
  const linkedSources = allTeamSources.filter(s => linkedSourceIds.includes(s.id));
  const availableToLink = allTeamSources.filter(s => !linkedSourceIds.includes(s.id));

  // ── Computed: publications (через сервис) ────────────────────────────
  const allPostedItems = postService.getPostsByChannelId(channelId ?? "")
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const successItems = allPostedItems.filter(p => p.status === "success");
  const postsToday  = successItems.filter(p => p.postedAt.startsWith(todayStr)).length;
  const postsWeek   = successItems.filter(p => new Date(p.postedAt) >= weekAgo).length;
  const postsMonth  = successItems.filter(p => new Date(p.postedAt) >= monthAgo).length;
  const postsTotal  = successItems.length;
  const recentPosts = allPostedItems.slice(0, OVERVIEW_RECENT_COUNT);

  // Публикаций из каждого источника в этом канале
  const pubsBySource = (sourceId: string) =>
    successItems.filter(p => p.sourceId === sourceId).length;

  // ── Schedule ────────────────────────────────────────────────────────
  const nextPublication = publishMode === "scheduled"
    ? getNextPublication(scheduleValue)
    : null;
  const scheduleHuman = publishMode === "scheduled" ? scheduleToHuman(scheduleValue) : "";

  // ── Filtered history ───────────────────────────────────────────���─────
  const filteredPostedItems = allPostedItems.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (dateRange?.from) {
      const d = new Date(p.postedAt);
      const from = new Date(dateRange.from); from.setHours(0, 0, 0, 0);
      if (d < from) return false;
    }
    if (dateRange?.to) {
      const d = new Date(p.postedAt);
      const to = new Date(dateRange.to); to.setHours(23, 59, 59, 999);
      if (d > to) return false;
    }
    return true;
  });
  const hasActiveFilters = statusFilter !== "all" || !!dateRange;

  const { totalPages: historyTotalPages, paginate: historyPaginate, totalItems: historyTotal } =
    usePagination(filteredPostedItems, HISTORY_PAGE_SIZE);
  const pageHistory = historyPaginate(historyPage);

  // ── Test generation materials (через сервис) ─────────────────────────
  const testItems = itemService.getTeamItemsList(currentTeamId!)
    .filter(i => linkedSourceIds.includes(i.sourceId))
    .sort((a, b) => new Date(b.extractedAt).getTime() - new Date(a.extractedAt).getTime())
    .slice(0, 20);

  const handleOpenTestDialog = () => {
    setTestStep("select");
    setSelectedTestItem(null);
    setTestGeneratedContent("");
    setTestProgress(0);
    setShowTestDialog(false);
  };

  const handleRunTestGeneration = () => {
    if (!selectedTestItem) return;
    setTestStep("generating");
    setTestProgress(0);
    setShowTestDialog(true);

    // Simulate LLM generation with progress
    const totalDuration = 2500;
    const steps = 20;
    const stepDuration = totalDuration / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      setTestProgress(Math.min(Math.round((step / steps) * 100), 100));
      if (step >= steps) {
        clearInterval(interval);
        // Generate mock result
        const generatedPost =
          `${selectedTestItem.title}\n\n` +
          `${selectedTestItem.content.substring(0, 300)}...\n\n` +
          `#news #tech #AI`;
        const latency = 1800 + Math.round(Math.random() * 1200);
        const promptTokens = 400 + Math.round(Math.random() * 300);
        const completionTokens = 200 + Math.round(Math.random() * 200);
        const totalTokens = promptTokens + completionTokens;
        setTestGeneratedContent(generatedPost);
        setTestLLMStats({
          model: "gpt-4o",
          tokens: totalTokens,
          cost: parseFloat((totalTokens * 0.00003).toFixed(4)),
          latencyMs: latency,
        });
        setTestStep("result");
      }
    }, stepDuration);
  };

  // ── Handlers ──────────────────────────���──────────────────────────────

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
    // Мутируем через сервис (mock-data patch под капотом)
    await channelService.toggleChannelActive(channel.id, currentTeamId!, newState);
    setIsChannelActive(newState);
    toast.success(newState ? "Канал возобновлён" : "Канал поставлен на паузу");
  };

  const handleLinkSource = async (sourceId: string) => {
    const source = allTeamSources.find(s => s.id === sourceId);
    await channelService.linkSource(channelId!, sourceId);
    setLinkedSourceIds(prev => [...prev, sourceId]);
    setShowLinkDialog(false);
    toast.success(`Источник "${source?.name ?? sourceId}" привязан`);
  };

  const handleUnlinkSource = async () => {
    if (!sourceToUnlink) return;
    const source = linkedSources.find(s => s.id === sourceToUnlink);
    await channelService.unlinkSource(channelId!, sourceToUnlink);
    setLinkedSourceIds(prev => prev.filter(id => id !== sourceToUnlink));
    setSourceToUnlink(null);
    toast.success(`Источ��ик "${source?.name ?? ""}" отвязан`);
  };

  const sourceBeingUnlinked = linkedSources.find(s => s.id === sourceToUnlink);

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
          <p className="text-gray-500 text-sm">
            <a
              href={`https://t.me/${channel.telegramId.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-100 px-1.5 py-0.5 rounded text-blue-600 hover:text-blue-700 text-sm"
            >
              {channel.telegramId}
            </a>
            {" · "}{team.name}
            {" · "}
            <span className="inline-flex items-center gap-1">
              <Users className="size-3 inline" />
              {channel.subscribersCount.toLocaleString("ru-RU")} подписчиков
            </span>
          </p>
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
                  Все настройки и история публика��ий будут потеряны.
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
            <span>Бот не имеет прав на публикацию в этом канале. Добавьте <strong>@ai_poster_bot</strong> как администратора канала с правом отправки сообщений.</span>
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
            </TabsTrigger>
            <TabsTrigger value="sources" className="gap-1.5">
              <Database className="size-3.5" />
              Источники
              {linkedSourceIds.length > 0 && (
                <span className="ml-1 bg-gray-200 text-gray-600 text-xs rounded-full px-1.5 py-0 leading-5">
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
                <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                  {[
                    { label: "Сегодня", value: postsToday },
                    { label: "Неделя",  value: postsWeek  },
                    { label: "Месяц",   value: postsMonth  },
                    { label: "Всего",   value: postsTotal  },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col items-center justify-center py-3 px-2 bg-white hover:bg-gray-50 transition-colors">
                      <span className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{value}</span>
                      <span className="text-xs text-gray-400 mt-1">{label}</span>
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
                    <div className={`size-7 rounded-md flex items-center justify-center shrink-0 ${publishMode === "instant" ? "bg-yellow-50" : "bg-blue-50"}`}>
                      {publishMode === "instant"
                        ? <Zap className="size-3.5 text-yellow-500" />
                        : <CalendarSchedule className="size-3.5 text-blue-500" />}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Режим</p>
                      <p className="text-sm font-medium">{publishMode === "instant" ? "Мгновенный" : "По расписанию"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="size-7 rounded-md bg-gray-50 flex items-center justify-center shrink-0">
                      <Clock className="size-3.5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Следующая</p>
                      <p className="text-sm font-medium">
                        {publishMode === "instant" ? "При новом материале" : nextPublication ?? "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="size-7 rounded-md bg-gray-50 flex items-center justify-center shrink-0">
                      <CheckCircle className="size-3.5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Последняя публ.</p>
                      <p className="text-sm font-medium">
                        {channel.lastPublishedAt
                          ? new Date(channel.lastPublishedAt).toLocaleString("ru-RU", {
                              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                            })
                          : allPostedItems[0]
                            ? new Date(allPostedItems[0].postedAt).toLocaleString("ru-RU", {
                                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                              })
                            : "Никогда"}
                      </p>
                    </div>
                  </div>
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
                        <tr className="border-b border-gray-100">
                          <th className="pb-2 text-left text-xs font-normal text-gray-400 pr-4">Источник</th>
                          <th className="pb-2 text-right text-xs font-normal text-gray-400 w-16">Сегодня</th>
                          <th className="pb-2 text-right text-xs font-normal text-gray-400 w-16">Неделя</th>
                          <th className="pb-2 text-right text-xs font-normal text-gray-400 w-16">Месяц</th>
                          <th className="pb-2 text-right text-xs font-normal text-gray-400 w-16">Всего</th>
                          <th className="pb-2 text-right text-xs font-normal text-gray-400 w-14">Публ.</th>
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
                <CardTitle className="text-base">Посление публикации</CardTitle>
                {allPostedItems.length > OVERVIEW_RECENT_COUNT && (
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
                <div className="text-center py-8 text-gray-400 text-sm">
                  Публикаций пока нет
                </div>
              ) : (
                <div className="divide-y">
                  {recentPosts.map((pi) => (
                    <Link key={pi.id} to={`/posts/${pi.id}`}>
                    <div className="py-2.5 hover:bg-gray-50 transition-colors -mx-1 px-1 rounded">
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
              <p className="text-xs text-gray-400 mt-0.5">{allPostedItems.length} публикаций всего</p>
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
              Показано {filteredPostedItems.length} из {allPostedItems.length} публикаций
            </p>
          )}

          {/* Посты — каждый своя карточка */}
          {filteredPostedItems.length === 0 ? (
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
                    <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {pi.generatedContent}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Пагинация снаружи карточек */}
          {filteredPostedItems.length > 0 && (
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
                <AlertDialogTitle>Отвязать истоник?</AlertDialogTitle>
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
            <DialogContent className="max-w-lg">
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
                  <div className="py-6 text-center text-gray-400 text-sm">
                    Все источники команды уже привязаны к этому каналу.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {teamSourceTags.length > 0 && (
                      <TagFilter
                        tags={teamSourceTags}
                        selectedTagIds={linkDialogTagFilter}
                        onChange={setLinkDialogTagFilter}
                        label="Фильтр по тегам"
                      />
                    )}
                    <div className="space-y-2 max-h-80 overflow-y-auto py-1">
                      {filteredAvailable.map(src => (
                        <div
                          key={src.id}
                          className="flex items-center justify-between gap-3 border rounded-lg px-3 py-2.5"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <StatusDot status={src.status} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium text-gray-900 truncate">{src.name}</span>
                                <Badge variant="outline" className="text-xs">{SOURCE_TYPE_LABEL[src.type]}</Badge>
                              </div>
                              <p className="text-xs text-gray-400 truncate">{src.url}</p>
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
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="text-xs text-gray-500">{src.itemsCount24h} сег.</p>
                              <p className="text-xs text-gray-400">{src.itemsCount} всего</p>
                            </div>
                            <Button size="sm" className="h-7 text-xs" onClick={() => handleLinkSource(src.id)}>
                              <LinkIcon className="size-3 mr-1" />
                              Привязать
                            </Button>
                          </div>
                        </div>
                      ))}
                      {filteredAvailable.length === 0 && linkDialogTagFilter.length > 0 && (
                        <div className="py-4 text-center text-gray-400 text-sm">
                          Нет источников с выбранными тегами
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
              {allTeamSources.length === 0 && (
                <div className="text-center py-4 text-sm text-gray-500">
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
            <CardHeader>
              <CardTitle>Стиль постов</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="postStyle" className="mb-2 block">Опишите желаемый стиль</Label>
                <Textarea
                  id="postStyle"
                  placeholder="Например: пиши кратко и неформально, используй эмодзи, обращайся на «ты», добавляй хэштеги..."
                  className="min-h-[100px]"
                  value={postStyle}
                  onChange={(e) => setPostStyle(e.target.value)}
                />
                <p className="text-xs text-gray-400">
                  Система уже знает, что нужно переписывать материал, сохраняя смысл и факты. Здесь укажите только стилистику: тон, формат, аудиторию, язык, хэштеги, эмодзи и т.д.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Политика публикации</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Режим публикации</Label>
                <div className="flex flex-col sm:flex-row gap-3">
                  {[
                    { value: "instant", label: "⚡ Мгновенный", desc: "Публикация на каждый новый материал из привязанных источников" },
                    { value: "scheduled", label: "🗓️ По расписанию", desc: "Публикует в заданное время" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPublishMode(opt.value)}
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
              {publishMode === "scheduled" && (
                <div className="border-t pt-5">
                  <SchedulePicker value={scheduleValue} onChange={setScheduleValue} />
                </div>
              )}
              {publishMode === "instant" ? (
                <div className="border-t pt-4">
                  <div className="flex items-start gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2.5">
                    <span className="mt-0.5">ℹ️</span>
                    <span>Пост публикуется на каждый новый материал из привязанных источников. Минимальный перерыв между публикациями — 5 минут.</span>
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
            handleOpenTestDialog={handleOpenTestDialog}
            handleRunTestGeneration={handleRunTestGeneration}
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

function parseCronTimes(cron: string): string[] {
  try {
    const parts = cron.split(" ");
    const minutes = parts[0] || "0";
    const hours = parts[1] || "9";
    return hours.split(",").map(h => `${h.padStart(2, "0")}:${minutes.padStart(2, "0")}`);
  } catch {
    return ["09:00"];
  }
}

function getNextPublication(scheduleValue: {
  days: string[];
  times: string[];
  timezone: string;
}): string {
  const dayMap: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  const dayLabels = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
  const now = new Date();
  const currentDay = now.getDay();
  const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const sortedTimes = [...scheduleValue.times].sort();
  const scheduledDays = scheduleValue.days
    .map(d => dayMap[d]).filter(n => n !== undefined).sort((a, b) => a - b);
  if (scheduledDays.length === 0 || sortedTimes.length === 0) return "—";
  if (scheduledDays.includes(currentDay)) {
    const nextTime = sortedTimes.find(t => t > currentTimeStr);
    if (nextTime) return `сегодня в ${nextTime} (${scheduleValue.timezone})`;
  }
  for (let i = 1; i <= 7; i++) {
    const checkDay = (currentDay + i) % 7;
    if (scheduledDays.includes(checkDay)) {
      const label = i === 1 ? "завтра" : dayLabels[checkDay];
      return `${label} в ${sortedTimes[0]} (${scheduleValue.timezone})`;
    }
  }
  return "—";
}

// ── Test Generation Tab Component ────────────────────────────────────────────

function TestGenerationTab({
  channel, testItems, showTestDialog, setShowTestDialog,
  testStep, selectedTestItem, setSelectedTestItem,
  testProgress, testGeneratedContent, testLLMStats,
  handleOpenTestDialog, handleRunTestGeneration,
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
  testLLMStats: { model: string; tokens: number; cost: number; latencyMs: number };
  handleOpenTestDialog: () => void;
  handleRunTestGeneration: () => void;
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
                    <span className="text-gray-600">Обработка через gpt-4o</span>
                    <span className="text-gray-400 tabular-nums">{testProgress}%</span>
                  </div>
                  <Progress value={testProgress} className="h-2" />
                </div>

                <div className="space-y-2 text-xs text-gray-500 font-mono bg-gray-50 rounded-lg p-3">
                  {testProgress >= 10 && <div className="flex items-center gap-2"><Loader2 className="size-3 animate-spin text-blue-500" /> Загрузка материала...</div>}
                  {testProgress >= 30 && <div className="flex items-center gap-2"><CheckCircle className="size-3 text-green-500" /> Материал загружен ({selectedTestItem?.content.length.toLocaleString("ru-RU")} сим.)</div>}
                  {testProgress >= 50 && <div className="flex items-center gap-2"><Loader2 className="size-3 animate-spin text-blue-500" /> Применение промптов канала...</div>}
                  {testProgress >= 70 && <div className="flex items-center gap-2"><Loader2 className="size-3 animate-spin text-blue-500" /> Генерация текста через LLM...</div>}
                  {testProgress >= 90 && <div className="flex items-center gap-2"><Loader2 className="size-3 animate-spin text-blue-500" /> Финализация...</div>}
                </div>

                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs text-blue-700 font-medium mb-1">Входной материал</div>
                  <div className="text-xs text-blue-600 truncate">{selectedTestItem?.title}</div>
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

              {/* LLM Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                  <div className="text-xs text-gray-500 mb-0.5">Модель</div>
                  <div className="text-sm font-semibold text-gray-900">{testLLMStats.model}</div>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                  <div className="text-xs text-gray-500 mb-0.5">Токены</div>
                  <div className="text-sm font-semibold text-gray-900 tabular-nums">{testLLMStats.tokens.toLocaleString("ru-RU")}</div>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                  <div className="text-xs text-gray-500 mb-0.5">Стоимость</div>
                  <div className="text-sm font-semibold text-gray-900 tabular-nums">${testLLMStats.cost}</div>
                </div>
              </div>

              {/* Source material */}
              <div className="border rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b">
                  <div className="flex items-center gap-2">
                    <FileText className="size-3.5 text-gray-400" />
                    <span className="text-xs font-medium text-gray-600">Исходный материал</span>
                  </div>
                </div>
                <div className="px-3 py-2">
                  <div className="text-sm font-medium text-gray-900 mb-1">{selectedTestItem?.title}</div>
                  <div className="text-xs text-gray-500 line-clamp-3">{selectedTestItem?.content.substring(0, 200)}...</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="outline" className="text-xs">{selectedTestItem?.sourceName}</Badge>
                    <span className="text-xs text-gray-400">
                      {selectedTestItem && new Date(selectedTestItem.extractedAt).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Generated post — expandable */}
              <div className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPostExpanded(!postExpanded)}
                  className="w-full px-3 py-2 bg-green-50 border-b border-green-100 flex items-center justify-between hover:bg-green-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-3.5 text-green-600" />
                    <span className="text-xs font-medium text-green-700">Сгенерированный пост</span>
                  </div>
                  {postExpanded ? (
                    <ChevronUp className="size-3.5 text-green-600" />
                  ) : (
                    <ChevronDown className="size-3.5 text-green-600" />
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
                  <pre className={`text-sm text-gray-800 whitespace-pre-wrap font-sans ${
                    !postExpanded ? "line-clamp-4" : ""
                  }`}>
                    {testGeneratedContent}
                  </pre>
                  {!postExpanded && (
                    <button
                      type="button"
                      onClick={() => setPostExpanded(true)}
                      className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                    >
                      Показать полностью
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-between gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => { setPostExpanded(false); handleOpenTestDialog(); }}>
                  <TestTube className="size-4 mr-2" />
                  Новый тест
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