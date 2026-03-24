// ------------------------------------------------------------------------------
// DTO types define the strict frontend contract for backend responses.
// Pages and services normalize API payloads into these read-model shapes.
// ------------------------------------------------------------------------------

// ── Статусы ──────────────────────────────────────────────────────────

export type JobStatus = 'pending' | 'running' | 'success' | 'failed';

export type JobType =
  | 'refresh_channel_metadata'
  | 'publish_to_channel'
  | 'fetch_rss'
  | 'fetch_rss_hybrid'
  | 'fetch_telegram'
  | 'fetch_website'
  | 'onboard_website'
  | 'onboard_rss_article'
  | 'ads_campaign';

// ── Job Params (дискриминированный union по полю `type`) ─────────────

export interface RefreshChannelMetadataParams {
  type: 'refresh_channel_metadata';
  channelId: string;
}
export interface PublishToChannelParams {
  type: 'publish_to_channel';
  channelId: string;
  channelName: string;
  sourceId?: string;
  sourceName?: string;
  itemId?: string;
}
export interface FetchRssParams {
  type: 'fetch_rss';
  sourceId: string;
  sourceName: string;
}
export interface FetchRssHybridParams {
  type: 'fetch_rss_hybrid';
  sourceId: string;
  sourceName: string;
}
export interface FetchTelegramParams {
  type: 'fetch_telegram';
  sourceId: string;
  sourceName: string;
}
export interface FetchWebsiteParams {
  type: 'fetch_website';
  sourceId: string;
  sourceName: string;
}
export interface OnboardWebsiteParams {
  type: 'onboard_website';
  url: string;
  sourceName?: string;
  sourceId?: string;
}
export interface OnboardRssArticleParams {
  type: 'onboard_rss_article';
  sourceId: string;
  sourceName: string;
  feedUrl: string;
}
export interface AdsCampaignParams {
  type: 'ads_campaign';
  campaignId: string;
  campaignName: string;
}

/** Дискриминированный union всех параметров джобов */
export type JobParams =
  | RefreshChannelMetadataParams
  | PublishToChannelParams
  | FetchRssParams
  | FetchRssHybridParams
  | FetchTelegramParams
  | FetchWebsiteParams
  | OnboardWebsiteParams
  | OnboardRssArticleParams
  | AdsCampaignParams;

// ── Job Results (дискриминированный union по полю `type`) ─────────────

export interface RefreshChannelMetadataResult {
  type: 'refresh_channel_metadata';
  channelId: string;
  botCanPost: boolean;
  telegramUsername?: string | null;
  subscribersCount: number;
  publishOutcome: string;
}
export interface PublishToChannelResult {
  type: 'publish_to_channel';
  postedItemId: string;
  telegramMessageId?: number;
}
export interface FetchRssResult {
  type: 'fetch_rss';
  newItemsCount: number;
}
export interface FetchRssHybridResult {
  type: 'fetch_rss_hybrid';
  totalFetched: number;
  savedFromFeed: number;
  parsedFromArticle: number;
  fallbackSavedAsTeaser: number;
  parseErrors: number;
  failedUrls: string[];
}
export interface FetchTelegramResult {
  type: 'fetch_telegram';
  newItemsCount: number;
}
export interface FetchWebsiteResult {
  type: 'fetch_website';
  newItemsCount: number;
}
export interface OnboardWebsiteResult {
  type: 'onboard_website';
  configVersion: number;
  articlesScanned: number;
}
export interface OnboardRssArticleResult {
  type: 'onboard_rss_article';
  configVersion: number;
  articlesScanned: number;
}
export interface AdsCampaignResult {
  type: 'ads_campaign';
  sentCount: number;
  failedCount: number;
}

/** Дискриминированный union всех результатов джобов */
export type JobResult =
  | RefreshChannelMetadataResult
  | PublishToChannelResult
  | FetchRssResult
  | FetchRssHybridResult
  | FetchTelegramResult
  | FetchWebsiteResult
  | OnboardWebsiteResult
  | OnboardRssArticleResult
  | AdsCampaignResult;

// ── Вспомогательные: map type → params/result для generic-кода ────────

export interface JobParamsMap {
  refresh_channel_metadata: RefreshChannelMetadataParams;
  publish_to_channel: PublishToChannelParams;
  fetch_rss:          FetchRssParams;
  fetch_rss_hybrid:   FetchRssHybridParams;
  fetch_telegram:     FetchTelegramParams;
  fetch_website:      FetchWebsiteParams;
  onboard_website:    OnboardWebsiteParams;
  onboard_rss_article: OnboardRssArticleParams;
  ads_campaign:       AdsCampaignParams;
}

export interface JobResultMap {
  refresh_channel_metadata: RefreshChannelMetadataResult;
  publish_to_channel:  PublishToChannelResult;
  fetch_rss:           FetchRssResult;
  fetch_rss_hybrid:    FetchRssHybridResult;
  fetch_telegram:      FetchTelegramResult;
  fetch_website:       FetchWebsiteResult;
  onboard_website:     OnboardWebsiteResult;
  onboard_rss_article: OnboardRssArticleResult;
  ads_campaign:        AdsCampaignResult;
}

// ── Типизированный Job ────────────────────────────────────────────────

/**
 * TypedJob<T> — строго-типизированный джоб с params/result по discriminant.
 * Используй `AnyJob` для хранения в списках.
 */
export interface TypedJob<T extends JobType = JobType> {
  id: string;
  teamId: string;
  type: T;
  status: JobStatus;
  progress: number;
  params: JobParamsMap[T];
  result?: JobResultMap[T];
  error?: string;
  logs: string[];
  createdAt: string;
  completedAt?: string;
  llmTraceIds: string[];
}

/** Нетипизированный union — используй в компонентах где тип неизвестен */
export type AnyJob = { [T in JobType]: TypedJob<T> }[JobType];

// ── Type guards ────────────────────────────────────────────────────────

export function isJobType<T extends JobType>(
  job: AnyJob,
  type: T,
): job is TypedJob<T> {
  return job.type === type;
}

/** Сужает params до конкретного типа. Возвращает null, если несовпадение. */
export function getJobParams<T extends JobType>(
  job: AnyJob,
  type: T,
): JobParamsMap[T] | null {
  return job.type === type ? (job.params as JobParamsMap[T]) : null;
}

/** Сужает result до конкретного типа. Возвращает null, если несовпадение. */
export function getJobResult<T extends JobType>(
  job: AnyJob,
  type: T,
): JobResultMap[T] | null {
  if (job.type !== type || !job.result) return null;
  return job.result as JobResultMap[T];
}

// ── LLMTrace — строгий тип (toolCalls убран из any) ───────────────────

export interface LLMToolCall {
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

export interface LLMTraceDTO {
  id: string;
  jobId?: string;
  teamId: string;
  operation: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  latencyMs: number;
  prompt: string;
  response: string;
  toolCalls?: LLMToolCall[];
  rawRequest: Record<string, unknown>;
  rawResponse: Record<string, unknown>;
  createdAt: string;
}

// ── Общий ServiceResult — возврат из сервисного слоя ─────────────────

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string; meta?: Record<string, unknown> | null };

export function ok<T>(data: T): ServiceResult<T> {
  return { ok: true, data };
}

export function err<T = never>(
  error: string,
  code?: string,
  meta?: Record<string, unknown> | null,
): ServiceResult<T> {
  return { ok: false, error, code, meta };
}

// ── Утилиты для работы с params/result без type guards ────────────────

/** Безопасно читает sourceId из любых params джоба */
export function getSourceIdFromJob(job: AnyJob): string | undefined {
  const p = job.params as Partial<{ sourceId: string }>;
  return p.sourceId;
}

/** Безопасно читает channelId из params джоба */
export function getChannelIdFromJob(job: AnyJob): string | undefined {
  const p = job.params as Partial<{ channelId: string }>;
  return p.channelId;
}

/** Безопасно читает newItemsCount из результата скан-джобов */
export function getNewItemsCount(job: AnyJob): number | undefined {
  if (!job.result) return undefined;
  const r = job.result as Partial<{ newItemsCount: number }>;
  return r.newItemsCount;
}
