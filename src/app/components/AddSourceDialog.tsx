import { useState, useEffect, useCallback, useRef } from "react";
import {
  Rss, Send, Loader2, CheckCircle, AlertTriangle,
  ArrowLeft, ArrowRight, ExternalLink,
  Calendar, FileText, Globe, ChevronDown, ChevronUp,
  Bot, Search, FileCode, Play, ShieldCheck, RotateCcw, Image, Plus,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { useTeam } from "../context/TeamContext";
// ── Service layer (мутации через API-сервис) ────
import * as sourceService from "../services/sourceService";
import { toast } from "sonner";
import type { RssArticleOnlyConfig, Source } from "../types/domain";
// ── Централизованная Zod-валидация ───────────────────────────────────
import { rssSourceSchema, telegramSourceSchema, websiteSourceSchema, safeParse } from "../lib/validators";

// -- Types --

type SourceType = "rss" | "telegram" | "website";
type Step = "choose-type" | "enter-url" | "checking" | "preview" | "error"
  | "website-input" | "agent-running" | "agent-failed" | "agent-preview";

interface SampleItem {
  title: string;
  content: string;
  date: string;
  imageUrl?: string;
}

interface RSSFeedPreview {
  title: string;
  description: string;
  lastItemDate: string;
  sampleItems: SampleItem[];
}

interface TelegramChannelPreview {
  title: string;
  username: string;
  description: string;
  lastPostDate: string;
  samplePosts: SampleItem[];
}

// -- Agent onboarding types --

interface AgentStage {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: "pending" | "running" | "done" | "error";
  log?: string;
}

interface WebsiteArticle {
  title: string;
  url: string;
  content: string;
  date: string;
  imageUrl?: string;
  charCount: number;
}

interface WebsitePreview {
  title: string;
  url: string;
  articlesFound: number;
  sampleArticles: WebsiteArticle[];
  config: {
    listSelector: string;
    articleSelector: string;
    titleSelector: string;
    contentSelector: string;
    dateSelector: string;
  };
}

interface RssAgentPreview {
  sourceName: string;
  feedUrl: string;
  sampleItems: SampleItem[];
  sampleArticles: WebsiteArticle[];
}

interface AgentRetryInfo {
  waitingForRetry: boolean;
  willResume: boolean;
  nextRunAt?: string | null;
  phase?: string | null;
  iteration?: number | null;
  attempts?: number;
  maxAttempts?: number;
}

function deriveWebsiteSourceName(url: string) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, "");
    const primaryPart = hostname.split(".")[0] ?? "";
    const normalized = primaryPart
      .split(/[-_]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

    return normalized || hostname || "Website";
  } catch {
    return "Website";
  }
}

// -- Expandable item component --

function ExpandableItem({ item }: { item: SampleItem }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="px-3 py-2.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex items-start gap-2 group"
      >
        <div className="flex-1 min-w-0">
          <div className="text-sm text-foreground">{item.title}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{formatDate(item.date)}</div>
        </div>
        <div className="mt-0.5 flex-shrink-0 text-muted-foreground/60 transition-colors group-hover:text-muted-foreground">
          {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </div>
      </button>
      {expanded && (
        <div className="mt-2 rounded-lg bg-muted/50 p-3 text-sm leading-relaxed text-muted-foreground">
          {item.content}
        </div>
      )}
    </div>
  );
}

// -- RSS article preview card (full text + photo) --

function RssArticlePreviewCard({ item }: { item: SampleItem }) {
  const [expanded, setExpanded] = useState(false);
  const previewLength = 160;
  const isLong = item.content.length > previewLength;

  return (
    <div className="px-3 py-3">
      {/* Image */}
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt=""
          className="w-full h-36 object-cover rounded-lg mb-3"
        />
      )}
      {/* Header */}
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left group">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-medium text-foreground">{item.title}</div>
          <div className="mt-0.5 flex-shrink-0 text-muted-foreground/60 transition-colors group-hover:text-muted-foreground">
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-muted-foreground">{formatDate(item.date)}</span>
          <span className="text-xs text-border">·</span>
          <span className="text-xs text-muted-foreground tabular-nums">{item.content.length.toLocaleString("ru-RU")} симв.</span>
          {item.imageUrl && (
            <>
              <span className="text-xs text-border">·</span>
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <Image className="size-3" /> фото
              </span>
            </>
          )}
        </div>
      </button>

      {/* Content */}
      {!expanded && isLong && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {item.content.slice(0, previewLength)}...
        </p>
      )}
      {expanded && (
        <div className="mt-2 rounded-lg bg-muted/50 p-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
          {item.content}
        </div>
      )}
    </div>
  );
}

// -- Website article preview card --

function WebsiteArticleCard({ article, index }: { article: WebsiteArticle; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const previewLength = 180;
  const isLong = article.content.length > previewLength;

  return (
    <div className="px-3 py-3">
      <div className="flex gap-3">
        {/* Thumbnail */}
        {article.imageUrl && (
          <div className="flex-shrink-0">
            <img
              src={article.imageUrl}
              alt=""
              className="size-16 rounded-lg bg-muted object-cover"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full text-left group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm text-foreground">{article.title}</div>
              <div className="mt-0.5 flex-shrink-0 text-muted-foreground/60 transition-colors group-hover:text-muted-foreground">
                {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground">{formatDate(article.date)}</span>
              <span className="text-xs text-border">·</span>
              <span className="text-xs text-muted-foreground tabular-nums">{article.charCount.toLocaleString("ru-RU")} симв.</span>
              {article.imageUrl && (
                <>
                  <span className="text-xs text-border">·</span>
                  <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                    <Image className="size-3" /> фото
                  </span>
                </>
              )}
              <span className="text-xs text-border">·</span>
              <span
                className="inline-flex cursor-pointer items-center gap-0.5 text-xs text-primary transition-colors hover:text-primary/80 hover:underline"
                onClick={(e) => { e.stopPropagation(); window.open(article.url, "_blank"); }}
              >
                <ExternalLink className="size-3" /> источник
              </span>
            </div>
          </button>

          {/* Content preview / expanded */}
          {!expanded && isLong && (
            <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {article.content.slice(0, previewLength)}...
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
          {article.imageUrl && (
            <img
              src={article.imageUrl}
              alt=""
              className="w-full h-40 object-cover rounded-lg mb-3"
            />
          )}
          {article.content}
        </div>
      )}
    </div>
  );
}


// -- Format helpers --

function formatDate(d?: string | null): string {
  if (!d) {
    return "неизвестно";
  }

  const value = new Date(d);
  if (Number.isNaN(value.getTime())) {
    return "неизвестно";
  }

  return value.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// -- Component --

interface AddSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSourceCreated?: (source: Source) => void;
}

export function AddSourceDialog({ open, onOpenChange, onSourceCreated }: AddSourceDialogProps) {
  const { currentTeam, currentTeamId } = useTeam();

  const [step, setStep] = useState<Step>("choose-type");
  const [sourceType, setSourceType] = useState<SourceType>("rss");
  const [inputValue, setInputValue] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [rssPreview, setRssPreview] = useState<RSSFeedPreview | null>(null);
  const [tgPreview, setTgPreview] = useState<TelegramChannelPreview | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  const [rssMinFeedContentChars, setRssMinFeedContentChars] = useState(700);

  // -- Website agent state --
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websiteUrlError, setWebsiteUrlError] = useState<string | null>(null);
  const [agentStages, setAgentStages] = useState<AgentStage[]>([]);
  const [agentProgress, setAgentProgress] = useState(0);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [agentLogsExpanded, setAgentLogsExpanded] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [agentRetryInfo, setAgentRetryInfo] = useState<AgentRetryInfo | null>(null);
  const [websitePreview, setWebsitePreview] = useState<WebsitePreview | null>(null);
  const [agentJobId, setAgentJobId] = useState<string | null>(null);
  const agentAbortRef = useRef(false);
  const agentLogsContainerRef = useRef<HTMLDivElement | null>(null);
  const [rssAgentStages, setRssAgentStages] = useState<AgentStage[]>([]);
  const [rssAgentProgress, setRssAgentProgress] = useState(0);
  const [rssAgentLogs, setRssAgentLogs] = useState<string[]>([]);
  const [rssAgentLogsExpanded, setRssAgentLogsExpanded] = useState(false);
  const [rssAgentError, setRssAgentError] = useState<string | null>(null);
  const [rssAgentRetryInfo, setRssAgentRetryInfo] = useState<AgentRetryInfo | null>(null);
  const [rssAgentPreview, setRssAgentPreview] = useState<RssAgentPreview | null>(null);
  const [rssAgentConfig, setRssAgentConfig] = useState<RssArticleOnlyConfig | null>(null);
  const [rssAgentJobId, setRssAgentJobId] = useState<string | null>(null);
  const rssAgentLogsContainerRef = useRef<HTMLDivElement | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep("choose-type");
      setSourceType("rss");
      setInputValue("");
      setSourceName("");
      setErrorMessage("");
      setRssPreview(null);
      setTgPreview(null);
      setIsSubmitting(false);
      setInputError(null);
      setWebsiteUrl("");
      setWebsiteUrlError(null);
      setAgentStages([]);
      setAgentProgress(0);
      setAgentLogs([]);
      setAgentLogsExpanded(false);
      setAgentError(null);
      setAgentRetryInfo(null);
      setWebsitePreview(null);
      setAgentJobId(null);
      setRssAgentStages([]);
      setRssAgentProgress(0);
      setRssAgentLogs([]);
      setRssAgentLogsExpanded(false);
      setRssAgentError(null);
      setRssAgentRetryInfo(null);
      setRssAgentPreview(null);
      setRssAgentConfig(null);
      setRssAgentJobId(null);
      agentAbortRef.current = false;
      setRssMinFeedContentChars(700);
    } else {
      agentAbortRef.current = true;
    }
  }, [open]);

  const scrollLogsToBottom = useCallback((container: HTMLDivElement | null) => {
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, []);

  const handleSelectType = (type: SourceType) => {
    setSourceType(type);
    setInputValue("");
    setSourceName("");
    setErrorMessage("");
    setRssPreview(null);
    setTgPreview(null);
    setInputError(null);
    if (type === "website") {
      setWebsiteUrl("");
      setWebsiteUrlError(null);
      setAgentStages([]);
      setAgentProgress(0);
      setAgentLogs([]);
      setAgentLogsExpanded(false);
      setAgentError(null);
      setAgentRetryInfo(null);
      setWebsitePreview(null);
      setAgentJobId(null);
      setRssAgentStages([]);
      setRssAgentProgress(0);
      setRssAgentLogs([]);
      setRssAgentLogsExpanded(false);
      setRssAgentError(null);
      setRssAgentRetryInfo(null);
      setRssAgentPreview(null);
      setRssAgentConfig(null);
      setRssAgentJobId(null);
      setStep("website-input");
    } else {
      setRssAgentStages([]);
      setRssAgentProgress(0);
      setRssAgentLogs([]);
      setRssAgentLogsExpanded(false);
      setRssAgentError(null);
      setRssAgentPreview(null);
      setRssAgentConfig(null);
      setRssAgentJobId(null);
      setStep("enter-url");
    }
  };

  const handleBack = () => {
    if (step === "enter-url" || step === "website-input") {
      setStep("choose-type");
    } else if (step === "preview" || step === "error") {
      setStep("enter-url");
      setErrorMessage("");
    } else if (step === "agent-failed") {
      setStep(sourceType === "rss" ? "preview" : "website-input");
      if (sourceType === "rss") {
        setRssAgentError(null);
      } else {
        setAgentError(null);
      }
    } else if (step === "agent-preview") {
      setStep(sourceType === "rss" ? "preview" : "website-input");
    }
  };

  // ── Validation (через централизованные Zod-схемы из lib/validators) ──

  const validateInput = (): string | null => {
    const val = inputValue.trim();
    if (!val) return "Поле не может быть пустым";

    if (sourceType === "rss") {
      const result = safeParse(rssSourceSchema, { url: val });
      if (!result.ok) return (result.errors.issues ?? (result.errors as any).errors)?.[0]?.message ?? "Некорректный URL";
    } else {
      // telegram: schema делает transform (strips t.me/, @, etc.)
      const result = safeParse(telegramSourceSchema, { username: val });
      if (!result.ok) return (result.errors.issues ?? (result.errors as any).errors)?.[0]?.message ?? "Некорректное имя канала";
    }
    return null;
  };

  const handleCheck = useCallback(async () => {
    const validationErr = validateInput();
    if (validationErr) {
      setInputError(validationErr);
      return;
    }
    if (!currentTeamId) {
      setErrorMessage("Не выбрана команда");
      setStep("error");
      return;
    }

    setInputError(null);
    setErrorMessage("");
    setStep("checking");

    try {
      if (sourceType === "rss") {
        // Для RSS превью всегда берем с backend, чтобы пользователь видел реальные статьи из ленты.
        const result = await sourceService.checkRssSource(currentTeamId, inputValue.trim());
        const preview: RSSFeedPreview = {
          title: result.title,
          description: result.description,
          lastItemDate: result.lastItemDate ?? new Date().toISOString(),
          sampleItems: (result.sampleItems ?? []).map((item) => ({
            title: item.title,
            content: item.content,
            date: item.date ?? new Date().toISOString(),
            imageUrl: item.imageUrl ?? undefined,
          })),
        };

        setRssPreview(preview);
        setSourceName(result.title);
        setStep("preview");
      } else {
        const result = await sourceService.checkTelegramSource(currentTeamId, inputValue.trim());
        const preview: TelegramChannelPreview = {
          title: result.title,
          username: result.username,
          description: result.description,
          lastPostDate: result.lastPostDate,
          samplePosts: (result.samplePosts ?? []).map((item) => ({
            title: item.title,
            content: item.content,
            date: item.date,
          })),
        };

        setTgPreview(preview);
        setSourceName(result.title);
        setStep("preview");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось проверить источник");
      setStep("error");
    }
  }, [currentTeamId, inputValue, sourceType]);

  const handleCreate = async () => {
    if (!currentTeamId || !sourceName.trim()) return;
    setIsSubmitting(true);

    await new Promise(r => setTimeout(r, 400));

    let url = inputValue.trim();
    if (sourceType === "telegram") {
      let username = url;
      if (username.startsWith("https://t.me/")) username = username.replace("https://t.me/", "");
      else if (username.startsWith("http://t.me/")) username = username.replace("http://t.me/", "");
      else if (username.startsWith("t.me/")) username = username.replace("t.me/", "");
      if (username.startsWith("@")) username = username.slice(1);
      username = username.split("/")[0].split("?")[0];
      url = `t.me/${username}`;
    }

    const createResult = await sourceService.createSource(currentTeamId, {
      name: sourceName.trim(),
      type: sourceType,
      url,
      ...(sourceType === "rss"
        ? {
            rssMode: "feed_only",
            rssMinFeedContentChars,
          }
        : {}),
    });
    setIsSubmitting(false);
    if (!createResult.ok) {
      toast.error(createResult.error);
      return;
    }

    onOpenChange(false);
    toast.success(`Источник "${createResult.data.name}" добавлен`);
    onSourceCreated?.(createResult.data);
  };

  // -- Website agent onboarding --
  const initialStages: () => AgentStage[] = () => [
    { id: "analyze_list", label: "Анализ списка статей", icon: <Search className="size-3.5" />, status: "pending" },
    { id: "open_samples", label: "Открытие примеров статей", icon: <FileText className="size-3.5" />, status: "pending" },
    { id: "generate_config", label: "Генерация конфигурации", icon: <FileCode className="size-3.5" />, status: "pending" },
    { id: "dry_run", label: "Тестовый запуск парсинга", icon: <Play className="size-3.5" />, status: "pending" },
    { id: "verdict", label: "Финальная проверка", icon: <ShieldCheck className="size-3.5" />, status: "pending" },
  ];

  const runRssArticleOnboarding = useCallback(async () => {
    if (!currentTeamId) {
      setRssAgentError("Команда не выбрана");
      setStep("agent-failed");
      return false;
    }

    agentAbortRef.current = false;
    setRssAgentStages(initialStages());
    setRssAgentProgress(0);
    setRssAgentLogs([]);
    setRssAgentLogsExpanded(false);
    setRssAgentError(null);
    setRssAgentRetryInfo(null);
    setRssAgentPreview(null);
    setRssAgentConfig(null);
    setRssAgentJobId(null);
    setStep("agent-running");

    try {
      const startResult = await sourceService.startRssArticleOnboarding(currentTeamId, {
        name: sourceName.trim(),
        url: inputValue.trim(),
        rssMinFeedContentChars,
      });
      if (!startResult.ok) {
        setRssAgentError(startResult.error);
        setStep("agent-failed");
        return false;
      }

      const { jobId } = startResult.data;

      setRssAgentJobId(jobId);

      while (!agentAbortRef.current) {
        const job = await sourceService.getRssArticleOnboardingJob(jobId);
        if (agentAbortRef.current) {
          return false;
        }
        setRssAgentProgress(job.progress);
        setRssAgentLogs(job.logs);
        setRssAgentRetryInfo(
          job.retry && (job.retry.waitingForRetry || job.retry.willResume)
            ? {
                waitingForRetry: Boolean(job.retry.waitingForRetry),
                willResume: Boolean(job.retry.willResume),
                nextRunAt: job.retry.nextRunAt ?? null,
                phase: job.retry.phase ?? null,
                iteration: job.retry.iteration ?? null,
                attempts: job.retry.attempts ?? job.attempts,
                maxAttempts: job.retry.maxAttempts ?? job.maxAttempts,
              }
            : null,
        );
        setRssAgentStages((job.liveStages ?? job.stages).map((stage) => ({
          id: stage.id,
          label: stage.label,
          icon: initialStages().find((item) => item.id === stage.id)?.icon ?? <Bot className="size-3.5" />,
          status: stage.status,
        })));

        if (job.status === "success" && job.preview && job.config) {
          setRssAgentPreview({
            sourceName: job.preview.sourceName ?? sourceName.trim(),
            feedUrl: job.preview.feedUrl ?? inputValue.trim(),
            sampleItems: (job.preview.sampleItems ?? []).map((item) => ({
              title: item.title ?? item.url ?? "Без названия",
              content: item.content ?? "",
              date: item.date ?? new Date().toISOString(),
              imageUrl: item.imageUrl ?? undefined,
            })),
            sampleArticles: (job.preview.sampleArticles ?? []).map((article) => ({
              title: article.title ?? article.url ?? "Без названия",
              url: article.url,
              content: article.content ?? "",
              date: article.date ?? new Date().toISOString(),
              imageUrl: article.imageUrl ?? undefined,
              charCount: article.charCount ?? (article.content?.length ?? 0),
            })),
          });
          setRssAgentConfig(job.config as RssArticleOnlyConfig);
          setRssAgentRetryInfo(null);
          setStep("agent-preview");
          return true;
        }

        if (job.status === "failed" || job.status === "canceled" || job.status === "timed_out") {
          setRssAgentRetryInfo(null);
          setRssAgentError(job.errorText ?? "Article-агент не смог настроить парсинг полной статьи");
          setStep("agent-failed");
          return false;
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      return false;
    }
    catch (error: any) {
      setRssAgentError(error.message || "Не удалось запустить article-анализ");
      setStep("agent-failed");
      return false;
    }
  }, [currentTeamId, inputValue, rssMinFeedContentChars, sourceName]);

  const handleStartOnboarding = async () => {
    // Нормализованный URL — единый источник правды в этой функции
    const validatedUrl = websiteUrl.trim();
    const provisionalName = deriveWebsiteSourceName(validatedUrl);

    // Validate через Zod-схему из lib/validators
    const result = safeParse(websiteSourceSchema, {
      url: validatedUrl,
      name: provisionalName,
    });
    if (!result.ok) {
      // Zod v4: ZodError хранит ошибки в .issues (не в .errors)
      setWebsiteUrlError(result.errors.issues[0]?.message ?? "Некорректный URL");
      return;
    }
    if (!currentTeamId) {
      setWebsiteUrlError("Команда не выбрана");
      return;
    }

    const existingSource = sourceService.getTeamSourcesList(currentTeamId).find(s => s.url === validatedUrl);
    if (existingSource) { setWebsiteUrlError(`Этот URL уже добавлен как "${existingSource.name}"`); return; }

    setWebsiteUrlError(null);
    agentAbortRef.current = false;

    const stages = initialStages();
    setAgentStages(stages);
    setAgentProgress(0);
    setAgentLogs([]);
    setAgentLogsExpanded(false);
    setAgentError(null);
    setAgentRetryInfo(null);
    setWebsitePreview(null);
    setStep("agent-running");

    try {
      const startResult = await sourceService.startWebsiteOnboarding(currentTeamId!, {
        name: provisionalName,
        url: validatedUrl,
      })
      if (!startResult.ok) {
        setAgentError(startResult.error)
        setStep("agent-failed")
        return
      }

      const { jobId } = startResult.data

      setAgentJobId(jobId)

      while (!agentAbortRef.current) {
        const job = await sourceService.getWebsiteOnboardingJob(jobId)
        if (agentAbortRef.current) {
          return
        }

        setAgentProgress(job.progress)
        setAgentLogs(job.logs)
        setAgentRetryInfo(
          job.retry && (job.retry.waitingForRetry || job.retry.willResume)
            ? {
                waitingForRetry: Boolean(job.retry.waitingForRetry),
                willResume: Boolean(job.retry.willResume),
                nextRunAt: job.retry.nextRunAt ?? null,
                phase: job.retry.phase ?? null,
                iteration: job.retry.iteration ?? null,
                attempts: job.retry.attempts ?? job.attempts,
                maxAttempts: job.retry.maxAttempts ?? job.maxAttempts,
              }
            : null,
        )
        setAgentStages((job.liveStages ?? job.stages).map((stage) => ({
          id: stage.id,
          label: stage.label,
          icon: initialStages().find((item) => item.id === stage.id)?.icon ?? <Bot className="size-3.5" />,
          status: stage.status,
        })))

        if (job.status === 'success' && job.preview) {
          setWebsitePreview({
            title: job.preview.title ?? provisionalName,
            url: job.preview.url ?? validatedUrl,
            articlesFound: job.preview.articlesFound ?? (job.preview.sampleArticles?.length ?? 0),
            sampleArticles: (job.preview.sampleArticles ?? []).map((article) => ({
              title: article.title ?? article.url ?? "Без названия",
              url: article.url ?? job.preview?.url ?? validatedUrl,
              content: article.content ?? "",
              date: article.date ?? new Date().toISOString(),
              imageUrl: article.imageUrl ?? undefined,
              charCount: article.charCount ?? (article.content?.length ?? 0),
            })),
            config: {
              listSelector: job.preview.config?.listSelector ?? "",
              articleSelector: job.preview.config?.articleSelector ?? "",
              titleSelector: job.preview.config?.titleSelector ?? "",
              contentSelector: job.preview.config?.contentSelector ?? "",
              dateSelector: job.preview.config?.dateSelector ?? "",
            },
          })
          setSourceName(job.preview.title?.trim() || provisionalName)
          setAgentRetryInfo(null)
          setStep('agent-preview')
          return
        }

        if (job.status === 'failed' || job.status === 'canceled' || job.status === 'timed_out') {
          setAgentRetryInfo(null)
          setAgentError(job.errorText ?? 'Агент не смог настроить парсинг для этого сайта')
          setStep('agent-failed')
          return
        }

        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    } catch (error: any) {
      setAgentError(error.message || 'Не удалось запустить onboarding сайта')
      setStep('agent-failed')
    }
  };


  const handleWebsiteCreate = async () => {
    if (!currentTeamId || !sourceName.trim() || !websitePreview || !agentJobId) return;
    setIsSubmitting(true);

    const createResult = await sourceService.applyWebsiteOnboarding(currentTeamId, {
      jobId: agentJobId,
      name: sourceName.trim(),
    });

    setIsSubmitting(false);
    if (!createResult.ok) {
      toast.error(createResult.error);
      return;
    }

    onOpenChange(false);
    toast.success(`Источник "${createResult.data.source.name}" добавлен через агента`);
    onSourceCreated?.(createResult.data.source);
  };

  const handleRssAgentRetry = async () => {
    await runRssArticleOnboarding();
  };

  const handleRssAgentApply = async () => {
    if (!currentTeamId || !rssAgentJobId || !rssAgentConfig) return;
    setIsSubmitting(true);

    const result = await sourceService.applyRssArticleOnboarding(currentTeamId, {
      jobId: rssAgentJobId,
      name: sourceName.trim(),
    });

    setIsSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    onOpenChange(false);
    toast.success(`Источник "${result.data.source.name}" добавлен с article-агентом`);
    onSourceCreated?.(result.data.source);
  };

  // Check limits (через сервис, не напрямую из mock)
  const currentSourcesCount = sourceService.getTeamSourcesList(currentTeamId ?? "").length;
  const maxSources = currentTeam?.limits?.maxSources ?? 20;
  const isAtLimit = currentSourcesCount >= maxSources;
  const isRssAgentStep = sourceType === "rss" && (step === "agent-running" || step === "agent-failed" || step === "agent-preview");
  const currentAgentStages = isRssAgentStep ? rssAgentStages : agentStages;
  const currentAgentProgress = isRssAgentStep ? rssAgentProgress : agentProgress;
  const currentAgentLogs = isRssAgentStep ? rssAgentLogs : agentLogs;
  const currentAgentLogsExpanded = isRssAgentStep ? rssAgentLogsExpanded : agentLogsExpanded;
  const currentAgentError = isRssAgentStep ? rssAgentError : agentError;
  const currentAgentRetryInfo = isRssAgentStep ? rssAgentRetryInfo : agentRetryInfo;
  const currentAgentTarget = isRssAgentStep ? (rssAgentPreview?.feedUrl ?? inputValue.trim()) : websiteUrl;

  useEffect(() => {
    if (!currentAgentLogsExpanded) return;

    const container = isRssAgentStep ? rssAgentLogsContainerRef.current : agentLogsContainerRef.current;
    if (!container) return;

    const frameId = window.requestAnimationFrame(() => {
      scrollLogsToBottom(container);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [currentAgentLogs.length, currentAgentLogsExpanded, isRssAgentStep, scrollLogsToBottom]);

  const handleDialogStateChange = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogStateChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <DialogHeader className="flex-shrink-0 border-b border-border bg-gradient-to-r from-sky-500/10 via-background to-violet-500/10 px-6 pb-4 pr-14 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 flex-shrink-0 items-center justify-center rounded-xl bg-background/80 text-primary shadow-sm ring-1 ring-border/60">
              {step === "choose-type" ? (
                <Search className="size-4" />
              ) : sourceType === "rss" ? (
                <Rss className="size-4" />
              ) : sourceType === "telegram" ? (
                <Send className="size-4" />
              ) : (
                <Globe className="size-4" />
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-foreground">
                {step === "choose-type" && "Добавить источник"}
                {step === "enter-url" && (sourceType === "rss" ? "RSS лента" : "Telegram канал")}
                {step === "checking" && "Проверка..."}
                {step === "preview" && "Подтверждение"}
                {step === "error" && "Ошибка проверки"}
                {step === "website-input" && "Website (агент)"}
                {step === "agent-running" && (sourceType === "rss" ? "Настройка article-парсера..." : "Настройка парсинга...")}
                {step === "agent-failed" && (sourceType === "rss" ? "Ошибка article-агента" : "Ошибка настройки")}
                {step === "agent-preview" && (sourceType === "rss" ? "Проверка article-парсера" : "Результат парсинга")}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-sm text-muted-foreground">
                {step === "choose-type" && "Выберите тип источника для сбора контента"}
                {step === "enter-url" && sourceType === "rss" && "Введите URL RSS или Atom ленты"}
                {step === "enter-url" && sourceType === "telegram" && "Введите username или ссылку на канал"}
                {step === "checking" && "Подключаемся и проверяем доступность..."}
                {step === "preview" && "Проверьте данные и подтвердите добавление"}
                {step === "error" && "Не удалось подключиться к источнику"}
                {step === "website-input" && "Введите URL, агент настроит парсинг, а имя зададите после проверки"}
                {step === "agent-running" && (sourceType === "rss" ? "Article-агент анализирует полные HTML-статьи..." : "AI-агент анализирует сайт...")}
                {step === "agent-failed" && (sourceType === "rss" ? "Article-агент не смог настроить парсинг статьи" : "Агент не смог настроить парсинг")}
                {step === "agent-preview" && (sourceType === "rss" ? "Проверьте article-конфиг и подтвердите" : "Проверьте результат и подтвердите")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step indicators */}
        {step !== "choose-type" && (
          <div className="border-y border-border/80 px-6 py-4 flex-shrink-0">
            <div className="flex items-center gap-2 overflow-hidden">
              {((sourceType === "website") || (sourceType === "rss" && isRssAgentStep)
                ? ["Тип", "URL", "Агент", "Готово"]
                : ["Тип", sourceType === "rss" ? "URL" : "Канал", "Проверка", "Готово"]
              ).map((label, i) => {
                const stepMap: Record<Step, number> = {
                  "choose-type": 0, "enter-url": 1, "checking": 2, "preview": 3, "error": 2,
                  "website-input": 1, "agent-running": 2, "agent-failed": 2, "agent-preview": 3,
                };
                const current = stepMap[step];
                const isDone = i < current;
                const isActive = i === current;
                return (
                  <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
                    <div className={`flex min-w-0 items-center gap-1.5 ${isActive ? "text-primary" : isDone ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/50"}`}>
                      <div className={`size-5 rounded-full flex items-center justify-center text-xs ${
                        isDone ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
                        isActive ? "bg-primary/15 text-primary" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {isDone ? <CheckCircle className="size-3" /> : i + 1}
                      </div>
                      <span className={`text-xs hidden min-w-0 truncate sm:inline ${isActive ? "font-medium" : ""}`}>{label}</span>
                    </div>
                    {i < 3 && <div className={`h-px flex-1 ${isDone ? "bg-emerald-500/30" : "bg-border"}`} />}
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0">

          {/* Step: Choose type */}
          {step === "choose-type" && (
            <div className="space-y-3">
              {isAtLimit && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-start gap-2.5">
                  <AlertTriangle className="size-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-amber-800 dark:text-amber-300">Лимит достигнут</div>
                    <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      Использовано {currentSourcesCount} из {maxSources} источников. Увеличьте лимит в настройках.
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => !isAtLimit && handleSelectType("rss")}
                disabled={isAtLimit}
                className="group flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-card"
              >
                <div className="size-11 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors">
                  <Rss className="size-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground">RSS / Atom</div>
                  <div className="mt-0.5 text-sm text-muted-foreground">
                    Подключить RSS или Atom ленту любого сайта
                  </div>
                </div>
                <ArrowRight className="size-4 flex-shrink-0 text-muted-foreground/60 transition-colors group-hover:text-primary" />
              </button>

              <button
                onClick={() => !isAtLimit && handleSelectType("telegram")}
                disabled={isAtLimit}
                className="group flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-card"
              >
                <div className="size-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                  <Send className="size-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground">Telegram канал</div>
                  <div className="mt-0.5 text-sm text-muted-foreground">
                    Подключить публичный Telegram канал для парсинга постов
                  </div>
                </div>
                <ArrowRight className="size-4 flex-shrink-0 text-muted-foreground/60 transition-colors group-hover:text-primary" />
              </button>

              <button
                onClick={() => !isAtLimit && handleSelectType("website")}
                disabled={isAtLimit}
                className="group flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-card"
              >
                <div className="size-11 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                  <Globe className="size-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    Website
                    <Badge variant="outline" className="border-primary/30 px-1.5 py-0 text-[10px] text-primary">
                      <Bot className="size-3 mr-0.5" />
                      агент
                    </Badge>
                  </div>
                  <div className="mt-0.5 text-sm text-muted-foreground">
                    AI-агент проанализирует сайт и настроит парсинг
                  </div>
                </div>
                <ArrowRight className="size-4 flex-shrink-0 text-muted-foreground/60 transition-colors group-hover:text-primary" />
              </button>
            </div>
          )}

          {/* Step: Enter URL / username */}
          {step === "enter-url" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="source-url">
                  {sourceType === "rss" ? "URL ленты" : "Канал"}
                </Label>
                <Input
                  id="source-url"
                  placeholder={
                    sourceType === "rss"
                      ? "https://example.com/feed.xml"
                      : "@channel или t.me/channel"
                  }
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    setInputError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCheck();
                    }
                  }}
                  autoFocus
                  className={inputError ? "border-red-300 focus-visible:ring-red-200" : ""}
                />
                {inputError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="size-3" />
                    {inputError}
                  </p>
                )}
              </div>

              {sourceType === "rss" ? (
                <>
                  <div className="space-y-1.5 rounded-lg bg-muted/50 p-3">
                    <div className="text-xs font-medium text-muted-foreground">Примеры URL</div>
                    <div className="space-y-1">
                      {[
                        "https://techcrunch.com/feed",
                        "https://habr.com/ru/rss/all/all/",
                        "https://blog.example.com/rss.xml",
                      ].map(url => (
                        <button
                          key={url}
                          onClick={() => { setInputValue(url); setInputError(null); }}
                          className="flex items-center gap-2 text-xs text-primary transition-colors hover:text-primary/80"
                        >
                          <ExternalLink className="size-3" />
                          {url}
                        </button>
                      ))}
                    </div>
                  </div>

                </>
              ) : (
                <div className="space-y-1.5 rounded-lg bg-muted/50 p-3">
                  <div className="text-xs font-medium text-muted-foreground">Поддерживаемые форматы</div>
                  <div className="space-y-1">
                    {[
                      { format: "@channel_name", desc: "Username с @" },
                      { format: "t.me/channel_name", desc: "Короткая ссылка" },
                      { format: "https://t.me/channel_name", desc: "Полная ссылка" },
                    ].map(({ format, desc }) => (
                      <div key={format} className="flex items-center gap-2 text-xs">
                        <code className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-foreground">{format}</code>
                        <span className="text-muted-foreground">{desc}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                    <AlertTriangle className="size-3" />
                    Только публичные каналы
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step: Checking */}
          {step === "checking" && (
            <div className="text-center py-8">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="size-5 animate-spin text-primary" />
              </div>
              <div className="mb-1 text-sm font-medium text-foreground">
                {sourceType === "rss" ? "Загрузка RSS ленты..." : "Проверка канала..."}
              </div>
              <div className="text-xs text-muted-foreground">
                {sourceType === "rss"
                  ? "Подключаемся к серверу и парсим XML..."
                  : "Получаем информацию о канале через Telegram API..."
                }
              </div>
              <div className="mt-4 truncate px-4 font-mono text-xs text-muted-foreground/70">
                {inputValue}
              </div>
            </div>
          )}

          {/* Step: Error */}
          {step === "error" && (
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4 flex items-start gap-3">
                <div className="size-9 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle className="size-4 text-red-500" />
                </div>
                <div>
                  <div className="text-sm font-medium text-red-800 dark:text-red-300">Не удалось подключиться</div>
                  <div className="text-sm text-red-600 dark:text-red-400 mt-1">{errorMessage}</div>
                  <div className="mt-2 text-xs text-red-400 dark:text-red-500 font-mono truncate max-w-[320px]">{inputValue}</div>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-3">
                <div className="mb-1.5 text-xs font-medium text-muted-foreground">Что попробовать?</div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {sourceType === "rss" ? (
                    <>
                      <li>Проверьте, что URL ведёт именно на RSS/Atom XML</li>
                      <li>Убедитесь, что лента доступна без авторизации</li>
                      <li>Попробуйте открыть URL в браузере</li>
                    </>
                  ) : (
                    <>
                      <li>Проверьте правильность username канала</li>
                      <li>Убедитесь, что канал публичный</li>
                      <li>Попробуйте открыть t.me/username в браузере</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Step: Preview - RSS */}
          {step === "preview" && sourceType === "rss" && rssPreview && (
            <div className="space-y-4">
              {/* Feed info card */}
              <div className="rounded-xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0">
                    <Rss className="size-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-medium text-foreground">{rssPreview.title}</div>
                      <span className="rounded bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 dark:text-orange-300">RSS preview</span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{inputValue}</div>
                    <div className="mt-1.5 text-sm text-muted-foreground">{rssPreview.description}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 border-t border-orange-500/20 pt-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="size-3.5 text-orange-500 dark:text-orange-400" />
                    Последний материал {formatDate(rssPreview.lastItemDate)}
                  </div>
                </div>
              </div>

              {/* Sample articles: full content with images */}
              {rssPreview.sampleItems.length > 0 && (
                <div>
                  <div className="mb-2 text-xs font-medium text-muted-foreground">Последние материалы</div>
                  <div className="overflow-hidden rounded-xl border border-border divide-y divide-border bg-card">
                    {rssPreview.sampleItems.map((item, i) => (
                      <RssArticlePreviewCard key={i} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* Name input */}
              <div className="space-y-2">
                <Label htmlFor="source-name">Название источника</Label>
                <Input
                  id="source-name"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="Введите название"
                />
                <p className="text-xs text-muted-foreground">Отображается в списках и фильтрах</p>
              </div>

              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <div className="text-xs font-medium text-foreground">Что дальше</div>
                <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Можно сразу добавить источник как обычный RSS или запустить AI-анализ, чтобы построить конфиг парсинга полной статьи по HTML.
                </div>
              </div>
            </div>
          )}

          {/* Step: Preview - Telegram */}
          {step === "preview" && sourceType === "telegram" && tgPreview && (
            <div className="space-y-4">
              {/* Channel info card */}
              <div className="rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 to-blue-500/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                    <Send className="size-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground">{tgPreview.title}</div>
                    <a
                      href={`https://t.me/${tgPreview.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary transition-colors hover:text-primary/80 hover:underline"
                    >
                      @{tgPreview.username}
                      <ExternalLink className="size-3" />
                    </a>
                    <div className="mt-1.5 text-sm text-muted-foreground">{tgPreview.description}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 border-t border-sky-500/20 pt-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="size-3.5 text-primary" />
                    Посл. пост {formatDate(tgPreview.lastPostDate)}
                  </div>
                </div>
              </div>

              {/* Sample posts: expandable */}
              {tgPreview.samplePosts.length > 0 && (
                <div>
                  <div className="mb-2 text-xs font-medium text-muted-foreground">Спаршенные посты для примера</div>
                  <div className="rounded-lg border border-border divide-y divide-border bg-card">
                    {tgPreview.samplePosts.map((post, i) => (
                      <ExpandableItem key={i} item={post} />
                    ))}
                  </div>
                </div>
              )}

              {/* Name input */}
              <div className="space-y-2">
                <Label htmlFor="source-name">Название источника</Label>
                <Input
                  id="source-name"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="Введите название"
                />
                <p className="text-xs text-muted-foreground">Отображается в списках и фильтрах</p>
              </div>
            </div>
          )}

          {/* Step: Website input */}
          {step === "website-input" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="website-url">URL сайта</Label>
                <Input
                  id="website-url"
                  placeholder="https://example.com"
                  value={websiteUrl}
                  onChange={(e) => {
                    setWebsiteUrl(e.target.value);
                    setWebsiteUrlError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleStartOnboarding();
                    }
                  }}
                  autoFocus
                  className={websiteUrlError ? "border-red-300 focus-visible:ring-red-200" : ""}
                />
                {websiteUrlError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="size-3" />
                    {websiteUrlError}
                  </p>
                )}
              </div>

              <div className="space-y-2 rounded-lg border border-primary/15 bg-primary/5 p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                  <Bot className="size-3.5" />
                  Как это работает
                </div>
                <ol className="list-inside list-decimal space-y-1 text-xs text-muted-foreground">
                  <li>Агент откроет сайт и найдёт список статей</li>
                  <li>Откроет несколько случайных статей для анализа</li>
                  <li>Сгенерирует конфигурацию парсера (CSS-селекторы)</li>
                  <li>Проведёт тестовый запуск и проверит результат</li>
                </ol>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Укажите страницу, с которой можно начать обход: это может быть главная сайта, раздел со статьями или лента публикаций.
                </p>
              </div>
            </div>
          )}

          {/* Step: Agent running */}
          {step === "agent-running" && (
            <div className="space-y-4">
              {currentAgentRetryInfo?.waitingForRetry && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-200">
                  <div className="font-medium">Ждем окно квоты и продолжим с сохраненного шага</div>
                  <div className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                    {currentAgentRetryInfo.nextRunAt ? `Следующая попытка: ${formatDate(currentAgentRetryInfo.nextRunAt)}. ` : ""}
                    {currentAgentRetryInfo.phase ? `Фаза: ${currentAgentRetryInfo.phase}. ` : ""}
                    {typeof currentAgentRetryInfo.iteration === "number" ? `Итерация: ${currentAgentRetryInfo.iteration}. ` : ""}
                    {typeof currentAgentRetryInfo.attempts === "number" && typeof currentAgentRetryInfo.maxAttempts === "number"
                      ? `Попытки: ${currentAgentRetryInfo.attempts}/${currentAgentRetryInfo.maxAttempts}.`
                      : ""}
                  </div>
                </div>
              )}

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Прогресс</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{currentAgentProgress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${currentAgentProgress}%` }}
                  />
                </div>
              </div>

              {/* Agent stages */}
              <div className="space-y-1">
                {currentAgentStages.map(stage => (
                  <div
                    key={stage.id}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                      stage.status === "running" ? "bg-primary/10 text-primary" :
                      stage.status === "done" ? "text-muted-foreground" :
                      stage.status === "error" ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300" :
                      "text-muted-foreground/70"
                    }`}
                  >
                    {stage.status === "pending" && <div className="size-4 rounded-full border-2 border-border" />}
                    {stage.status === "running" && <Loader2 className="size-4 animate-spin text-primary" />}
                    {stage.status === "done" && <CheckCircle className="size-4 text-emerald-500" />}
                    {stage.status === "error" && <AlertTriangle className="size-4 text-red-500" />}
                    <span>{stage.label}</span>
                  </div>
                ))}
              </div>

              {/* Logs (collapsible) */}
              <div className="overflow-hidden rounded-lg border border-border">
                <button
                  onClick={() => {
                    if (isRssAgentStep) {
                      setRssAgentLogsExpanded(!rssAgentLogsExpanded);
                    } else {
                      setAgentLogsExpanded(!agentLogsExpanded);
                    }
                  }}
                  className="flex w-full items-center justify-between bg-muted/50 px-3 py-2 transition-colors hover:bg-muted"
                >
                  <span className="text-xs font-medium text-muted-foreground">Логи агента ({currentAgentLogs.length})</span>
                  {currentAgentLogsExpanded ? <ChevronUp className="size-3.5 text-muted-foreground" /> : <ChevronDown className="size-3.5 text-muted-foreground" />}
                </button>
                {currentAgentLogsExpanded && (
                  <div
                    ref={isRssAgentStep ? rssAgentLogsContainerRef : agentLogsContainerRef}
                    className="hide-scrollbar max-h-[150px] overflow-y-auto bg-slate-950 px-3 py-2 font-mono"
                  >
                    <div className="flex min-h-full flex-col justify-end gap-0.5">
                      {currentAgentLogs.map((log, i) => (
                        <div key={i} className="text-xs leading-relaxed text-emerald-300 whitespace-pre-wrap break-words">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center font-mono text-xs text-muted-foreground truncate">
                {currentAgentTarget}
              </div>
            </div>
          )}

          {/* Step: Agent failed */}
          {step === "agent-failed" && (
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4 flex items-start gap-3">
                <div className="size-9 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle className="size-4 text-red-500" />
                </div>
                <div>
                  <div className="text-sm font-medium text-red-800 dark:text-red-300">
                    {sourceType === "rss" ? "Не удалось настроить article-парсер" : "Не удалось настроить парсинг"}
                  </div>
                  <div className="text-sm text-red-600 dark:text-red-400 mt-1">{currentAgentError}</div>
                  <div className="mt-2 text-xs text-red-400 dark:text-red-500 font-mono truncate max-w-[320px]">{currentAgentTarget}</div>
                </div>
              </div>

              {/* Agent stages summary */}
              <div className="space-y-1">
                {currentAgentStages.map(stage => (
                  <div
                    key={stage.id}
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs ${
                      stage.status === "done" ? "text-muted-foreground" :
                      stage.status === "error" ? "text-red-600 dark:text-red-400" :
                      "text-muted-foreground/70"
                    }`}
                  >
                    {stage.status === "done" && <CheckCircle className="size-3.5 text-emerald-500" />}
                    {stage.status === "error" && <AlertTriangle className="size-3.5 text-red-500" />}
                    {stage.status === "pending" && <div className="size-3.5 rounded-full border border-border" />}
                    <span>{stage.label}</span>
                  </div>
                ))}
              </div>

              {/* Logs */}
              <div className="overflow-hidden rounded-lg border border-border">
                <button
                  onClick={() => {
                    if (isRssAgentStep) {
                      setRssAgentLogsExpanded(!rssAgentLogsExpanded);
                    } else {
                      setAgentLogsExpanded(!agentLogsExpanded);
                    }
                  }}
                  className="flex w-full items-center justify-between bg-muted/50 px-3 py-2 transition-colors hover:bg-muted"
                >
                  <span className="text-xs font-medium text-muted-foreground">Логи агента ({currentAgentLogs.length})</span>
                  {currentAgentLogsExpanded ? <ChevronUp className="size-3.5 text-muted-foreground" /> : <ChevronDown className="size-3.5 text-muted-foreground" />}
                </button>
                {currentAgentLogsExpanded && (
                  <div
                    ref={isRssAgentStep ? rssAgentLogsContainerRef : agentLogsContainerRef}
                    className="hide-scrollbar max-h-[150px] overflow-y-auto bg-slate-950 px-3 py-2 font-mono"
                  >
                    <div className="flex min-h-full flex-col justify-end gap-0.5">
                      {currentAgentLogs.map((log, i) => (
                        <div
                          key={i}
                          className={`text-xs leading-relaxed whitespace-pre-wrap break-words ${/(error|ошиб|failed|не удалось)/i.test(log) ? "text-red-300" : "text-emerald-300"}`}
                        >
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-muted/50 p-3">
                <div className="mb-1.5 text-xs font-medium text-muted-foreground">Что попробовать?</div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {sourceType === "rss" ? (
                    <>
                      <li>Проверьте, что в RSS есть прямые ссылки на полные статьи</li>
                      <li>Убедитесь, что HTML статьи доступен без авторизации</li>
                      <li>Если AI-анализ не нужен, вернитесь назад и добавьте источник как обычный RSS</li>
                    </>
                  ) : (
                    <>
                      <li>Проверьте, что сайт не загружает контент динамически через JavaScript</li>
                      <li>Попробуйте указать URL страницы со списком статей</li>
                      <li>Убедитесь, что сайт доступен публично</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Step: Agent preview */}
          {step === "agent-preview" && sourceType === "website" && (
            <div className="space-y-4">
              {/* Site info card */}
              <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-violet-500/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                    <Globe className="size-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground">{websitePreview?.title}</div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{websitePreview?.url}</div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-sm text-muted-foreground">Найдено {websitePreview?.articlesFound} статей</span>
                      <Badge variant="outline" className="border-emerald-500/30 px-1.5 py-0 text-[10px] text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="size-3 mr-0.5" />
                        Агент: OK
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 border-t border-primary/20 pt-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="size-3.5 text-purple-500 dark:text-purple-400" />
                    Последний материал {formatDate(websitePreview?.sampleArticles?.[0]?.date)}
                  </div>
                </div>
              </div>

              {/* Sample items: expandable */}
              {(websitePreview?.sampleArticles?.length ?? 0) > 0 && (
                <div>
                  <div className="mb-2 text-xs font-medium text-muted-foreground">Последние материалы</div>
                  <div className="rounded-lg border border-border divide-y divide-border bg-card">
                    {websitePreview?.sampleArticles.map((article, i) => (
                      <WebsiteArticleCard key={i} article={article} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* Name input */}
              <div className="space-y-2">
                <Label htmlFor="source-name">Название источника</Label>
                <Input
                  id="source-name"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="Введите название"
                />
                <p className="text-xs text-muted-foreground">Отображается в списках и фильтрах</p>
              </div>
            </div>
          )}

          {step === "agent-preview" && sourceType === "rss" && rssAgentPreview && rssAgentConfig && (
            <div className="space-y-4">
              <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-violet-500/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                    <Bot className="size-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground">{rssAgentPreview.sourceName}</div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{rssAgentPreview.feedUrl}</div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-sm text-muted-foreground">
                        {rssAgentPreview.sampleArticles.length} HTML-статей проверено
                      </span>
                      <Badge variant="outline" className="border-emerald-500/30 px-1.5 py-0 text-[10px] text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="size-3 mr-0.5" />
                        Article-агент: OK
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {rssAgentPreview.sampleItems.length > 0 && (
                <div>
                  <div className="mb-2 text-xs font-medium text-muted-foreground">Примеры из RSS</div>
                  <div className="overflow-hidden rounded-xl border border-border divide-y divide-border bg-card">
                    {rssAgentPreview.sampleItems.map((item, i) => (
                      <RssArticlePreviewCard key={`rss-item-${i}`} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {rssAgentPreview.sampleArticles.length > 0 && (
                <div>
                  <div className="mb-2 text-xs font-medium text-muted-foreground">Примеры после HTML-догрузки</div>
                  <div className="overflow-hidden rounded-xl border border-border divide-y divide-border bg-card">
                    {rssAgentPreview.sampleArticles.map((article, i) => (
                      <WebsiteArticleCard key={`rss-article-${i}`} article={article} index={i} />
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-muted/50 p-3">
                <div className="mb-2 text-xs font-medium text-muted-foreground">Конфиг article-парсера</div>
                <div className="space-y-1 break-all font-mono text-xs text-muted-foreground">
                  <div>kind: {rssAgentConfig.kind}</div>
                  {rssAgentConfig.article.titleSelectors.map((selector, index) => (
                    <div key={`title-${index}`}>article.titleSelectors[{index}]: {selector}</div>
                  ))}
                  {rssAgentConfig.article.contentSelectors.map((selector, index) => (
                    <div key={`content-${index}`}>article.contentSelectors[{index}]: {selector}</div>
                  ))}
                  <div>quality.minContentChars: {rssAgentConfig.quality.minContentChars}</div>
                  <div>rssFallback.minFeedContentChars: {rssAgentConfig.rssFallbackPolicy.minFeedContentChars}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== "choose-type" && step !== "checking" && step !== "agent-running" && (
          <div className="border-t px-6 py-4 flex items-center justify-between gap-3 flex-shrink-0">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              <ArrowLeft className="size-4 mr-1.5" />
              {isRssAgentStep ? "Назад к RSS" : "Назад"}
            </Button>

            {step === "enter-url" && (
              <Button onClick={handleCheck} disabled={!inputValue.trim()}>
                Проверить
                <ArrowRight className="size-4 ml-1.5" />
              </Button>
            )}

            {step === "error" && (
              <Button onClick={() => { setStep("enter-url"); setErrorMessage(""); }}>
                Попробовать снова
              </Button>
            )}

            {step === "preview" && (
              sourceType === "rss" ? (
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleCreate} disabled={!sourceName.trim() || isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 mr-1.5 animate-spin" />
                        Добавление...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="size-4 mr-1.5" />
                        Добавить как RSS
                      </>
                    )}
                  </Button>
                  <Button onClick={runRssArticleOnboarding} disabled={!sourceName.trim() || isSubmitting}>
                    <Bot className="size-4 mr-1.5" />
                    Запустить AI-анализ
                  </Button>
                </div>
              ) : (
                <Button onClick={handleCreate} disabled={!sourceName.trim() || isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 mr-1.5 animate-spin" />
                      Добавление...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="size-4 mr-1.5" />
                      Добавить источник
                    </>
                  )}
                </Button>
              )
            )}

            {step === "website-input" && (
              <Button onClick={handleStartOnboarding} disabled={!websiteUrl.trim()}>
                <Bot className="size-4 mr-1.5" />
                Запустить onboarding
              </Button>
            )}

            {step === "agent-failed" && (
              <div className="flex items-center gap-2">
                {sourceType === "rss" ? (
                  <>
                    <Button variant="outline" onClick={handleBack}>
                      Назад к RSS
                    </Button>
                    <Button onClick={handleRssAgentRetry}>
                      <RotateCcw className="size-4 mr-1.5" />
                      Повторить
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => { setStep("website-input"); setAgentError(null); }}>
                      Изменить URL
                    </Button>
                    <Button onClick={handleStartOnboarding}>
                      <RotateCcw className="size-4 mr-1.5" />
                      Повторить
                    </Button>
                  </>
                )}
              </div>
            )}

            {step === "agent-preview" && (
              sourceType === "rss" ? (
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
                    Назад к RSS
                  </Button>
                  <Button onClick={handleRssAgentApply} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 mr-1.5 animate-spin" />
                        Применение...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="size-4 mr-1.5" />
                        Принять и включить
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <Button onClick={handleWebsiteCreate} disabled={!sourceName.trim() || isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 mr-1.5 animate-spin" />
                      Добавление...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="size-4 mr-1.5" />
                      Принять и включить
                    </>
                  )}
                </Button>
              )
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
