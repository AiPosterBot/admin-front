import { useState, useEffect, useCallback, useRef } from "react";
import {
  Rss, Send, Loader2, CheckCircle, AlertTriangle,
  ArrowLeft, ArrowRight, ExternalLink,
  Calendar, FileText, Globe, ChevronDown, ChevronUp,
  Bot, Search, FileCode, Play, ShieldCheck, RotateCcw, Image,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { useTeam } from "../context/TeamContext";
// ── Service layer (мутации через сервис, не напрямую в mock-data) ────
import * as sourceService from "../services/sourceService";
import * as teamService from "../services/teamService";
import { toast } from "sonner";
import type { Source, RssMode } from "../data/mock-data";
// ── Централизованная Zod-валидация ───────────────────────────────────
import { rssSourceSchema, telegramSourceSchema, websiteSourceSchema, safeParse } from "../lib/validators";

// ── Types ──

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

// ── Agent onboarding types ──

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

// ── Expandable item component ──

function ExpandableItem({ item }: { item: SampleItem }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="px-3 py-2.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex items-start gap-2 group"
      >
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-800 dark:text-gray-100">{item.title}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(item.date)}</div>
        </div>
        <div className="flex-shrink-0 mt-0.5 text-gray-300 group-hover:text-gray-500 dark:text-gray-600 dark:group-hover:text-gray-400 transition-colors">
          {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </div>
      </button>
      {expanded && (
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 leading-relaxed">
          {item.content}
        </div>
      )}
    </div>
  );
}

// ── RSS article preview card (full text + photo) ──

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
          <div className="text-sm text-gray-800 dark:text-gray-100 font-medium">{item.title}</div>
          <div className="flex-shrink-0 mt-0.5 text-gray-300 group-hover:text-gray-500 dark:text-gray-600 dark:group-hover:text-gray-400 transition-colors">
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(item.date)}</span>
          <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
          <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{item.content.length.toLocaleString("ru-RU")} симв.</span>
          {item.imageUrl && (
            <>
              <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
                <Image className="size-3" /> фото
              </span>
            </>
          )}
        </div>
      </button>

      {/* Content */}
      {!expanded && isLong && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          {item.content.slice(0, previewLength)}...
        </p>
      )}
      {expanded && (
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800 rounded-lg p-3 whitespace-pre-line">
          {item.content}
        </div>
      )}
    </div>
  );
}

// ── Website article preview card ──

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
              className="size-16 rounded-lg object-cover bg-gray-100 dark:bg-gray-700"
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
              <div className="text-sm text-gray-800 dark:text-gray-100">{article.title}</div>
              <div className="flex-shrink-0 mt-0.5 text-gray-300 group-hover:text-gray-500 dark:text-gray-600 dark:group-hover:text-gray-400 transition-colors">
                {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(article.date)}</span>
              <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{article.charCount.toLocaleString("ru-RU")} симв.</span>
              {article.imageUrl && (
                <>
                  <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
                  <span className="inline-flex items-center gap-0.5 text-xs text-gray-400 dark:text-gray-500">
                    <Image className="size-3" /> фото
                  </span>
                </>
              )}
              <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
              <span
                className="inline-flex items-center gap-0.5 text-xs text-blue-500 hover:text-blue-700 cursor-pointer hover:underline"
                onClick={(e) => { e.stopPropagation(); window.open(article.url, "_blank"); }}
              >
                <ExternalLink className="size-3" /> источник
              </span>
            </div>
          </button>

          {/* Content preview / expanded */}
          {!expanded && isLong && (
            <div className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {article.content.slice(0, previewLength)}...
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 leading-relaxed whitespace-pre-line">
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

// ── Mock "API" responses ──

function simulateRSSCheck(url: string): Promise<{ ok: true; data: RSSFeedPreview } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const delay = 1500 + Math.random() * 1000;
    setTimeout(() => {
      try {
        const parsed = new URL(url);
        if (!parsed.protocol.startsWith("http")) {
          resolve({ ok: false, error: "URL должен начинаться с http:// ил https://" });
          return;
        }
      } catch {
        resolve({ ok: false, error: "Некорректный URL. Проверьте формат адреса." });
        return;
      }

      if (url.includes("404") || url.includes("notfound")) {
        resolve({ ok: false, error: "Страница не найдена (404). Убедитесь, что URL ведёт на RSS/Atom ленту." });
        return;
      }
      if (url.includes("private") || url.includes("auth")) {
        resolve({ ok: false, error: "Доступ запрещён (403). Лента требует авторизации, что не поддерживается." });
        return;
      }

      let domain = "";
      try { domain = new URL(url).hostname.replace("www.", ""); } catch { domain = "feed"; }
      const prettyName = domain.split(".")[0];
      const capitalized = prettyName.charAt(0).toUpperCase() + prettyName.slice(1);

      const existingSource = sourceService.getTeamSourcesList(currentTeamId ?? "").find(s => s.url === url);
      if (existingSource) {
        resolve({ ok: false, error: `Этот URL уже добавлен как источник "${existingSource.name}".` });
        return;
      }

      const feedData: RSSFeedPreview = {
        title: `${capitalized} Feed`,
        description: `Latest updates from ${domain}`,
        lastItemDate: "2026-02-27T08:00:00Z",
        sampleItems: [
          {
            title: `${capitalized}: OpenAI announces GPT-5 with revolutionary capabilities`,
            content: `OpenAI has unveiled GPT-5, featuring enhanced reasoning, multimodal understanding, and significantly reduced hallucinations. The model shows 40% improvement on standard benchmarks compared to GPT-4. CEO Sam Altman described it as "the most capable AI system we've ever built" during a live demonstration at the company's San Francisco headquarters.\n\nEnterprise pricing starts at $0.03 per 1K tokens, with a new tiered model for startups. The launch marks a major milestone in the race toward AGI — GPT-5 reportedly passes the bar exam, medical licensing exams, and scores in the 99th percentile on most standardized tests. OpenAI is also shipping a new API with 128K context and native tool use.\n\nCompetitors are rushing to respond. Google DeepMind confirmed it is accelerating Gemini Ultra 2 deployment, while Anthropic Claude 4 is expected in late Q2. The market reaction was immediate: Nvidia stock rose 6%, while legacy enterprise software vendors saw sell-offs as investors anticipate AI-driven disruption of traditional SaaS.`,
            date: "2026-02-27T08:00:00Z",
            imageUrl: "https://images.unsplash.com/photo-1655393001768-d946c97d6fd1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
          },
          {
            title: `Weekly roundup: Top stories from ${capitalized}`,
            content: `This week's highlights include the launch of Apple Vision Pro 2 with leaked specs revealing 8K displays and M4 chip, NVIDIA's announcement of the Blackwell B300 GPU with 288GB HBM3e memory, and the ongoing debate around EU AI Act enforcement.\n\nMicrosoft rolled out deep Copilot+ integration across all Office apps, affecting 400M+ users worldwide. The update brings real-time co-authoring with AI, automatic meeting summaries in Teams, and a new Copilot sidebar in Excel with natural language data queries.\n\nThe week also saw the first major EU AI Act enforcement action: a €40M fine against a European fintech for deploying a high-risk credit scoring model without proper documentation. Analysts expect this to trigger a wave of compliance reviews across the continent.`,
            date: "2026-02-27T06:30:00Z",
            imageUrl: "https://images.unsplash.com/photo-1766218326892-4b261b02a03f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
          },
          {
            title: `${capitalized} exclusive: Anthropic raises $2B at $60B valuation`,
            content: `Anthropic, the AI safety company behind Claude, has secured $2 billion in new funding at a $60 billion valuation. The round was led by Google and a consortium of tech investors including Salesforce Ventures and Tiger Global.\n\nThe funds will be used to scale Claude's infrastructure, expand the research team, and continue work on constitutional AI alignment. Anthropic CEO Dario Amodei said the company plans to triple its compute capacity by end of 2026 and open a major research lab in London.\n\nClaude 3.5 Sonnet remains the top-ranked model on most independent benchmarks for reasoning and code generation. With this funding, Anthropic expects to launch Claude 4 in Q3 2026 — featuring a 1M token context window, native image generation, and a new agents SDK.`,
            date: "2026-02-26T20:00:00Z",
            imageUrl: "https://images.unsplash.com/photo-1742072594013-c87f855e29ca?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
          },
        ],
      };

      resolve({ ok: true, data: feedData });
    }, delay);
  });
}

function simulateTelegramCheck(input: string): Promise<{ ok: true; data: TelegramChannelPreview } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const delay = 1500 + Math.random() * 1000;
    setTimeout(() => {
      let username = input.trim();
      if (username.startsWith("https://t.me/")) username = username.replace("https://t.me/", "");
      else if (username.startsWith("http://t.me/")) username = username.replace("http://t.me/", "");
      else if (username.startsWith("t.me/")) username = username.replace("t.me/", "");
      if (username.startsWith("@")) username = username.slice(1);
      username = username.split("/")[0].split("?")[0];

      if (!username || username.length < 3) {
        resolve({ ok: false, error: "Слишком короткое имя канала. Минимум 3 символа." });
        return;
      }

      if (!/^[a-zA-Z][a-zA-Z0-9_]{2,30}$/.test(username)) {
        resolve({ ok: false, error: "Некорректное имя канала. Допустимы латинские буквы, цифры и _ (начинается с буквы)." });
        return;
      }

      if (username.includes("private") || username.includes("closed")) {
        resolve({ ok: false, error: "Канал закрытый. Поддерживаются только публичные каналы." });
        return;
      }
      if (username.includes("notfound") || username.includes("deleted")) {
        resolve({ ok: false, error: "Канал не найден. Проверьте username и убедитесь, что канал существует." });
        return;
      }

      const tgUrl = `t.me/${username}`;
      const existingSource = sourceService.getTeamSourcesList(currentTeamId ?? "").find(
        s => s.type === "telegram" && (s.url === tgUrl || s.url === `@${username}` || s.url === `https://t.me/${username}`)
      );
      if (existingSource) {
        resolve({ ok: false, error: `Канал @${username} уже добавлен как источник "${existingSource.name}".` });
        return;
      }

      const prettyName = username.replace(/_/g, " ");
      const capitalized = prettyName.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

      const data: TelegramChannelPreview = {
        title: capitalized,
        username: username,
        description: `Official Telegram channel for ${capitalized}. News, updates and discussions.`,
        lastPostDate: "2026-02-27T10:30:00Z",
        samplePosts: [
          {
            title: `${capitalized}: новый релиз с важными обновлениями`,
            content: `Сегодня мы рады представить крупное обновление. В новой версии добавлена поддержка нативных инструментов, улучшена скорость обработки запросов на 35%, а также переработан интерфейс управления. Обновление уже доступно всем пользователям, подробности в документации на сайте.`,
            date: "2026-02-27T10:30:00Z",
          },
          {
            title: `Итоги недели: главные события и анонсы`,
            content: `На этой неделе было опубликовано 12 материалов, 3 эксклюзивных интервью и 2 аналитических обзора. Самый популярный пост набрал более 15 тысяч просмотров. На следующей неделе панируем серию материалов о трендах AI в 2026 году и интервью с основателями ведущих стартапов.`,
            date: "2026-02-26T18:00:00Z",
          },
          {
            title: `Важное объявление для подписчиков канала`,
            content: `Мы запускаем новый формат публикаций — еженедельные дайджесты с ключевыми новостями индустрии. Каждый понедельник в 10:00 по МСК будет выходить подборка из 5-7 самых значимых событий прошедшей недели. Также напоминаем, что у нас есть чат для обсуждений.`,
            date: "2026-02-25T12:00:00Z",
          },
        ],
      };

      resolve({ ok: true, data });
    }, delay);
  });
}

// ── Format helpers ──

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Component ──

interface AddSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSourceCreated?: (source: Source) => void;
}

export function AddSourceDialog({ open, onOpenChange, onSourceCreated }: AddSourceDialogProps) {
  const { currentTeamId } = useTeam();
  const team = teamService.getTeamById(currentTeamId);

  const [step, setStep] = useState<Step>("choose-type");
  const [sourceType, setSourceType] = useState<SourceType>("rss");
  const [inputValue, setInputValue] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [rssPreview, setRssPreview] = useState<RSSFeedPreview | null>(null);
  const [tgPreview, setTgPreview] = useState<TelegramChannelPreview | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  // ── RSS mode state ──
  const [rssMode, setRssMode] = useState<RssMode>("feed_only");
  const [rssMinFeedContentChars, setRssMinFeedContentChars] = useState(700);
  const [rssPreferFeedWhenFull, setRssPreferFeedWhenFull] = useState(true);

  // ── Website agent state ──
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websiteTitle, setWebsiteTitle] = useState("");
  const [websiteUrlError, setWebsiteUrlError] = useState<string | null>(null);
  const [agentStages, setAgentStages] = useState<AgentStage[]>([]);
  const [agentProgress, setAgentProgress] = useState(0);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [agentLogsExpanded, setAgentLogsExpanded] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [websitePreview, setWebsitePreview] = useState<WebsitePreview | null>(null);
  const agentAbortRef = useRef(false);

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
      setWebsiteTitle("");
      setWebsiteUrlError(null);
      setAgentStages([]);
      setAgentProgress(0);
      setAgentLogs([]);
      setAgentLogsExpanded(false);
      setAgentError(null);
      setWebsitePreview(null);
      agentAbortRef.current = false;
      setRssMode("feed_only");
      setRssMinFeedContentChars(700);
      setRssPreferFeedWhenFull(true);
    } else {
      agentAbortRef.current = true;
    }
  }, [open]);

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
      setWebsiteTitle("");
      setWebsiteUrlError(null);
      setAgentStages([]);
      setAgentProgress(0);
      setAgentLogs([]);
      setAgentLogsExpanded(false);
      setAgentError(null);
      setWebsitePreview(null);
      setStep("website-input");
    } else {
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
      setStep("website-input");
      setAgentError(null);
    } else if (step === "agent-preview") {
      setStep("website-input");
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
    setInputError(null);
    setStep("checking");

    if (sourceType === "rss") {
      const result = await simulateRSSCheck(inputValue.trim());
      if (result.ok) {
        setRssPreview(result.data);
        setSourceName(result.data.title);
        setStep("preview");
      } else {
        setErrorMessage(result.error);
        setStep("error");
      }
    } else {
      const result = await simulateTelegramCheck(inputValue.trim());
      if (result.ok) {
        setTgPreview(result.data);
        setSourceName(result.data.title);
        setStep("preview");
      } else {
        setErrorMessage(result.error);
        setStep("error");
      }
    }
  }, [inputValue, sourceType]);

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

  // ── Website agent onboarding ──
  const initialStages: () => AgentStage[] = () => [
    { id: "analyze_list", label: "Анализ списка статей", icon: <Search className="size-3.5" />, status: "pending" },
    { id: "open_samples", label: "Открытие примеров статей", icon: <FileText className="size-3.5" />, status: "pending" },
    { id: "generate_config", label: "Генерация конфигурации", icon: <FileCode className="size-3.5" />, status: "pending" },
    { id: "dry_run", label: "Тестовый запуск парсинга", icon: <Play className="size-3.5" />, status: "pending" },
    { id: "verdict", label: "Финальная проверка", icon: <ShieldCheck className="size-3.5" />, status: "pending" },
  ];

  const handleStartOnboarding = async () => {
    // Нормализованный URL — единый источник правды в этой функции
    const validatedUrl = websiteUrl.trim();

    // Validate через Zod-схему из lib/validators
    const result = safeParse(websiteSourceSchema, {
      url: validatedUrl,
      name: websiteTitle.trim() || "placeholder", // name обязателен, отдельно проверяем title
    });
    if (!result.ok) {
      // Zod v4: ZodError хранит ошибки в .issues (не в .errors)
      setWebsiteUrlError(result.errors.issues[0]?.message ?? "Некорректный URL");
      return;
    }
    if (!websiteTitle.trim()) { setWebsiteUrlError("Введите название источника"); return; }

    const existingSource = sourceService.getTeamSourcesList(currentTeamId ?? "").find(s => s.url === validatedUrl);
    if (existingSource) { setWebsiteUrlError(`Этот URL уже добавлен как "${existingSource.name}"`); return; }

    setWebsiteUrlError(null);
    agentAbortRef.current = false;

    const stages = initialStages();
    setAgentStages(stages);
    setAgentProgress(0);
    setAgentLogs([]);
    setAgentLogsExpanded(false);
    setAgentError(null);
    setWebsitePreview(null);
    setStep("agent-running");

    let domain = "";
    try { domain = new URL(validatedUrl).hostname.replace("www.", ""); } catch { domain = "site"; }

    const shouldFail = validatedUrl.includes("404") || validatedUrl.includes("fail") || validatedUrl.includes("error");

    const stageDetails = [
      {
        logs: [
          `[agent] Открываю ${validatedUrl}...`,
          `[agent] Страница загружена за 1.2s`,
          `[agent] Найдено 24 ссылки на статьи`,
          `[agent] Определён паттерн URL: /${domain}/article/*`,
        ],
        duration: 2000,
      },
      {
        logs: [
          `[agent] Открываю 3 случайные статьи для анализа...`,
          `[agent] Статья 1: "Новые технологии 2026" — 1847 символов`,
          `[agent] Статья 2: "Обзор рынка AI" — 2103 символа`,
          `[agent] Статья 3: "Тренды разработки" — 1562 символа`,
        ],
        duration: 2500,
      },
      {
        logs: [
          `[agent] Анализирую DOM-структуру статей...`,
          `[agent] Определён selector заголовка: h1.article-title`,
          `[agent] Определён selector контента: div.article-body`,
          `[agent] Определён selector даты: time[datetime]`,
          `[agent] Конфигурация сгенерирована`,
        ],
        duration: 2000,
      },
      {
        logs: shouldFail
          ? [
              `[agent] Запускаю dry-run парсинг...`,
              `[agent] ❌ Ошибка: не удалось извлечь контент ни из одной статьи`,
              `[agent] Возможная причина: контент загружается динамически через JS`,
            ]
          : [
              `[agent] Запускаю dry-run парсинг...`,
              `[agent] Статья 1: OK (заголовок, контент, дат��, изображение)`,
              `[agent] Статья 2: OK (заголовок, контент, дата)`,
              `[agent] Статья 3: OK (заголовок, контент, дата, изображение)`,
              `[agent] Dry-run успешен: 3/3 статьи спарсены`,
            ],
        duration: 2500,
      },
      {
        logs: shouldFail
          ? [`[agent] ❌ Verdict: FAILED — сайт не поддерживается для автоматического парсинга`]
          : [
              `[agent] Проверяю качество контента...`,
              `[agent] Средняя длина: 1837 символов — OK`,
              `[agent] Уникальность контента: 98% — OK`,
              `[agent] ✅ Verdict: PASSED — источник готов к подключению`,
            ],
        duration: 1500,
      },
    ];

    for (let i = 0; i < stages.length; i++) {
      if (agentAbortRef.current) return;

      // Set current stage to running
      setAgentStages(prev => prev.map((s, idx) =>
        idx === i ? { ...s, status: "running" } : s
      ));
      setAgentProgress(Math.round(((i) / stages.length) * 100));

      // Add logs progressively
      const detail = stageDetails[i];
      for (let logIdx = 0; logIdx < detail.logs.length; logIdx++) {
        if (agentAbortRef.current) return;
        await new Promise(r => setTimeout(r, detail.duration / detail.logs.length));
        const logLine = detail.logs[logIdx];
        setAgentLogs(prev => [...prev, logLine]);
      }

      if (agentAbortRef.current) return;

      // Check for failure on dry_run stage
      if (shouldFail && i === 3) {
        setAgentStages(prev => prev.map((s, idx) =>
          idx === i ? { ...s, status: "error" } : s
        ));
        setAgentProgress(Math.round(((i + 1) / stages.length) * 100));

        // Also run verdict as error
        setAgentStages(prev => prev.map((s, idx) =>
          idx === 4 ? { ...s, status: "error" } : s
        ));
        for (const logLine of stageDetails[4].logs) {
          setAgentLogs(prev => [...prev, logLine]);
        }

        setAgentError("Не удалось настроить парсинг для этого сайта. Контент загружается динамически через JavaScript, что не поддерживается автоматическим агентом.");
        setStep("agent-failed");
        return;
      }

      // Mark done
      setAgentStages(prev => prev.map((s, idx) =>
        idx === i ? { ...s, status: "done" } : s
      ));
      setAgentProgress(Math.round(((i + 1) / stages.length) * 100));
    }

    // Success!
    const prettyName = domain.split(".")[0];
    const capitalized = prettyName.charAt(0).toUpperCase() + prettyName.slice(1);

    const a1 = "Подробный обзор технологических трендов 2026 года. Искусственный интеллект продолжает трансформировать бизнес-процессы на всех уровнях — от автоматизации рутинных задач в бухгалтерии до принятия стратегических решений на уровне совета директоров. Квантовые вычисления наконец выходят из лабораторий в реальные проекты: IBM и Google уже предлагают коммерческий доступ к квантовым процессорам нов��го поколения с error correction.\n\nКомпании увеличивают инвестиции в AI-инфраструктуру, а спрос на специалистов растёт на 45% год к году. По данным LinkedIn, наиболее востребованы позиции AI/ML Engineer, Prompt Engineer и Data Platform Architect. Зарплаты в этих ролях достигают $250-350K в Bay Area и $180-250K remote.\n\nОсобенно интересно развитие му��ьтимодальных моделей. GPT-5, Claude 4 и Gemini Ultra 2 уже умеют обрабатывать в��део в реальном времени, генерировать 3D-объекты и работать с кодовыми базами в миллионы строк. Это открывает совершенно новые сценарии: от автоматической генерации UI по скетчу до полноценного code review с учётом архитектурного контекста. Ожидается, что к Q4 2026 более 60% enterprise-компаний из Fortune 500 интегрируют мультимодальные AI в свои продукты.\n\nОтдельного внимания заслуживает направление AI Agents. Автономные агенты, способные выполнять многошаговые задачи без участия человека, из экспериментального концепта превращаются в зрелый продукт. Devin от Cognition Labs, Agent от Anthropic и Copilot Workspace от GitHub — все они демонстрируют способность писать, тестировать и деплоить код с минимальным надзором. Аналитики Gartner прогнозируют, что к 2027 году AI-агенты будут участвовать в 30% всех software engineering задач.";
    const a2 = "Аналитики Goldman Sachs прогнозируют рост рынка AI до $500B к концу 2026. Основные драйверы роста — enterprise-решения для автоматизации бизнес-процессов, автономные агенты нового поко��ения и мультимодальные модели с расширенными возможностями. Ожидается волна M&A-сделок среди стартапов серий B-C, особенно в сегменте вертикальных AI-решений для healthcare, fintech и legal tech.\n\nИнвестиции в AI-инфраструктуру бьют рекорды. NVIDIA сообщает о росте выручки от data center GPU на 127% год к году, а общий объём инвестиций в data center строительство превысил $180B только за первое полугодие 2026. Гиперскейлеры — Amazon, Microsoft, Google — инвестируют совокупно более $100B в расширение вычислительных мощностей, при этом более 40% этих инвестиций напрямую связаны с AI-нагрузками.\n\nРынок enterprise AI-платформ переживает фазу консолидации. Крупнейшие сделки Q1 2026: Databricks приобрела MosaicML за $4.2B для усиления capabilities в области foundation models, а Snowflake завершила поглощение Streamlit и Neeva. Стартапы с ARR менее $10M всё чаще становятся целями для acqui-hire.\n\nОтдельный тренд — sovereign AI. Правительства Франции, Германии, Японии и ОАЭ запускают национальные программы по созданию собственных foundation models. Общий объём государственных инвестиций в sovereign AI оценивается в $25B, что создаёт новый сегмент рынка.";
    const a3 = "React Server Components становятся де-факто стандартом для серьёзных production-приложений. Next.js 15, Remix 3 и новый фреймворк от Vercel — все они строятся вокруг идеи server-first рендеринга с гранулярной клиент-серверной границей. Svelte 5 набирает обороты благодаря совершенно новому runtime на основе Runes.\n\nAI-assisted coding tools используют уже 78% разработчиков. GitHub Copilot остаётся лидером с 65% market share, но конкуренция усиливается: Cursor, Windsurf и JetBrains AI Assistant активно наращивают долю. Ключевой тренд — переход от code completion к code agents: инструменты нового поколения умеют выполнять полноценные задачи.\n\nCSS-in-JS уходит в прошлое. Tailwind CSS v4, Lightning CSS и Vanilla Extract доминируют в новых проектах. StyleX от Meta набирает популярность в enterprise-сегменте. Одновременно растёт интерес к нативным CSS-фичам: Container Queries, :has(), View Transitions API — всё это уже подд��рживается.\n\nОбзор ключевых фреймворков показывает смещение приоритетов. Если раньше основной метрикой был Developer Experience, то теперь фокус смещается на Performance Budget: Core Web Vitals, bundle size, time-to-interactive. Astro 4 завоевал нишу контентных сайтов.";
    const a4 = "Эксклюзивное интервью с основателем компании, разрабатывающей автономных AI-агентов для бизнеса. Через 2 года агенты будут выполнять 60% рутинных задач в enterprise-компаниях — CEO делится видением и планами. Компания привлекла $85M в раунде Series B при оценке в $600M.\n\nМы начинали с прост��й идеи: что если AI мог бы не просто отвечать на вопросы, а реально делать работу? Не генерировать текст, а выполнять задачи от начала до конца — с планированием, декомпозицией, обработкой ошибок и финальной проверкой результата. Первый прототип мы собрали за три недели на базе GPT-4. Он умел только отправлять email-ы и создавать тикеты в Jira. Сейчас наши агенты обрабатывают сотни бизнес-процессов.\n\nКлючевое отличие подхода — фокус на reliability. Большинство AI-агентов ломаются на edge cases. Наша архитектура построена на принципе fail gracefully: агент всегда знает, когда он не уверен, и эскалирует задачу человеку. Мы измеряем процент задач, завершённых без эскалации в production — и этот показатель у нас 94.7%.\n\nПланы на 2026-2027: выход на рынки США и Японии, запуск marketplace для кастомных агентов, и интеграция с 50+ enterprise-системами. Наша миссия — сделать AI-агентов таким же стандартным инструментом, как email или Slack.";

    setWebsitePreview({
      title: websiteTitle.trim() || `${capitalized} Articles`,
      url: validatedUrl,
      articlesFound: 24,
      sampleArticles: [
        {
          title: `${capitalized}: Новые технологии 2026 года меняют индустрию`,
          url: `${validatedUrl}/article/new-tech-2026`,
          content: a1,
          date: "2026-02-28T10:00:00Z",
          imageUrl: "https://images.unsplash.com/photo-1749006590639-e749e6b7d84c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
          charCount: a1.length,
        },
        {
          title: `Обзор рынка AI: прогнозы аналитиков на Q2 2026`,
          url: `${validatedUrl}/article/ai-market-q2`,
          content: a2,
          date: "2026-02-27T14:30:00Z",
          imageUrl: "https://images.unsplash.com/photo-1766218326892-4b261b02a03f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
          charCount: a2.length,
        },
        {
          title: `Тренды фронтенд-разработки: что изменится в этом году`,
          url: `${validatedUrl}/article/frontend-trends`,
          content: a3,
          date: "2026-02-26T09:15:00Z",
          imageUrl: "https://images.unsplash.com/photo-1605379399642-870262d3d051?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
          charCount: a3.length,
        },
        {
          title: `Интервью: CEO стартапа о будущем автономных агентов`,
          url: `${validatedUrl}/article/autonomous-agents`,
          content: a4,
          date: "2026-02-25T16:00:00Z",
          imageUrl: "https://images.unsplash.com/photo-1714976694619-9dbbb6be9cde?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
          charCount: a4.length,
        },
      ],
      config: {
        listSelector: `div.articles-list > article`,
        articleSelector: `article.post`,
        titleSelector: `h1.article-title`,
        contentSelector: `div.article-body`,
        dateSelector: `time[datetime]`,
      },
    });
    setSourceName(websiteTitle.trim() || `${capitalized} Articles`);
    setStep("agent-preview");
  };


  const handleWebsiteCreate = async () => {
    if (!currentTeamId || !sourceName.trim() || !websitePreview) return;
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 400));

    const createResult = await sourceService.createSource(currentTeamId, {
      name: sourceName.trim(),
      type: "website",
      url: websitePreview.url,
      // Передаём конфиг агента, чтобы источник сразу имел activeConfigJson
      initialConfig: {
        kind: 'website_full' as const,
        version: 1,
        list: {
          itemSelectors: [websitePreview.config.listSelector],
          linkSelectors: [],
        },
        article: {
          titleSelectors:     [websitePreview.config.titleSelector],
          contentSelectors:   [websitePreview.config.contentSelector],
          dateSelectors:      [websitePreview.config.dateSelector],
          mediaSelectors:     ["meta[property='og:image']"],
          idSelectors:        [],
          canonicalSelectors: ["link[rel='canonical']"],
        },
        quality: { minContentChars: 150 },
      },
    });
    setIsSubmitting(false);
    if (!createResult.ok) {
      toast.error(createResult.error);
      return;
    }
    onOpenChange(false);
    toast.success(`Источник "${createResult.data.name}" добавлен через агента`);
    onSourceCreated?.(createResult.data);
  };

  // Check limits (через сервис, не напрямую из mock)
  const currentSourcesCount = sourceService.getTeamSourcesList(currentTeamId ?? "").length;
  const maxSources = team?.limits.maxSources ?? 20;
  const isAtLimit = currentSourcesCount >= maxSources;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            {step !== "choose-type" && step !== "agent-running" && (
              <button
                onClick={handleBack}
                className="size-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400 flex-shrink-0"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            <div>
              <DialogTitle>
                {step === "choose-type" && "Добавить источник"}
                {step === "enter-url" && (sourceType === "rss" ? "RSS лента" : "Telegram канал")}
                {step === "checking" && "Проверка..."}
                {step === "preview" && "Подтверждение"}
                {step === "error" && "Ошибка проверки"}
                {step === "website-input" && "Website (агент)"}
                {step === "agent-running" && "Настройка парсинга..."}
                {step === "agent-failed" && "Ошибка настройки"}
                {step === "agent-preview" && "Результат парсинга"}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 mt-0.5">
                {step === "choose-type" && "Выберите тип источника для сбора контента"}
                {step === "enter-url" && sourceType === "rss" && "Введите URL RSS или Atom ленты"}
                {step === "enter-url" && sourceType === "telegram" && "Введите username или ссылку на канал"}
                {step === "checking" && "Подключаемся и проверяем доступность..."}
                {step === "preview" && "Проверьте данные и подтвердите добавление"}
                {step === "error" && "Не удалось подключиться к источнику"}
                {step === "website-input" && "Введите URL и название, агент настроит парсинг"}
                {step === "agent-running" && "AI-агент анализирует сайт..."}
                {step === "agent-failed" && "Агент не смог настроить парсинг"}
                {step === "agent-preview" && "Проверьте результат и подтвердите"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ── Step indicators ── */}
        {step !== "choose-type" && (
          <div className="px-6 pb-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              {(sourceType === "website"
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
                  <div key={label} className="flex items-center gap-2 flex-1">
                    <div className={`flex items-center gap-1.5 ${isActive ? "text-blue-600" : isDone ? "text-green-600" : "text-gray-300 dark:text-gray-600"}`}>
                      <div className={`size-5 rounded-full flex items-center justify-center text-xs ${
                        isDone ? "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400" :
                        isActive ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400" :
                        "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                      }`}>
                        {isDone ? <CheckCircle className="size-3" /> : i + 1}
                      </div>
                      <span className={`text-xs hidden sm:inline ${isActive ? "font-medium" : ""}`}>{label}</span>
                    </div>
                    {i < 3 && <div className={`flex-1 h-px ${isDone ? "bg-green-200 dark:bg-green-800/50" : "bg-gray-200 dark:bg-gray-700"}`} />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="border-t flex-shrink-0" />

        {/* ── Body ── */}
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
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 dark:disabled:hover:border-gray-700 disabled:hover:bg-transparent"
              >
                <div className="size-11 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors">
                  <Rss className="size-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100">RSS / Atom</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Подключить RSS или Atom ленту любого сайта
                  </div>
                </div>
                <ArrowRight className="size-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-400 transition-colors flex-shrink-0" />
              </button>

              <button
                onClick={() => !isAtLimit && handleSelectType("telegram")}
                disabled={isAtLimit}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 dark:disabled:hover:border-gray-700 disabled:hover:bg-transparent"
              >
                <div className="size-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                  <Send className="size-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100">Telegram канал</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Подключить публичный Telegram канал для парсинга постов
                  </div>
                </div>
                <ArrowRight className="size-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-400 transition-colors flex-shrink-0" />
              </button>

              <button
                onClick={() => !isAtLimit && handleSelectType("website")}
                disabled={isAtLimit}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 dark:disabled:hover:border-gray-700 disabled:hover:bg-transparent"
              >
                <div className="size-11 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                  <Globe className="size-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    Website
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400">
                      <Bot className="size-3 mr-0.5" />
                      агент
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    AI-агент проанализирует сайт и настроит парсинг
                  </div>
                </div>
                <ArrowRight className="size-4 text-gray-300 dark:text-gray-600 group-hover:text-purple-400 transition-colors flex-shrink-0" />
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
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-1.5">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Примеры URL</div>
                    <div className="space-y-1">
                      {[
                        "https://techcrunch.com/feed",
                        "https://habr.com/ru/rss/all/all/",
                        "https://blog.example.com/rss.xml",
                      ].map(url => (
                        <button
                          key={url}
                          onClick={() => { setInputValue(url); setInputError(null); }}
                          className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                        >
                          <ExternalLink className="size-3" />
                          {url}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* RSS mode picker — shown after URL is pasted */}
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Режим загрузки</div>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        onClick={() => setRssMode("feed_only")}
                        className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                          rssMode === "feed_only"
                            ? "border-orange-400 bg-orange-50 dark:bg-orange-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        <div className={`size-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          rssMode === "feed_only" ? "bg-orange-100 dark:bg-orange-900/40" : "bg-gray-100 dark:bg-gray-700"
                        }`}>
                          <Rss className={`size-4 ${rssMode === "feed_only" ? "text-orange-600 dark:text-orange-400" : "text-gray-400 dark:text-gray-500"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${rssMode === "feed_only" ? "text-orange-800 dark:text-orange-300" : "text-gray-700 dark:text-gray-300"}`}>
                            Только RSS
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                            Контент берётся напрямую из ленты
                          </div>
                        </div>
                        <div className={`size-4 rounded-full border-2 mt-1 flex-shrink-0 flex items-center justify-center ${
                          rssMode === "feed_only" ? "border-orange-500 bg-orange-500" : "border-gray-300 dark:border-gray-600"
                        }`}>
                          {rssMode === "feed_only" && <div className="size-1.5 rounded-full bg-white" />}
                        </div>
                      </button>

                      <button
                        onClick={() => setRssMode("feed_with_article_agent")}
                        className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                          rssMode === "feed_with_article_agent"
                            ? "border-purple-400 bg-purple-50 dark:bg-purple-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        <div className={`size-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          rssMode === "feed_with_article_agent" ? "bg-purple-100 dark:bg-purple-900/40" : "bg-gray-100 dark:bg-gray-700"
                        }`}>
                          <Bot className={`size-4 ${rssMode === "feed_with_article_agent" ? "text-purple-600 dark:text-purple-400" : "text-gray-400 dark:text-gray-500"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${rssMode === "feed_with_article_agent" ? "text-purple-800 dark:text-purple-300" : "text-gray-700 dark:text-gray-300"}`}>
                            RSS + догрузка статьи
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                            Агент открывает полную статью и извлекает полный текст
                          </div>
                        </div>
                        <div className={`size-4 rounded-full border-2 mt-1 flex-shrink-0 flex items-center justify-center ${
                          rssMode === "feed_with_article_agent" ? "border-purple-500 bg-purple-500" : "border-gray-300 dark:border-gray-600"
                        }`}>
                          {rssMode === "feed_with_article_agent" && <div className="size-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-1.5">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Поддерживаемые форматы</div>
                  <div className="space-y-1">
                    {[
                      { format: "@channel_name", desc: "Username с @" },
                      { format: "t.me/channel_name", desc: "Короткая ссылка" },
                      { format: "https://t.me/channel_name", desc: "Полная ссылка" },
                    ].map(({ format, desc }) => (
                      <div key={format} className="flex items-center gap-2 text-xs">
                        <code className="bg-white dark:bg-gray-700 border dark:border-gray-600 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300 font-mono">{format}</code>
                        <span className="text-gray-400 dark:text-gray-500">{desc}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-1 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
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
              <div className="mx-auto size-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <Loader2 className="size-5 text-blue-500 dark:text-blue-400 animate-spin" />
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                {sourceType === "rss" ? "Загрузка RSS ленты..." : "Проверка канала..."}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500">
                {sourceType === "rss"
                  ? "Подключаемся к серверу и парсим XML..."
                  : "Получаем информацию о канале через Telegram API..."
                }
              </div>
              <div className="mt-4 text-xs text-gray-300 dark:text-gray-600 font-mono truncate px-4">
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

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Что попробовать?</div>
                <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
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
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0">
                    {rssMode === "feed_with_article_agent"
                      ? <Bot className="size-5 text-purple-600 dark:text-purple-400" />
                      : <Rss className="size-5 text-orange-600 dark:text-orange-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{rssPreview.title}</div>
                      {rssMode === "feed_with_article_agent" ? (
                        <span className="text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-medium">RSS + HTML</span>
                      ) : (
                        <span className="text-[10px] bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded font-medium">Feed only</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{inputValue}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-1.5">{rssPreview.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-orange-200/50 dark:border-orange-800/30">
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <Calendar className="size-3.5 text-orange-500 dark:text-orange-400" />
                    Последний материал {formatDate(rssPreview.lastItemDate)}
                  </div>
                </div>
              </div>

              {/* Sample articles — full content with images */}
              {rssPreview.sampleItems.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Последние материалы</div>
                  <div className="border dark:border-gray-700 rounded-xl divide-y dark:divide-gray-700 overflow-hidden">
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
                <p className="text-xs text-gray-400 dark:text-gray-500">Отображается в списках и фильтрах</p>
              </div>
            </div>
          )}

          {/* Step: Preview - Telegram */}
          {step === "preview" && sourceType === "telegram" && tgPreview && (
            <div className="space-y-4">
              {/* Channel info card */}
              <div className="bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                    <Send className="size-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{tgPreview.title}</div>
                    <a
                      href={`https://t.me/${tgPreview.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors inline-flex items-center gap-1 mt-0.5"
                    >
                      @{tgPreview.username}
                      <ExternalLink className="size-3" />
                    </a>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-1.5">{tgPreview.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-blue-200/50 dark:border-blue-800/30">
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <Calendar className="size-3.5 text-blue-500 dark:text-blue-400" />
                    Посл. пост {formatDate(tgPreview.lastPostDate)}
                  </div>
                </div>
              </div>

              {/* Sample posts — expandable */}
              {tgPreview.samplePosts.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Спаршенные посты для примера</div>
                  <div className="border dark:border-gray-700 rounded-lg divide-y dark:divide-gray-700">
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
                <p className="text-xs text-gray-400 dark:text-gray-500">Отображается в списках и фильтрах</p>
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

              <div className="space-y-2">
                <Label htmlFor="website-title">Название источника</Label>
                <Input
                  id="website-title"
                  value={websiteTitle}
                  onChange={(e) => setWebsiteTitle(e.target.value)}
                  placeholder="Введите название"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500">Отображается в списках и фильтрах</p>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-purple-700 dark:text-purple-300">
                  <Bot className="size-3.5" />
                  Как это работает
                </div>
                <ol className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-decimal list-inside">
                  <li>Агент откроет сайт и найдёт список статей</li>
                  <li>Откроет несколько случайных статей для анализа</li>
                  <li>Сгенерирует конфигурацию парсера (CSS-селекторы)</li>
                  <li>Проведёт тестовый запуск и проверит результат</li>
                </ol>
                <div className="pt-1 text-xs font-medium text-gray-600 dark:text-gray-400">Примеры URL</div>
                <div className="space-y-1">
                  {[
                    "https://techcrunch.com",
                    "https://habr.com/ru/articles/",
                    "https://blog.example.com",
                  ].map(url => (
                    <button
                      key={url}
                      onClick={() => { setWebsiteUrl(url); setWebsiteUrlError(null); }}
                      className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors"
                    >
                      <ExternalLink className="size-3" />
                      {url}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step: Agent running */}
          {step === "agent-running" && (
            <div className="space-y-4">
              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Прогресс</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{agentProgress}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${agentProgress}%` }}
                  />
                </div>
              </div>

              {/* Agent stages */}
              <div className="space-y-1">
                {agentStages.map(stage => (
                  <div
                    key={stage.id}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                      stage.status === "running" ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300" :
                      stage.status === "done" ? "text-gray-600 dark:text-gray-400" :
                      stage.status === "error" ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300" :
                      "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {stage.status === "pending" && <div className="size-4 rounded-full border-2 border-gray-200 dark:border-gray-600" />}
                    {stage.status === "running" && <Loader2 className="size-4 text-purple-500 dark:text-purple-400 animate-spin" />}
                    {stage.status === "done" && <CheckCircle className="size-4 text-green-500" />}
                    {stage.status === "error" && <AlertTriangle className="size-4 text-red-500" />}
                    <span>{stage.label}</span>
                  </div>
                ))}
              </div>

              {/* Logs (collapsible) */}
              <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setAgentLogsExpanded(!agentLogsExpanded)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Логи агента ({agentLogs.length})</span>
                  {agentLogsExpanded ? <ChevronUp className="size-3.5 text-gray-400" /> : <ChevronDown className="size-3.5 text-gray-400" />}
                </button>
                {agentLogsExpanded && (
                  <div className="px-3 py-2 max-h-[150px] overflow-y-auto bg-gray-900 font-mono">
                    {agentLogs.map((log, i) => (
                      <div key={i} className="text-xs text-green-400 leading-relaxed">
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-center text-xs text-gray-400 dark:text-gray-500 font-mono truncate">
                {websiteUrl}
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
                  <div className="text-sm font-medium text-red-800 dark:text-red-300">Не удалось настроить парсинг</div>
                  <div className="text-sm text-red-600 dark:text-red-400 mt-1">{agentError}</div>
                  <div className="mt-2 text-xs text-red-400 dark:text-red-500 font-mono truncate max-w-[320px]">{websiteUrl}</div>
                </div>
              </div>

              {/* Agent stages summary */}
              <div className="space-y-1">
                {agentStages.map(stage => (
                  <div
                    key={stage.id}
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs ${
                      stage.status === "done" ? "text-gray-500 dark:text-gray-400" :
                      stage.status === "error" ? "text-red-600 dark:text-red-400" :
                      "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {stage.status === "done" && <CheckCircle className="size-3.5 text-green-500" />}
                    {stage.status === "error" && <AlertTriangle className="size-3.5 text-red-500" />}
                    {stage.status === "pending" && <div className="size-3.5 rounded-full border border-gray-200 dark:border-gray-600" />}
                    <span>{stage.label}</span>
                  </div>
                ))}
              </div>

              {/* Logs */}
              <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setAgentLogsExpanded(!agentLogsExpanded)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Логи агента ({agentLogs.length})</span>
                  {agentLogsExpanded ? <ChevronUp className="size-3.5 text-gray-400" /> : <ChevronDown className="size-3.5 text-gray-400" />}
                </button>
                {agentLogsExpanded && (
                  <div className="px-3 py-2 max-h-[150px] overflow-y-auto bg-gray-900 font-mono">
                    {agentLogs.map((log, i) => (
                      <div key={i} className={`text-xs leading-relaxed ${log.includes("❌") ? "text-red-400" : "text-green-400"}`}>
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Что попробовать?</div>
                <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <li>Проверьте, что сайт не загружает контент динамически через JavaScript</li>
                  <li>Попробуйте указать URL страницы со списком статей</li>
                  <li>Убедитесь, что сайт доступен публично</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step: Agent preview */}
          {step === "agent-preview" && (
            <div className="space-y-4">
              {/* Site info card */}
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border border-purple-200 dark:border-purple-800/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                    <Globe className="size-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{websitePreview?.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{websitePreview?.url}</div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Найдено {websitePreview?.articlesFound} статей</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-300 dark:border-green-700 text-green-600 dark:text-green-400">
                        <CheckCircle className="size-3 mr-0.5" />
                        Агент: OK
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-purple-200/50 dark:border-purple-800/30">
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <Calendar className="size-3.5 text-purple-500 dark:text-purple-400" />
                    Последний материал {formatDate(websitePreview?.sampleArticles[0].date || "")}
                  </div>
                </div>
              </div>

              {/* Sample items — expandable */}
              {(websitePreview?.sampleArticles?.length ?? 0) > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Последние материалы</div>
                  <div className="border dark:border-gray-700 rounded-lg divide-y dark:divide-gray-700">
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
                <p className="text-xs text-gray-400 dark:text-gray-500">Отображается в списках и фильтрах</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {step !== "choose-type" && step !== "checking" && step !== "agent-running" && (
          <div className="border-t px-6 py-4 flex items-center justify-between gap-3 flex-shrink-0">
            <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
              <ArrowLeft className="size-4 mr-1.5" />
              Назад
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
            )}

            {step === "website-input" && (
              <Button onClick={handleStartOnboarding} disabled={!websiteUrl.trim() || !websiteTitle.trim()}>
                <Bot className="size-4 mr-1.5" />
                Запустить onboarding
              </Button>
            )}

            {step === "agent-failed" && (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => { setStep("website-input"); setAgentError(null); }}>
                  Изменить URL
                </Button>
                <Button onClick={handleStartOnboarding}>
                  <RotateCcw className="size-4 mr-1.5" />
                  Повторить
                </Button>
              </div>
            )}

            {step === "agent-preview" && (
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
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}