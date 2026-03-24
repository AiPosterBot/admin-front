import { apiGet } from '../lib/api'
import type { Channel, Item, Job, PostedItem, Source, TelegramContentFormat } from '../types/domain'
import type { LLMTraceDTO } from '../types/dto'
import { getItemById, getTeamItems } from './itemService'
import { getSourceByIdSync, primeTeamSources } from './sourceService'
import { getChannelById, getTeamChannels } from './channelService'

interface PaginatedResponse<T> {
  data: T[]
  page: number
  limit: number
  total: number
  hasNext: boolean
}

interface PostListRecord {
  id: string
  teamId: string
  channelId: string
  channelName?: string
  itemId: string
  itemTitle?: string
  sourceId: string
  sourceName?: string
  jobId?: string | null
  generatedContent: string
  generatedContentFormat?: TelegramContentFormat | null
  postedAt: string
  status: PostedItem['status'] | 'queued' | 'publishing' | 'canceled'
  llmTraceId?: string | null
  telegramMessageId?: number | null
  views?: number | null
  reactions?: number | null
  mediaUrl?: string | null
  hasMedia?: boolean
  mediaKind?: PostedItem['mediaKind']
  mediaPreviewAvailable?: boolean
  mediaPreviewRestrictedReason?: string | null
  errorText?: string | null
}

interface PostDetailResponse {
  post: {
    id: string
    teamId: string
    channelId: string
    itemId: string
    sourceId: string
    jobId?: string | null
    generatedContent: string
    generatedContentFormat?: TelegramContentFormat | null
    status: PostListRecord['status']
    postedAt: string
    llmTraceId?: string | null
    telegramMessageId?: number | null
    views?: number | null
    reactions?: number | null
    mediaUrl?: string | null
    hasMedia?: boolean
    mediaKind?: PostedItem['mediaKind']
    mediaPreviewAvailable?: boolean
    mediaPreviewRestrictedReason?: string | null
    errorText?: string | null
  }
  channel: {
    id: string
    name: string
    telegramTarget?: string | null
    telegramChatId?: string | null
    telegramUsername?: string | null
  } | null
  source: {
    id: string
    name: string
    type: Source['type']
    url?: string | null
  } | null
  item: {
    id: string
    title: string
    url?: string | null
    mediaUrl?: string | null
    hasMedia?: boolean
    mediaKind?: Item['mediaKind']
    mediaPreviewAvailable?: boolean
    mediaPreviewRestrictedReason?: string | null
  } | null
  job: {
    id: string
    type: Job['type']
    status: Job['status'] | 'canceled' | 'timed_out'
    errorText?: string | null
    createdAt: string
    completedAt?: string | null
  } | null
  llmTrace: {
    id: string
    operation: string
    model: string
    totalTokens?: number | null
    costUsd?: number | null
  } | null
}

interface PostDetailRecord {
  post: PostedItem
  channel: Channel | null
  item: Pick<Item, 'id' | 'title' | 'url' | 'mediaUrl'> | null
  source: { id: string; name: string; type: Source['type']; url?: string | null } | null
  job: (Job & { errorText?: string }) | null
  llmTrace: LLMTraceDTO | null
}

export interface ListTeamPostsOptions {
  page?: number
  limit?: number
  channelId?: string
  sourceId?: string
  status?: 'success' | 'failed'
  channelTagIds?: string[]
  sourceTagIds?: string[]
  q?: string
  from?: string
  to?: string
}

export interface TeamPostsListResult {
  data: PostedItem[]
  page: number
  limit: number
  total: number
  hasNext: boolean
  facets?: {
    statusCounts: Record<'all' | 'success' | 'failed', number>
  }
}

const teamPostsCache = new Map<string, PostedItem[]>()
const postByIdCache = new Map<string, PostedItem>()
const postDetailCache = new Map<string, PostDetailRecord>()
const postChannelCache = new Map<string, Channel | null>()
const postItemCache = new Map<string, Pick<Item, 'id' | 'title' | 'url' | 'mediaUrl'> | null>()
const postSourceCache = new Map<string, { id: string; name: string; type: Source['type']; url?: string | null } | null>()
const postJobCache = new Map<string, (Job & { errorText?: string }) | null>()
const postTraceCache = new Map<string, LLMTraceDTO | null>()

function normalizePostStatus(status: PostListRecord['status']): PostedItem['status'] {
  return status === 'success' ? 'success' : 'failed'
}

function getJobProgress(status: Job['status']) {
  if (status === 'success') {
    return 100
  }

  if (status === 'failed' || status === 'canceled' || status === 'timed_out') {
    return 0
  }

  return 50
}

function mapPost(record: PostListRecord): PostedItem {
  return {
    id: record.id,
    teamId: record.teamId,
    channelId: record.channelId,
    channelName: record.channelName ?? 'Канал',
    itemId: record.itemId,
    itemTitle: record.itemTitle ?? 'Материал',
    sourceId: record.sourceId,
    sourceName: record.sourceName ?? getSourceByIdSync(record.sourceId)?.name ?? 'Источник',
    jobId: record.jobId ?? '',
    generatedContent: record.generatedContent,
    generatedContentFormat: record.generatedContentFormat ?? 'plain',
    postedAt: record.postedAt,
    status: normalizePostStatus(record.status),
    llmTraceId: record.llmTraceId ?? undefined,
    telegramMessageId: record.telegramMessageId ?? undefined,
    views: record.views ?? undefined,
    reactions: record.reactions ?? undefined,
    mediaUrl: record.mediaUrl ?? undefined,
    hasMedia: record.hasMedia ?? Boolean(record.mediaUrl),
    mediaKind: record.mediaKind ?? null,
    mediaPreviewAvailable: record.mediaPreviewAvailable ?? Boolean(record.mediaUrl),
    mediaPreviewRestrictedReason: record.mediaPreviewRestrictedReason ?? null,
    errorText: record.errorText ?? undefined,
  }
}

function upsertTeamPosts(teamId: string, posts: PostedItem[]) {
  teamPostsCache.set(teamId, posts)
  for (const post of posts) {
    postByIdCache.set(post.id, post)
  }
}

function notePosts(posts: PostedItem[]) {
  for (const post of posts) {
    postByIdCache.set(post.id, post)
  }
}

export async function getTeamPosts(teamId: string): Promise<PostedItem[]> {
  const [response] = await Promise.all([
    apiGet<PaginatedResponse<PostListRecord>>(`/api/posts?page=1&limit=100&teamId=${teamId}`),
    getTeamChannels(teamId),
    primeTeamSources(teamId),
    getTeamItems(teamId),
  ])

  const posts = response.data.map(mapPost)
  upsertTeamPosts(teamId, posts)
  return posts
}

export async function listTeamPosts(teamId: string, options: ListTeamPostsOptions = {}): Promise<TeamPostsListResult> {
  const params = new URLSearchParams({
    teamId,
    page: String(options.page ?? 1),
    limit: String(options.limit ?? 20),
  })

  if (options.channelId) {
    params.set('channelId', options.channelId)
  }
  if (options.sourceId) {
    params.set('sourceId', options.sourceId)
  }
  if (options.status) {
    params.set('status', options.status)
  }
  if (options.channelTagIds && options.channelTagIds.length > 0) {
    params.set('channelTagIds', options.channelTagIds.join(','))
  }
  if (options.sourceTagIds && options.sourceTagIds.length > 0) {
    params.set('sourceTagIds', options.sourceTagIds.join(','))
  }
  if (options.q) {
    params.set('q', options.q)
  }
  if (options.from) {
    params.set('from', options.from)
  }
  if (options.to) {
    params.set('to', options.to)
  }

  const response = await apiGet<PaginatedResponse<PostListRecord> & TeamPostsListResult>(`/api/posts?${params.toString()}`)
  const posts = response.data.map(mapPost)
  notePosts(posts)

  return {
    data: posts,
    page: response.page,
    limit: response.limit,
    total: response.total,
    hasNext: response.hasNext,
    facets: response.facets,
  }
}

export async function getPostById(postId: string, teamId: string): Promise<PostedItem | null> {
  const cached = postByIdCache.get(postId)
  if (cached && cached.teamId === teamId) {
    return cached
  }

  const detail = await getPostDetailById(postId, teamId)
  return detail?.post ?? null
}

export async function getPostDetailById(postId: string, teamId: string): Promise<PostDetailRecord | null> {
  const cached = postDetailCache.get(postId)
  if (cached && cached.post.teamId === teamId) {
    return cached
  }

  const response = await apiGet<PostDetailResponse>(`/api/posts/${postId}`)
  const post = mapPost({
    ...response.post,
    channelName: response.channel?.name,
    itemTitle: response.item?.title,
    sourceName: response.source?.name,
  })

  if (post.teamId !== teamId) {
    return null
  }

  const current = teamPostsCache.get(teamId) ?? []
  const existingIndex = current.findIndex((entry) => entry.id === post.id)
  const next = [...current]
  if (existingIndex >= 0) {
    next[existingIndex] = post
  } else {
    next.unshift(post)
  }
  teamPostsCache.set(teamId, next)
  postByIdCache.set(post.id, post)

  const channel = response.channel
    ? {
        ...(await getChannelById(response.channel.id, teamId) ?? {
          id: response.channel.id,
          teamId,
          name: response.channel.name,
    telegramTarget: response.channel.telegramTarget ?? null,
    telegramChatId: response.channel.telegramChatId ?? undefined,
    telegramUsername: response.channel.telegramUsername ?? undefined,
          isActive: true,
          botCanPost: true,
          publishMode: 'periodic' as const,
          publishIntervalSec: 1800,
          contentStrategy: 'newest' as const,
          linkedSourcesCount: 0,
          subscribersCount: 0,
          createdAt: '',
        }),
      }
    : null

  const item = response.item
    ? {
        id: response.item.id,
        title: response.item.title,
        url: response.item.url ?? undefined,
        mediaUrl: response.item.mediaUrl ?? undefined,
        hasMedia: response.item.hasMedia ?? Boolean(response.item.mediaUrl),
        mediaKind: response.item.mediaKind ?? null,
        mediaPreviewAvailable: response.item.mediaPreviewAvailable ?? Boolean(response.item.mediaUrl),
        mediaPreviewRestrictedReason: response.item.mediaPreviewRestrictedReason ?? null,
      }
    : null

  const source = response.source
    ? {
        id: response.source.id,
        name: response.source.name,
        type: response.source.type,
        url: response.source.url ?? undefined,
      }
    : null

  const job = response.job
    ? {
        id: response.job.id,
        teamId,
        type: response.job.type,
        status: response.job.status,
        progress: getJobProgress(response.job.status),
        params: {},
        result: undefined,
        error: response.job.errorText ?? undefined,
        errorText: response.job.errorText ?? undefined,
        logs: [],
        createdAt: response.job.createdAt,
        completedAt: response.job.completedAt ?? undefined,
        llmTraceIds: response.post.llmTraceId ? [response.post.llmTraceId] : [],
      }
    : null

  const llmTrace = response.llmTrace
    ? {
        id: response.llmTrace.id,
        teamId,
        operation: response.llmTrace.operation,
        model: response.llmTrace.model,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: response.llmTrace.totalTokens ?? 0,
        cost: response.llmTrace.costUsd ?? 0,
        latencyMs: 0,
        prompt: '',
        response: '',
        rawRequest: {},
        rawResponse: {},
        createdAt: response.post.postedAt,
      }
    : null

  postChannelCache.set(post.id, channel)
  postItemCache.set(post.id, item)
  postSourceCache.set(post.id, source)
  postJobCache.set(post.id, job)
  postTraceCache.set(post.id, llmTrace)

  if (item) {
    const cachedItem = await getItemById(item.id, teamId)
    if (!cachedItem) {
      // Ничего не делаем: фронту достаточно локальной карточки item в detail.
    }
  }

  const detail: PostDetailRecord = { post, channel, item, source, job, llmTrace }
  postDetailCache.set(postId, detail)
  return detail
}

export function getPostChannel(post: PostedItem) {
  return postChannelCache.get(post.id) ?? null
}

export function getPostItem(post: PostedItem) {
  return postItemCache.get(post.id) ?? null
}

export function getPostSource(post: PostedItem) {
  return postSourceCache.get(post.id) ?? null
}

export function getPostJob(post: PostedItem) {
  return postJobCache.get(post.id) ?? null
}

export function getPostLLMTrace(post: PostedItem) {
  return postTraceCache.get(post.id) ?? null
}

export function getPostByJobId(jobId: string): PostedItem | null {
  return Array.from(postByIdCache.values()).find((post) => post.jobId === jobId) ?? null
}

export function getTeamPostsList(teamId: string): PostedItem[] {
  return teamPostsCache.get(teamId) ?? []
}

export function getPostsByChannelId(channelId: string): PostedItem[] {
  return Array.from(postByIdCache.values()).filter((post) => post.channelId === channelId)
}

export function getPostsBySourceId(sourceId: string): PostedItem[] {
  return Array.from(postByIdCache.values()).filter((post) => post.sourceId === sourceId)
}

export function getPostsByItemId(itemId: string): PostedItem[] {
  return Array.from(postByIdCache.values()).filter((post) => post.itemId === itemId)
}
