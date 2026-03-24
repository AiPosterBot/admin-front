import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api'
import { getLimitAwareErrorCode, getLimitAwareErrorMessage, getLimitAwareErrorMeta } from '../lib/team-limit-messages'
import type { AgentConfig, Channel, Job, RssArticleOnlyConfig, RssMode, Source, SourceTag } from '../types/domain'
import { err, ok, type ServiceResult } from '../types/dto'

interface PaginatedResponse<T> {
  data: T[]
  page: number
  limit: number
  total: number
  hasNext: boolean
}

interface SourceTagRecord {
  id: string
  teamId: string
  name: string
  color: SourceTag['color']
}

interface SourceRecord {
  id: string
  teamId: string
  name: string
  type: Source['type']
  isActive: boolean
  url: string
  status: Source['status']
  lastError?: string | null
  lastFetchedAt?: string | null
  scanIntervalSec?: number | null
  effectiveScanIntervalSec?: number
  minScanIntervalSec?: number
  maxScanIntervalSec?: number
  itemsCount: number
  itemsCount24h: number
  itemsCountWeek: number
  itemsCountMonth: number
  linkedChannelsCount?: number
  linkedChannelsPreview?: Pick<Channel, 'id' | 'teamId' | 'name' | 'telegramTarget' | 'telegramChatId' | 'telegramUsername' | 'isActive'>[]
  createdAt: string
  updatedAt?: string
  details?: {
    rss?: {
      feedUrl?: string | null
      etag?: string | null
      lastModified?: string | null
      feedTitle?: string | null
      feedDescription?: string | null
      feedLanguage?: string | null
      rssMode?: RssMode
      preferFeedWhenFull?: boolean
      minFeedContentChars?: number
      articleActiveConfigVersion?: number | null
      articleActiveConfigJson?: RssArticleOnlyConfig | null
      articleOnboardingStatus?: Source['rssArticleOnboardingStatus']
      articleLastOnboardJobId?: string | null
      articleLastOnboardedAt?: string | null
      articleLastScanStatsJson?: Source['lastScanStats']
    }
    telegram?: {
      telegramUsername?: string | null
      telegramChatId?: string | null
      lastMessageId?: string | null
      accessStatus?: Source['accessStatus']
    }
    website?: {
      onboardingStatus?: Source['onboardingStatus']
      activeConfigVersion?: number | null
      activeConfigJson?: AgentConfig | null
      lastOnboardJobId?: string | null
      lastOnboardedAt?: string | null
    }
  }
  tags?: SourceTagRecord[]
}

interface SourceDetailResponse {
  source: SourceRecord
  tags: SourceTagRecord[]
  linkedChannels: Pick<Channel, 'id' | 'teamId' | 'name' | 'telegramTarget' | 'telegramChatId' | 'telegramUsername' | 'isActive'>[]
}

interface RssPreviewItem {
  title: string
  content: string
  date: string | null
  imageUrl?: string | null
}

interface RssCheckResponse {
  title: string
  description: string
  language?: string | null
  itemCount: number
  lastItemDate: string | null
  sampleItems: RssPreviewItem[]
}

interface TelegramPreviewItem {
  title: string
  content: string
  date: string
}

interface TelegramCheckResponse {
  title: string
  username: string
  description: string
  lastPostDate: string
  samplePosts: TelegramPreviewItem[]
}

interface WebsitePreviewArticle {
  title: string
  url: string
  content: string
  date: string
  imageUrl?: string | null
  charCount: number
}

interface WebsiteOnboardingPreview {
  title: string
  url: string
  articlesFound: number
  sampleArticles: WebsitePreviewArticle[]
  config: {
    listSelector: string
    articleSelector: string
    titleSelector: string
    contentSelector: string
    dateSelector: string
  }
}

interface WebsiteOnboardingStage {
  id: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
}

interface RssArticleOnboardingPreview {
  sourceId: string
  sourceName: string
  feedUrl: string
  rssMode: RssMode
  sampleItems: RssPreviewItem[]
  sampleArticles: WebsitePreviewArticle[]
}

interface AgentLogRecord {
  id: string
  ts: string
  level: string
  scope: string
  message: string
  meta?: Record<string, unknown> | null
}

interface JobDetailRecord {
  job: {
    id: string
    teamId: string
    type: string
    status: 'pending' | 'running' | 'success' | 'failed' | 'canceled' | 'timed_out'
    attempts?: number
    maxAttempts?: number
    runAt?: string | null
    progress: number
    payload?: Record<string, unknown> | null
    result?: {
      verdict?: 'pass'
      preview?: WebsiteOnboardingPreview | RssArticleOnboardingPreview
      config?: AgentConfig | RssArticleOnlyConfig
      stages?: WebsiteOnboardingStage[]
    } | null
    errorText?: string | null
    createdAt: string
    startedAt?: string | null
    completedAt?: string | null
  }
  diagnostics?: {
    lastError?: {
      ts?: string | null
      message?: string | null
      code?: string | null
      providerStatus?: number | null
      providerMessage?: string | null
      retryAfterSec?: number | null
    } | null
    retry?: {
      willRetry?: boolean
      waitingForRetry?: boolean
      willResume?: boolean
      nextRunAt?: string | null
      delayMs?: number | null
      attempts?: number
      maxAttempts?: number
      phase?: string | null
      iteration?: number | null
      progress?: number | null
    } | null
  } | null
}

interface SourceActionJobResponse {
  jobId: string
}

interface JobLogsResponse {
  data: Array<{
    id: string
    jobId: string
    ts: string
    level: string
    scope: string
    message: string
    meta?: Record<string, unknown> | null
  }>
}

export interface ListTeamSourcesOptions {
  page?: number
  limit?: number
  status?: 'all' | 'ok' | 'error'
  type?: Source['type']
  isActive?: boolean
  tagIds?: string[]
  q?: string
}

export interface TeamSourcesListResult {
  data: Source[]
  page: number
  limit: number
  total: number
  hasNext: boolean
  facets?: {
    statusCounts: Record<'all' | 'active' | 'stopped' | 'error', number>
    typeCounts: Record<'all' | 'rss' | 'website' | 'telegram', number>
  }
}

const WEBSITE_STAGE_ORDER = ['analyze_list', 'open_samples', 'generate_config', 'dry_run', 'verdict'] as const
const RSS_ARTICLE_STAGE_ORDER = ['analyze_list', 'open_samples', 'generate_config', 'dry_run', 'verdict'] as const

const WEBSITE_STAGE_LABELS: Record<(typeof WEBSITE_STAGE_ORDER)[number], string> = {
  analyze_list: 'Р С’Р Р…Р В°Р В»Р С‘Р В· РЎРѓР С—Р С‘РЎРѓР С”Р В° Р СР В°РЎвЂљР ВµРЎР‚Р С‘Р В°Р В»Р С•Р Р†',
  open_samples: 'Р С›РЎвЂљР С”РЎР‚РЎвЂ№РЎвЂљР С‘Р Вµ Р С—РЎР‚Р С‘Р СР ВµРЎР‚Р С•Р Р†',
  generate_config: 'Р вЂњР ВµР Р…Р ВµРЎР‚Р В°РЎвЂ Р С‘РЎРЏ Р С”Р С•Р Р…РЎвЂћР С‘Р С–РЎС“РЎР‚Р В°РЎвЂ Р С‘Р С‘',
  dry_run: 'Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р В° dry-run',
  verdict: 'Р В¤Р С‘Р Р…Р В°Р В»РЎРЉР Р…РЎвЂ№Р в„– Р Р†Р ВµРЎР‚Р Т‘Р С‘Р С”РЎвЂљ',
}

const RSS_ARTICLE_STAGE_LABELS: Record<(typeof RSS_ARTICLE_STAGE_ORDER)[number], string> = {
  analyze_list: 'Р С’Р Р…Р В°Р В»Р С‘Р В· RSS Р С‘ РЎРѓРЎРѓРЎвЂ№Р В»Р С•Р С”',
  open_samples: 'Р С›РЎвЂљР С”РЎР‚РЎвЂ№РЎвЂљР С‘Р Вµ HTML-РЎРѓРЎвЂљР В°РЎвЂљР ВµР в„–',
  generate_config: 'Р вЂњР ВµР Р…Р ВµРЎР‚Р В°РЎвЂ Р С‘РЎРЏ article-Р С”Р С•Р Р…РЎвЂћР С‘Р С–Р В°',
  dry_run: 'Р СћР ВµРЎРѓРЎвЂљР С•Р Р†РЎвЂ№Р в„– Р С—Р В°РЎР‚РЎРѓР С‘Р Р…Р С– РЎРѓРЎвЂљР В°РЎвЂљР ВµР в„–',
  verdict: 'Р В¤Р С‘Р Р…Р В°Р В»РЎРЉР Р…Р В°РЎРЏ Р С—РЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р В°',
}

function deriveWebsiteOnboardingStages(
  logs: AgentLogRecord[],
  status: JobDetailRecord['job']['status'],
  finalStages: WebsiteOnboardingStage[],
) {
  if (finalStages.length > 0) {
    return finalStages
  }

  const currentStageId = logs
    .map((log) => {
      const stage = typeof log.meta?.stage === 'string' ? log.meta.stage : null
      return stage && WEBSITE_STAGE_ORDER.includes(stage as (typeof WEBSITE_STAGE_ORDER)[number]) ? stage : null
    })
    .filter(Boolean)
    .at(-1) as (typeof WEBSITE_STAGE_ORDER)[number] | undefined

  const hasError = status === 'failed' || status === 'timed_out' || status === 'canceled'
  const currentIndex = currentStageId ? WEBSITE_STAGE_ORDER.indexOf(currentStageId) : -1

  return WEBSITE_STAGE_ORDER.map((stageId, index) => {
    let nextStatus: WebsiteOnboardingStage['status'] = 'pending'
    if (index < currentIndex) {
      nextStatus = 'done'
    } else if (index === currentIndex) {
      nextStatus = hasError ? 'error' : status === 'success' ? 'done' : 'running'
    } else if (status === 'success') {
      nextStatus = 'done'
    }

    if (hasError && currentIndex === -1 && index === 0) {
      nextStatus = 'error'
    }

    return {
      id: stageId,
      label: WEBSITE_STAGE_LABELS[stageId],
      status: nextStatus,
    }
  })
}

function deriveRssArticleOnboardingStages(
  logs: AgentLogRecord[],
  status: JobDetailRecord['job']['status'],
  finalStages: WebsiteOnboardingStage[],
) {
  if (finalStages.length > 0) {
    return finalStages
  }

  const currentStageId = logs
    .map((log) => {
      const stage = typeof log.meta?.stage === 'string' ? log.meta.stage : null
      return stage && RSS_ARTICLE_STAGE_ORDER.includes(stage as (typeof RSS_ARTICLE_STAGE_ORDER)[number]) ? stage : null
    })
    .filter(Boolean)
    .at(-1) as (typeof RSS_ARTICLE_STAGE_ORDER)[number] | undefined

  const hasError = status === 'failed' || status === 'timed_out' || status === 'canceled'
  const currentIndex = currentStageId ? RSS_ARTICLE_STAGE_ORDER.indexOf(currentStageId) : -1

  return RSS_ARTICLE_STAGE_ORDER.map((stageId, index) => {
    let nextStatus: WebsiteOnboardingStage['status'] = 'pending'
    if (index < currentIndex) {
      nextStatus = 'done'
    } else if (index === currentIndex) {
      nextStatus = hasError ? 'error' : status === 'success' ? 'done' : 'running'
    } else if (status === 'success') {
      nextStatus = 'done'
    }

    if (hasError && currentIndex === -1 && index === 0) {
      nextStatus = 'error'
    }

    return {
      id: stageId,
      label: RSS_ARTICLE_STAGE_LABELS[stageId],
      status: nextStatus,
    }
  })
}

const teamSourcesCache = new Map<string, Source[]>()
const sourceByIdCache = new Map<string, Source>()
const teamSourceTagsCache = new Map<string, SourceTag[]>()
const sourceTagsBySourceCache = new Map<string, SourceTag[]>()
const linkedChannelIdsBySourceCache = new Map<string, string[]>()
const channelSnapshotById = new Map<string, Channel>()

function mapTag(record: SourceTagRecord): SourceTag {
  return {
    id: record.id,
    teamId: record.teamId,
    name: record.name,
    color: record.color,
  }
}

function mapSource(record: SourceRecord): Source {
  return {
    id: record.id,
    teamId: record.teamId,
    name: record.name,
    type: record.type,
    isActive: record.isActive,
    url: record.url,
    status: record.status,
    lastError: record.lastError ?? undefined,
    lastFetchedAt: record.lastFetchedAt ?? undefined,
    scanIntervalSec: record.scanIntervalSec ?? undefined,
    effectiveScanIntervalSec: record.effectiveScanIntervalSec ?? undefined,
    minScanIntervalSec: record.minScanIntervalSec ?? undefined,
    maxScanIntervalSec: record.maxScanIntervalSec ?? undefined,
    itemsCount: record.itemsCount,
    itemsCount24h: record.itemsCount24h,
    itemsCountWeek: record.itemsCountWeek,
    itemsCountMonth: record.itemsCountMonth,
    linkedChannelsCount: record.linkedChannelsCount ?? undefined,
    linkedChannelsPreview: record.linkedChannelsPreview ?? undefined,
    createdAt: record.createdAt,
    ...(record.details?.rss
      ? {
          rssMode: record.details.rss.rssMode,
          etag: record.details.rss.etag ?? undefined,
          lastModified: record.details.rss.lastModified ?? undefined,
          feedTitle: record.details.rss.feedTitle ?? undefined,
          feedDescription: record.details.rss.feedDescription ?? undefined,
          rssArticleConfig: record.details.rss.articleActiveConfigJson ?? undefined,
          rssArticleOnboardingStatus: record.details.rss.articleOnboardingStatus ?? undefined,
          rssArticleLastOnboardJobId: record.details.rss.articleLastOnboardJobId ?? undefined,
          rssArticleOnboardedAt: record.details.rss.articleLastOnboardedAt ?? undefined,
          lastScanStats: record.details.rss.articleLastScanStatsJson ?? undefined,
        }
      : {}),
    ...(record.details?.telegram
      ? {
          telegramUsername: record.details.telegram.telegramUsername ?? undefined,
          telegramChatId: record.details.telegram.telegramChatId
            ? Number(record.details.telegram.telegramChatId)
            : undefined,
          lastMessageId: record.details.telegram.lastMessageId ? Number(record.details.telegram.lastMessageId) : undefined,
          accessStatus: record.details.telegram.accessStatus ?? undefined,
        }
      : {}),
    ...(record.details?.website
      ? {
          onboardingStatus: record.details.website.onboardingStatus ?? undefined,
          activeConfigVersion: record.details.website.activeConfigVersion ?? undefined,
          activeConfigJson: record.details.website.activeConfigJson ?? undefined,
          lastOnboardJobId: record.details.website.lastOnboardJobId ?? undefined,
          lastOnboardedAt: record.details.website.lastOnboardedAt ?? undefined,
        }
      : {}),
  }
}

function toJob(detail: JobDetailRecord): Job {
  return {
    id: detail.job.id,
    teamId: detail.job.teamId,
    type: detail.job.type as Job['type'],
    status: detail.job.status,
    progress: detail.job.progress,
    params: detail.job.payload ?? {},
    result: (detail.job.result as Record<string, unknown> | undefined) ?? undefined,
    error: detail.job.errorText ?? undefined,
    logs: [],
    createdAt: detail.job.createdAt,
    completedAt: detail.job.completedAt ?? undefined,
    llmTraceIds: [],
  }
}

async function getJob(jobId: string) {
  const detail = await apiGet<JobDetailRecord>(`/api/jobs/${jobId}`)
  return toJob(detail)
}

function primeSourceCaches(teamId: string, records: SourceRecord[], options: { replaceTeamCache?: boolean } = {}) {
  const mappedSources = records.map(mapSource)
  const currentTeamSources = options.replaceTeamCache === false ? teamSourcesCache.get(teamId) ?? [] : []
  const nextTeamSources = [...currentTeamSources]

  for (const source of mappedSources) {
    const existingIndex = nextTeamSources.findIndex((item) => item.id === source.id)
    if (existingIndex >= 0) {
      nextTeamSources[existingIndex] = source
    } else {
      nextTeamSources.push(source)
    }
  }

  teamSourcesCache.set(teamId, nextTeamSources)

  for (const source of mappedSources) {
    sourceByIdCache.set(source.id, source)
  }

  const teamTags = new Map<string, SourceTag>((teamSourceTagsCache.get(teamId) ?? []).map((tag) => [tag.id, tag]))
  for (const record of records) {
    const tags = (record.tags ?? []).map(mapTag)
    sourceTagsBySourceCache.set(record.id, tags)

    for (const tag of tags) {
      teamTags.set(tag.id, tag)
    }
  }

  if (teamTags.size > 0 || !teamSourceTagsCache.has(teamId)) {
    teamSourceTagsCache.set(teamId, Array.from(teamTags.values()))
  }
}

function upsertSource(teamId: string, source: Source) {
  const current = teamSourcesCache.get(teamId) ?? []
  const index = current.findIndex((item) => item.id === source.id)
  const next = [...current]

  if (index >= 0) {
    next[index] = source
  } else {
    next.unshift(source)
  }

  teamSourcesCache.set(teamId, next)
  sourceByIdCache.set(source.id, source)
}

function readCachedTeamSources(teamId: string) {
  return teamSourcesCache.get(teamId) ?? []
}

export async function primeTeamSources(teamId: string): Promise<Source[]> {
  const response = await apiGet<PaginatedResponse<SourceRecord>>(`/api/teams/${teamId}/sources?page=1&limit=100`)
  primeSourceCaches(teamId, response.data)
  return teamSourcesCache.get(teamId) ?? []
}

export async function listTeamSources(teamId: string, options: ListTeamSourcesOptions = {}): Promise<TeamSourcesListResult> {
  const params = new URLSearchParams({
    page: String(options.page ?? 1),
    limit: String(options.limit ?? 20),
  })

  if (options.status) {
    params.set('status', options.status)
  }
  if (options.type) {
    params.set('type', options.type)
  }
  if (options.isActive !== undefined) {
    params.set('isActive', String(options.isActive))
  }
  if (options.tagIds && options.tagIds.length > 0) {
    params.set('tagIds', options.tagIds.join(','))
  }
  if (options.q) {
    params.set('q', options.q)
  }

  const response = await apiGet<PaginatedResponse<SourceRecord> & TeamSourcesListResult>(`/api/teams/${teamId}/sources?${params.toString()}`)
  primeSourceCaches(teamId, response.data, { replaceTeamCache: false })

  return {
    data: response.data.map(mapSource),
    page: response.page,
    limit: response.limit,
    total: response.total,
    hasNext: response.hasNext,
    facets: response.facets,
  }
}

export async function primeTeamSourceTags(teamId: string): Promise<SourceTag[]> {
  const response = await apiGet<PaginatedResponse<SourceTagRecord>>(`/api/teams/${teamId}/tags/sources?page=1&limit=100`)
  const tags = response.data.map(mapTag)
  teamSourceTagsCache.set(teamId, tags)
  return tags
}

export async function getTeamSources(teamId: string): Promise<Source[]> {
  return primeTeamSources(teamId)
}

export function getTeamSourcesList(teamId: string): Source[] {
  return readCachedTeamSources(teamId)
}

export function getSourceByIdSync(sourceId: string): Source | undefined {
  return sourceByIdCache.get(sourceId)
}

export async function getSourceById(sourceId: string, teamId: string, options: { fresh?: boolean } = {}): Promise<Source | null> {
  const cachedSource = sourceByIdCache.get(sourceId)
  if (!options.fresh && cachedSource && cachedSource.teamId === teamId) {
    return cachedSource
  }

  const [detail] = await Promise.all([
    apiGet<SourceDetailResponse>(`/api/sources/${sourceId}`),
    primeTeamSourceTags(teamId),
  ])
  const source = mapSource(detail.source)

  if (source.teamId !== teamId) {
    return null
  }

  upsertSource(teamId, source)
  sourceTagsBySourceCache.set(sourceId, detail.tags.map(mapTag))
  linkedChannelIdsBySourceCache.set(
    sourceId,
    detail.linkedChannels.map((channel) => channel.id),
  )

  for (const channel of detail.linkedChannels) {
    channelSnapshotById.set(channel.id, {
      id: channel.id,
      teamId: channel.teamId,
      name: channel.name,
        telegramTarget: channel.telegramTarget,
        telegramChatId: channel.telegramChatId ?? undefined,
        telegramUsername: channel.telegramUsername ?? undefined,
      isActive: channel.isActive,
      botCanPost: true,
      publishMode: 'periodic',
      publishIntervalSec: 1800,
      contentStrategy: 'newest',
      linkedSourcesCount: 0,
      subscribersCount: 0,
      createdAt: '',
    })
  }

  return source
}

export function getSourceTagsById(sourceId: string): SourceTag[] {
  return sourceTagsBySourceCache.get(sourceId) ?? []
}

export function getTeamSourceTags(teamId: string): SourceTag[] {
  return teamSourceTagsCache.get(teamId) ?? []
}

export function noteChannelSnapshot(channel: Channel) {
  channelSnapshotById.set(channel.id, channel)
}

export function noteChannelDeleted(channelId: string) {
  channelSnapshotById.delete(channelId)

  for (const [sourceId, channelIds] of linkedChannelIdsBySourceCache.entries()) {
    linkedChannelIdsBySourceCache.set(
      sourceId,
      channelIds.filter((id) => id !== channelId),
    )
  }
}

export function noteChannelLinkedToSource(channelId: string, sourceId: string) {
  const current = linkedChannelIdsBySourceCache.get(sourceId) ?? []
  if (!current.includes(channelId)) {
    linkedChannelIdsBySourceCache.set(sourceId, [...current, channelId])
  }
}

export function noteChannelUnlinkedFromSource(channelId: string, sourceId: string) {
  linkedChannelIdsBySourceCache.set(
    sourceId,
    (linkedChannelIdsBySourceCache.get(sourceId) ?? []).filter((id) => id !== channelId),
  )
}

export function getChannelCountForSource(sourceId: string): number {
  return linkedChannelIdsBySourceCache.get(sourceId)?.length ?? 0
}

export function getChannelsForSource(sourceId: string, teamId: string): Channel[] {
  const channelIds = linkedChannelIdsBySourceCache.get(sourceId) ?? []
  return channelIds
    .map((channelId) => channelSnapshotById.get(channelId))
    .filter((channel): channel is Channel => Boolean(channel) && channel.teamId === teamId)
}

export async function checkRssSource(teamId: string, url: string): Promise<RssCheckResponse> {
  return apiPost<RssCheckResponse>(`/api/teams/${teamId}/sources/rss/check`, { url })
}

export async function checkTelegramSource(teamId: string, url: string): Promise<TelegramCheckResponse> {
  return apiPost<TelegramCheckResponse>(`/api/teams/${teamId}/sources/telegram/check`, { url })
}

export async function checkTelegramSourceAccess(sourceId: string, teamId: string): Promise<ServiceResult<Source['accessStatus']>> {
  const source = getSourceByIdSync(sourceId)
  if (!source || source.teamId !== teamId) {
    return err('Р ВРЎРѓРЎвЂљР С•РЎвЂЎР Р…Р С‘Р С” Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…')
  }

  try {
    const response = await apiPost<{ accessStatus: Source['accessStatus']; source: SourceRecord }>(`/api/sources/${sourceId}/telegram/check-access`)
    const nextSource = mapSource(response.source)
    upsertSource(teamId, nextSource)
    return ok(response.accessStatus)
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р С—РЎР‚Р С•Р Р†Р ВµРЎР‚Р С‘РЎвЂљРЎРЉ Р Т‘Р С•РЎРѓРЎвЂљРЎС“Р С— telegram-Р С‘РЎРѓРЎвЂљР С•РЎвЂЎР Р…Р С‘Р С”Р В°')
  }
}

function generateIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `idemp_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export async function startWebsiteOnboarding(teamId: string, input: { name: string; url: string }): Promise<ServiceResult<{ jobId: string }>> {
  try {
    const response = await apiPost<{ jobId: string }>(
      `/api/teams/${teamId}/sources/website/onboard`,
      input,
      {
        headers: {
          'Idempotency-Key': generateIdempotencyKey(),
        },
      },
    )
    return ok(response)
  } catch (error) {
    return err(
      getLimitAwareErrorMessage(error, 'Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р В·Р В°Р С—РЎС“РЎРѓРЎвЂљР С‘РЎвЂљРЎРЉ onboarding РЎРѓР В°Р в„–РЎвЂљР В°'),
      getLimitAwareErrorCode(error),
      getLimitAwareErrorMeta(error),
    )
  }
}

export async function getWebsiteOnboardingJob(jobId: string) {
  const [detail, logs] = await Promise.all([
    apiGet<JobDetailRecord>(`/api/jobs/${jobId}`),
    apiGet<JobLogsResponse>(`/api/jobs/${jobId}/logs?page=1&limit=100`),
  ])

  const logEntries = logs.data.map((log) => ({
    id: String(log.id),
    ts: log.ts,
    level: log.level,
    scope: log.scope,
    message: log.message,
    meta: log.meta ?? null,
  }))

  return {
    jobId,
    status: detail.job.status,
    attempts: detail.job.attempts ?? 0,
    maxAttempts: detail.job.maxAttempts ?? 0,
    runAt: detail.job.runAt ?? null,
    progress: detail.job.progress,
    errorText: detail.job.errorText ?? null,
    diagnostics: detail.diagnostics ?? null,
    retry: detail.diagnostics?.retry ?? null,
    preview: detail.job.result?.preview ?? null,
    config: detail.job.result?.config ?? null,
    stages: detail.job.result?.stages ?? [],
    liveStages: deriveWebsiteOnboardingStages(logEntries, detail.job.status, detail.job.result?.stages ?? []),
    logs: logs.data.map((log) => `[${log.level}] ${log.message}`),
    logEntries,
  }
}

export async function startRssArticleOnboarding(
  teamId: string,
  input: { name: string; url: string; rssMinFeedContentChars?: number },
): Promise<ServiceResult<{ jobId: string }>> {
  try {
    const response = await apiPost<{ jobId: string }>(
      `/api/teams/${teamId}/sources/rss/article/onboard`,
      input,
      {
        headers: {
          'Idempotency-Key': generateIdempotencyKey(),
        },
      },
    )
    return ok(response)
  } catch (error) {
    return err(
      getLimitAwareErrorMessage(error, 'Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р В·Р В°Р С—РЎС“РЎРѓРЎвЂљР С‘РЎвЂљРЎРЉ article-onboarding'),
      getLimitAwareErrorCode(error),
      getLimitAwareErrorMeta(error),
    )
  }
}

export const getSourceAgentJob = getWebsiteOnboardingJob

export async function getRssArticleOnboardingJob(jobId: string) {
  const [detail, logs] = await Promise.all([
    apiGet<JobDetailRecord>(`/api/jobs/${jobId}`),
    apiGet<JobLogsResponse>(`/api/jobs/${jobId}/logs?page=1&limit=100`),
  ])

  const logEntries = logs.data.map((log) => ({
    id: String(log.id),
    ts: log.ts,
    level: log.level,
    scope: log.scope,
    message: log.message,
    meta: log.meta ?? null,
  }))

  return {
    jobId,
    status: detail.job.status,
    attempts: detail.job.attempts ?? 0,
    maxAttempts: detail.job.maxAttempts ?? 0,
    runAt: detail.job.runAt ?? null,
    progress: detail.job.progress,
    errorText: detail.job.errorText ?? null,
    diagnostics: detail.diagnostics ?? null,
    retry: detail.diagnostics?.retry ?? null,
    preview: (detail.job.result?.preview as RssArticleOnboardingPreview | null) ?? null,
    config: (detail.job.result?.config as RssArticleOnlyConfig | null) ?? null,
    stages: detail.job.result?.stages ?? [],
    liveStages: deriveRssArticleOnboardingStages(logEntries, detail.job.status, detail.job.result?.stages ?? []),
    logs: logs.data.map((log) => `[${log.level}] ${log.message}`),
    logEntries,
  }
}

export async function applyWebsiteOnboarding(teamId: string, input: { jobId: string; name: string }): Promise<ServiceResult<{ source: Source; appliedConfigVersion: number }>> {
  try {
    const response = await apiPost<{ source: SourceRecord; appliedConfigVersion: number }>(
      `/api/teams/${teamId}/sources/website/onboard/apply`,
      input,
      {
        headers: {
          'Idempotency-Key': generateIdempotencyKey(),
        },
      },
    )

    const source = mapSource(response.source)
    upsertSource(teamId, source)

    return ok({
      source,
      appliedConfigVersion: response.appliedConfigVersion,
    })
  } catch (error) {
    return err(
      getLimitAwareErrorMessage(error, 'Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р С—РЎР‚Р С‘Р СР ВµР Р…Р С‘РЎвЂљРЎРЉ onboarding Р Т‘Р В»РЎРЏ website-Р С‘РЎРѓРЎвЂљР С•РЎвЂЎР Р…Р С‘Р С”Р В°'),
      getLimitAwareErrorCode(error),
      getLimitAwareErrorMeta(error),
    )
  }
}

export async function createSourceTag(teamId: string, name: string, color: SourceTag['color']) {
  const response = await apiPost<{ tag: SourceTagRecord }>(`/api/teams/${teamId}/tags/sources`, { name, color })
  const tag = mapTag(response.tag)
  const current = teamSourceTagsCache.get(teamId) ?? []
  teamSourceTagsCache.set(teamId, [...current, tag])
  return tag
}

export async function updateSourceTag(teamId: string, tagId: string, input: { name?: string; color?: SourceTag['color'] }) {
  const response = await apiPatch<{ tag: SourceTagRecord }>(`/api/teams/${teamId}/tags/sources/${tagId}`, input)
  const updatedTag = mapTag(response.tag)

  teamSourceTagsCache.set(
    teamId,
    (teamSourceTagsCache.get(teamId) ?? []).map((tag) => (tag.id === tagId ? updatedTag : tag)),
  )

  for (const [sourceId, tags] of sourceTagsBySourceCache.entries()) {
    sourceTagsBySourceCache.set(
      sourceId,
      tags.map((tag) => (tag.id === tagId ? updatedTag : tag)),
    )
  }

  return updatedTag
}

export async function deleteSourceTag(teamId: string, tagId: string) {
  await apiDelete(`/api/teams/${teamId}/tags/sources/${tagId}`)
  teamSourceTagsCache.set(
    teamId,
    (teamSourceTagsCache.get(teamId) ?? []).filter((tag) => tag.id !== tagId),
  )

  for (const [sourceId, tags] of sourceTagsBySourceCache.entries()) {
    sourceTagsBySourceCache.set(
      sourceId,
      tags.filter((tag) => tag.id !== tagId),
    )
  }
}

export async function assignSourceTag(sourceId: string, tagId: string) {
  await apiPost(`/api/sources/${sourceId}/tags/${tagId}`)
  const source = sourceByIdCache.get(sourceId)
  if (!source) {
    return
  }

  const teamTags = teamSourceTagsCache.get(source.teamId) ?? []
  const tag = teamTags.find((item) => item.id === tagId)
  if (!tag) {
    return
  }

  const current = sourceTagsBySourceCache.get(sourceId) ?? []
  if (!current.some((item) => item.id === tagId)) {
    sourceTagsBySourceCache.set(sourceId, [...current, tag])
  }
}

export async function removeSourceTagLink(sourceId: string, tagId: string) {
  await apiDelete(`/api/sources/${sourceId}/tags/${tagId}`)
  sourceTagsBySourceCache.set(
    sourceId,
    (sourceTagsBySourceCache.get(sourceId) ?? []).filter((tag) => tag.id !== tagId),
  )
}

export async function pauseSource(sourceId: string, teamId: string): Promise<ServiceResult<Source>> {
  try {
    const response = await apiPatch<{ source: SourceRecord }>(`/api/sources/${sourceId}/active`, { isActive: false })
    const source = mapSource(response.source)
    upsertSource(teamId, source)
    return ok(source)
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р С•РЎРѓРЎвЂљР В°Р Р…Р С•Р Р†Р С‘РЎвЂљРЎРЉ Р С‘РЎРѓРЎвЂљР С•РЎвЂЎР Р…Р С‘Р С”')
  }
}

export async function updateSourceName(sourceId: string, teamId: string, name: string): Promise<ServiceResult<Source>> {
  return updateSourceSettings(sourceId, teamId, { name })
}

export async function updateSourceSettings(
  sourceId: string,
  teamId: string,
  input: { name?: string; scanIntervalSec?: number | null },
): Promise<ServiceResult<Source>> {
  try {
    const response = await apiPatch<{ source: SourceRecord }>(`/api/sources/${sourceId}`, input)
    const source = mapSource(response.source)
    upsertSource(teamId, source)
    return ok(source)
  } catch (error) {
    return err(error instanceof Error ? error.message : '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0430')
  }
}

export async function resumeSource(sourceId: string, teamId: string): Promise<ServiceResult<Source>> {
  try {
    const response = await apiPatch<{ source: SourceRecord }>(`/api/sources/${sourceId}/active`, { isActive: true })
    const source = mapSource(response.source)
    upsertSource(teamId, source)
    return ok(source)
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р Р†Р С”Р В»РЎР‹РЎвЂЎР С‘РЎвЂљРЎРЉ Р С‘РЎРѓРЎвЂљР С•РЎвЂЎР Р…Р С‘Р С”')
  }
}

export async function deleteSource(sourceId: string, teamId: string): Promise<ServiceResult<void>> {
  try {
    await apiDelete(`/api/sources/${sourceId}`)
    teamSourcesCache.set(
      teamId,
      readCachedTeamSources(teamId).filter((item) => item.id !== sourceId),
    )
    sourceByIdCache.delete(sourceId)
    sourceTagsBySourceCache.delete(sourceId)
    linkedChannelIdsBySourceCache.delete(sourceId)
    return ok(undefined)
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ РЎС“Р Т‘Р В°Р В»Р С‘РЎвЂљРЎРЉ Р С‘РЎРѓРЎвЂљР С•РЎвЂЎР Р…Р С‘Р С”')
  }
}

export async function scanSourceNow(sourceId: string, teamId: string): Promise<ServiceResult<Job>> {
  const source = getSourceByIdSync(sourceId)
  if (!source || source.teamId !== teamId) {
    return err('Р ВРЎРѓРЎвЂљР С•РЎвЂЎР Р…Р С‘Р С” Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…')
  }

  try {
    const response = await apiPost<SourceActionJobResponse>(`/api/sources/${sourceId}/scan-now`, undefined, {
      headers: {
        'Idempotency-Key': generateIdempotencyKey(),
      },
    })
    return ok(await getJob(response.jobId))
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р В·Р В°Р С—РЎС“РЎРѓРЎвЂљР С‘РЎвЂљРЎРЉ РЎРѓР С”Р В°Р Р…Р С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘Р Вµ Р С‘РЎРѓРЎвЂљР С•РЎвЂЎР Р…Р С‘Р С”Р В°')
  }
}

export async function reonboardSource(sourceId: string, teamId: string): Promise<ServiceResult<Job>> {
  const source = getSourceByIdSync(sourceId)
  if (!source || source.teamId !== teamId) {
    return err('Р ВРЎРѓРЎвЂљР С•РЎвЂЎР Р…Р С‘Р С” Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…')
  }

  try {
    const response = await apiPost<SourceActionJobResponse>(`/api/sources/${sourceId}/website/reonboard`, undefined, {
      headers: {
        'Idempotency-Key': generateIdempotencyKey(),
      },
    })
    return ok(await getJob(response.jobId))
  } catch (error) {
    return err(
      getLimitAwareErrorMessage(error, 'Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р В·Р В°Р С—РЎС“РЎРѓРЎвЂљР С‘РЎвЂљРЎРЉ Р С—Р С•Р Р†РЎвЂљР С•РЎР‚Р Р…РЎвЂ№Р в„– onboarding РЎРѓР В°Р в„–РЎвЂљР В°'),
      getLimitAwareErrorCode(error),
      getLimitAwareErrorMeta(error),
    )
  }
}

export async function reonboardRssArticle(sourceId: string, teamId: string): Promise<ServiceResult<Job>> {
  const source = getSourceByIdSync(sourceId)
  if (!source || source.teamId !== teamId) {
    return err('Р ВРЎРѓРЎвЂљР С•РЎвЂЎР Р…Р С‘Р С” Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…')
  }

  try {
    const response = await apiPost<SourceActionJobResponse>(`/api/sources/${sourceId}/rss/reonboard-article`, undefined, {
      headers: {
        'Idempotency-Key': generateIdempotencyKey(),
      },
    })
    return ok(await getJob(response.jobId))
  } catch (error) {
    return err(
      getLimitAwareErrorMessage(error, 'Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р В·Р В°Р С—РЎС“РЎРѓРЎвЂљР С‘РЎвЂљРЎРЉ Р С—Р С•Р Р†РЎвЂљР С•РЎР‚Р Р…РЎвЂ№Р в„– onboarding RSS-РЎРѓРЎвЂљР В°РЎвЂљРЎРЉР С‘'),
      getLimitAwareErrorCode(error),
      getLimitAwareErrorMeta(error),
    )
  }
}

export async function applySourceConfig(sourceId: string, teamId: string, jobId: string, config: AgentConfig): Promise<ServiceResult<void>> {
  const source = getSourceByIdSync(sourceId)
  if (!source || source.teamId !== teamId) {
    return err('Р ВРЎРѓРЎвЂљР С•РЎвЂЎР Р…Р С‘Р С” Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…')
  }

  try {
    await apiPost(
      `/api/sources/${sourceId}/website/reonboard/apply`,
      { jobId },
      {
        headers: {
          'Idempotency-Key': generateIdempotencyKey(),
        },
      },
    )

    upsertSource(teamId, {
      ...source,
      activeConfigJson: config,
      activeConfigVersion: (source.activeConfigVersion ?? 0) + 1,
      onboardingStatus: 'done',
      lastOnboardJobId: jobId,
      lastOnboardedAt: new Date().toISOString(),
    })

    return ok(undefined)
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р С—РЎР‚Р С‘Р СР ВµР Р…Р С‘РЎвЂљРЎРЉ Р С”Р С•Р Р…РЎвЂћР С‘Р С– РЎРѓР В°Р в„–РЎвЂљР В°')
  }
}

export async function applySourceRssConfig(
  sourceId: string,
  teamId: string,
  jobId: string,
  config: RssArticleOnlyConfig,
): Promise<ServiceResult<void>> {
  const source = getSourceByIdSync(sourceId)
  if (!source || source.teamId !== teamId) {
    return err('Р ВРЎРѓРЎвЂљР С•РЎвЂЎР Р…Р С‘Р С” Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…')
  }

  try {
    await apiPost(
      `/api/sources/${sourceId}/rss/reonboard-article/apply`,
      { jobId },
      {
        headers: {
          'Idempotency-Key': generateIdempotencyKey(),
        },
      },
    )

    upsertSource(teamId, {
      ...source,
      rssArticleConfig: config,
      rssArticleOnboardingStatus: 'done',
      rssArticleLastOnboardJobId: jobId,
      rssArticleOnboardedAt: new Date().toISOString(),
    })

    return ok(undefined)
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р С—РЎР‚Р С‘Р СР ВµР Р…Р С‘РЎвЂљРЎРЉ Р С”Р С•Р Р…РЎвЂћР С‘Р С– RSS-РЎРѓРЎвЂљР В°РЎвЂљРЎРЉР С‘')
  }
}

export interface CreateSourceData {
  name: string
  type: 'telegram' | 'rss' | 'website'
  url: string
  rssMode?: RssMode
  rssMinFeedContentChars?: number
  initialConfig?: AgentConfig
}

export async function createSource(teamId: string, data: CreateSourceData): Promise<ServiceResult<Source>> {
  if (!teamId) {
    return err('Р СњР Вµ Р Р†РЎвЂ№Р В±РЎР‚Р В°Р Р…Р В° Р С”Р С•Р СР В°Р Р…Р Т‘Р В°')
  }

  const existingSource = readCachedTeamSources(teamId).find((source) => source.url === data.url)
  if (existingSource) {
    return err(`URL РЎС“Р В¶Р Вµ Р Т‘Р С•Р В±Р В°Р Р†Р В»Р ВµР Р… Р С”Р В°Р С” "${existingSource.name}"`, 'DUPLICATE_URL')
  }

  try {
    if (data.type === 'rss') {
      const response = await apiPost<{ source: SourceRecord }>(`/api/teams/${teamId}/sources/rss`, {
        name: data.name,
        url: data.url,
        rssMode: data.rssMode ?? 'feed_only',
        rssMinFeedContentChars: data.rssMinFeedContentChars,
      })
      const source = mapSource(response.source)
      upsertSource(teamId, source)
      return ok(source)
    }

    if (data.type === 'telegram') {
      const response = await apiPost<{ source: SourceRecord }>(`/api/teams/${teamId}/sources/telegram`, {
        name: data.name,
        url: data.url,
      })
      const source = mapSource(response.source)
      upsertSource(teamId, source)
      return ok(source)
    }
  } catch (error) {
    return err(getLimitAwareErrorMessage(error, 'Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ РЎРѓР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р С‘РЎРѓРЎвЂљР С•РЎвЂЎР Р…Р С‘Р С”'), getLimitAwareErrorCode(error), getLimitAwareErrorMeta(error))
  }

  return err('Website-Р С‘РЎРѓРЎвЂљР С•РЎвЂЎР Р…Р С‘Р С” Р Р…РЎС“Р В¶Р Р…Р С• РЎРѓР С•Р В·Р Т‘Р В°Р Р†Р В°РЎвЂљРЎРЉ РЎвЂЎР ВµРЎР‚Р ВµР В· onboarding Р В°Р С–Р ВµР Р…РЎвЂљР В°')
}

export async function applyRssArticleOnboarding(
  teamId: string,
  input: { jobId: string; name: string },
): Promise<ServiceResult<{ source: Source; appliedConfigVersion: number }>> {
  try {
    const response = await apiPost<{ source: SourceRecord; appliedConfigVersion: number }>(
      `/api/teams/${teamId}/sources/rss/article/onboard/apply`,
      input,
      {
        headers: {
          'Idempotency-Key': generateIdempotencyKey(),
        },
      },
    )

    const source = mapSource(response.source)
    upsertSource(teamId, source)

    return ok({
      source,
      appliedConfigVersion: response.appliedConfigVersion,
    })
  } catch (error) {
    return err(
      getLimitAwareErrorMessage(error, 'Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р С—РЎР‚Р С‘Р СР ВµР Р…Р С‘РЎвЂљРЎРЉ article-Р С”Р С•Р Р…РЎвЂћР С‘Р С– RSS-Р С‘РЎРѓРЎвЂљР С•РЎвЂЎР Р…Р С‘Р С”Р В°'),
      getLimitAwareErrorCode(error),
      getLimitAwareErrorMeta(error),
    )
  }
}

