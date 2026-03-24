import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api'
import { getLimitAwareErrorCode, getLimitAwareErrorMessage, getLimitAwareErrorMeta } from '../lib/team-limit-messages'
import type { Channel, ChannelSchedule, ChannelTag, Source } from '../types/domain'
import { err, ok, type ServiceResult } from '../types/dto'
import {
  getSourceByIdSync,
  noteChannelDeleted,
  noteChannelLinkedToSource,
  noteChannelSnapshot,
  noteChannelUnlinkedFromSource,
  primeTeamSourceTags,
  primeTeamSources,
} from './sourceService'

interface PaginatedResponse<T> {
  data: T[]
  page: number
  limit: number
  total: number
  hasNext: boolean
}

interface ChannelTagRecord {
  id: string
  teamId: string
  name: string
  color: ChannelTag['color']
}

interface ChannelRecord {
  id: string
  teamId: string
  name: string
  telegramTarget: string
  telegramChatId?: string | null
  telegramUsername?: string | null
  isActive: boolean
  botCanPost: boolean
  publishMode: Channel['publishMode']
  publishIntervalSec?: number | null
  scheduleJson?: ChannelSchedule | null
  postStyle?: string | null
  disableMedia: boolean
  contentStrategy: Channel['contentStrategy']
  agentInstructions?: string | null
  skipLlmRewrite: boolean
  linkedSourcesCount: number
  postsToday?: number
  subscribersCount: number
  lastPublishedAt?: string | null
  publishSinceAt?: string | null
  lastError?: string | null
  createdAt: string
  updatedAt?: string
  tags?: ChannelTagRecord[]
}

interface ChannelDetailResponse {
  channel: ChannelRecord
  linkedSources: Source[]
  tags: ChannelTagRecord[]
}

interface TeamChannelCheckResponse {
  botCanPost: boolean
  chatTitle: string
  telegramTarget: string
  telegramChatId: string | null
  telegramUsername: string | null
  subscribersCount: number | null
}

export interface TelegramBotInfo {
  botUsername: string | null
}

export interface QueuedChannelRefreshJob {
  id: string
  type: 'refresh_channel_metadata'
  status: string
  progress: number
  createdAt: string
}

interface ChannelTestingPreviewResponse {
  generatedContent: string
  generatedContentFormat: 'plain' | 'telegram_html'
  mediaUrl?: string | null
  sourceId: string
  item: {
    id: string
    title: string
    url: string
  }
  llm: {
    model: string
    promptTokens?: number | null
    completionTokens?: number | null
    totalTokens?: number | null
    costUsd?: number | null
    latencyMs?: number | null
    traceId?: string | null
  }
}

interface PublishChannelItemResponse {
  job: {
    id: string
    type: 'publish_to_channel'
    status: string
    progress: number
    createdAt: string
  }
  reused: boolean
}

export interface ChannelStats {
  postsToday: number
  postsWeek: number
  postsMonth: number
  postsTotal: number
  publicationsBySource: Array<{
    sourceId: string
    count: number
  }>
}

interface PublishPreviewDraftInput {
  previewGeneratedContent: string
  previewGeneratedContentFormat?: 'plain' | 'telegram_html'
  previewTraceId?: string | null
}

export interface ListTeamChannelsOptions {
  page?: number
  limit?: number
  status?: 'all' | 'active' | 'inactive' | 'error'
  tagIds?: string[]
  q?: string
}

export interface TeamChannelsListResult {
  data: Channel[]
  page: number
  limit: number
  total: number
  hasNext: boolean
  facets?: {
    statusCounts: Record<'all' | 'active' | 'inactive' | 'error', number>
  }
}

const teamChannelsCache = new Map<string, Channel[]>()
const channelByIdCache = new Map<string, Channel>()
const teamChannelTagsCache = new Map<string, ChannelTag[]>()
const channelTagsByChannelCache = new Map<string, ChannelTag[]>()
const linkedSourceIdsByChannelCache = new Map<string, string[]>()
const linkedSourcesByChannelCache = new Map<string, Source[]>()

function mapTag(record: ChannelTagRecord): ChannelTag {
  return {
    id: record.id,
    teamId: record.teamId,
    name: record.name,
    color: record.color,
  }
}

function mapChannel(record: ChannelRecord): Channel {
  return {
    id: record.id,
    teamId: record.teamId,
    name: record.name,
    telegramTarget: record.telegramTarget,
    telegramChatId: record.telegramChatId ?? undefined,
    telegramUsername: record.telegramUsername ?? undefined,
    isActive: record.isActive,
    botCanPost: record.botCanPost,
    publishMode: record.publishMode,
    publishIntervalSec: record.publishIntervalSec ?? undefined,
    scheduleJson: record.scheduleJson ?? undefined,
    postStyle: record.postStyle ?? undefined,
    disableMedia: record.disableMedia,
    contentStrategy: record.contentStrategy,
    agentInstructions: record.agentInstructions ?? undefined,
    skipLlmRewrite: record.skipLlmRewrite,
    linkedSourcesCount: record.linkedSourcesCount,
    postsToday: record.postsToday ?? undefined,
    subscribersCount: record.subscribersCount ?? 0,
    lastPublishedAt: record.lastPublishedAt ?? undefined,
    publishSinceAt: record.publishSinceAt ?? undefined,
    lastError: record.lastError ?? undefined,
    createdAt: record.createdAt,
  }
}

function primeTeamChannels(teamId: string, channels: ChannelRecord[], options: { replaceTeamCache?: boolean } = {}) {
  const mappedChannels = channels.map(mapChannel)
  const currentTeamChannels = options.replaceTeamCache === false ? teamChannelsCache.get(teamId) ?? [] : []
  const nextTeamChannels = [...currentTeamChannels]

  for (const channel of mappedChannels) {
    const existingIndex = nextTeamChannels.findIndex((item) => item.id === channel.id)
    if (existingIndex >= 0) {
      nextTeamChannels[existingIndex] = channel
    } else {
      nextTeamChannels.push(channel)
    }
  }

  teamChannelsCache.set(teamId, nextTeamChannels)

  for (const channel of mappedChannels) {
    channelByIdCache.set(channel.id, channel)
    noteChannelSnapshot(channel)
  }

  const teamTags = new Map<string, ChannelTag>((teamChannelTagsCache.get(teamId) ?? []).map((tag) => [tag.id, tag]))
  for (const record of channels) {
    const tags = (record.tags ?? []).map(mapTag)
    channelTagsByChannelCache.set(record.id, tags)

    for (const tag of tags) {
      teamTags.set(tag.id, tag)
    }
  }

  if (teamTags.size > 0 || !teamChannelTagsCache.has(teamId)) {
    teamChannelTagsCache.set(teamId, Array.from(teamTags.values()))
  }
}

function upsertChannel(teamId: string, channel: Channel) {
  const channels = teamChannelsCache.get(teamId) ?? []
  const index = channels.findIndex((item) => item.id === channel.id)
  const next = [...channels]

  if (index >= 0) {
    next[index] = channel
  } else {
    next.unshift(channel)
  }

  teamChannelsCache.set(teamId, next)
  channelByIdCache.set(channel.id, channel)
  noteChannelSnapshot(channel)
}

async function loadTeamChannelTags(teamId: string) {
  const response = await apiGet<PaginatedResponse<ChannelTagRecord>>(`/api/teams/${teamId}/tags/channels?page=1&limit=100`)
  const tags = response.data.map(mapTag)
  teamChannelTagsCache.set(teamId, tags)
  return tags
}

function updateLinkedSourcesCount(channelId: string, delta: number) {
  const channel = channelByIdCache.get(channelId)
  if (!channel) {
    return
  }

  const nextChannel = {
    ...channel,
    linkedSourcesCount: Math.max(0, channel.linkedSourcesCount + delta),
  }

  channelByIdCache.set(channelId, nextChannel)
  noteChannelSnapshot(nextChannel)

  const teamChannels = teamChannelsCache.get(channel.teamId) ?? []
  teamChannelsCache.set(
    channel.teamId,
    teamChannels.map((item) => (item.id === channelId ? nextChannel : item)),
  )
}

export async function getTeamChannels(teamId: string): Promise<Channel[]> {
  const [response] = await Promise.all([
    apiGet<PaginatedResponse<ChannelRecord>>(`/api/teams/${teamId}/channels?page=1&limit=100`),
    loadTeamChannelTags(teamId),
  ])

  primeTeamChannels(teamId, response.data)
  return teamChannelsCache.get(teamId) ?? []
}

export async function listTeamChannels(teamId: string, options: ListTeamChannelsOptions = {}): Promise<TeamChannelsListResult> {
  const params = new URLSearchParams({
    page: String(options.page ?? 1),
    limit: String(options.limit ?? 20),
  })

  if (options.status) {
    params.set('status', options.status)
  }
  if (options.tagIds && options.tagIds.length > 0) {
    params.set('tagIds', options.tagIds.join(','))
  }
  if (options.q) {
    params.set('q', options.q)
  }

  const [response] = await Promise.all([
    apiGet<PaginatedResponse<ChannelRecord> & TeamChannelsListResult>(`/api/teams/${teamId}/channels?${params.toString()}`),
    loadTeamChannelTags(teamId),
  ])

  primeTeamChannels(teamId, response.data, { replaceTeamCache: false })

  return {
    data: response.data.map(mapChannel),
    page: response.page,
    limit: response.limit,
    total: response.total,
    hasNext: response.hasNext,
    facets: response.facets,
  }
}

export function getTeamChannelsList(teamId: string): Channel[] {
  return teamChannelsCache.get(teamId) ?? []
}

export async function getChannelById(channelId: string, teamId: string): Promise<Channel | null> {
  const [detail] = await Promise.all([
    apiGet<ChannelDetailResponse>(`/api/channels/${channelId}`),
    loadTeamChannelTags(teamId),
    primeTeamSources(teamId),
    primeTeamSourceTags(teamId),
  ])

  const channel = mapChannel(detail.channel)
  upsertChannel(teamId, channel)
  channelTagsByChannelCache.set(channelId, detail.tags.map(mapTag))
  linkedSourceIdsByChannelCache.set(
    channelId,
    detail.linkedSources.map((source) => source.id),
  )
  linkedSourcesByChannelCache.set(channelId, detail.linkedSources)

  for (const source of detail.linkedSources) {
    noteChannelLinkedToSource(channelId, source.id)
  }

  return channel.teamId === teamId ? channel : null
}

export async function getChannelStats(channelId: string): Promise<ChannelStats> {
  return apiGet<ChannelStats>(`/api/channels/${channelId}/stats`)
}

export function getChannelDisplayLabel(channel: Pick<Channel, 'telegramTarget' | 'telegramUsername'>) {
  if (channel.telegramUsername) {
    return `@${channel.telegramUsername}`
  }

  return channel.telegramTarget
}

export function getChannelTechnicalId(channel: Pick<Channel, 'telegramChatId' | 'telegramTarget'>) {
  return channel.telegramChatId ?? channel.telegramTarget
}

export function getChannelPublicUrl(channel: Pick<Channel, 'telegramUsername'>) {
  if (!channel.telegramUsername) {
    return null
  }

  return `https://t.me/${channel.telegramUsername}`
}

export function getChannelPublishModeLabel(publishMode: Channel['publishMode']) {
  switch (publishMode) {
    case 'periodic':
      return '⏱️ Периодически'
    case 'every_material':
      return '📰 Каждый материал'
    case 'scheduled':
    default:
      return '📅 По расписанию'
  }
}

export function formatPublishInterval(seconds?: number | null) {
  if (!seconds || seconds <= 0) {
    return '—'
  }

  const minutes = Math.round(seconds / 60)
  if (minutes % 60 === 0) {
    const hours = minutes / 60
    return hours === 1 ? '1 час' : `${hours} ч`
  }

  return `${minutes} мин`
}

export function getLinkedSourceIds(channelId: string): string[] {
  return linkedSourceIdsByChannelCache.get(channelId) ?? []
}

export function getLinkedSources(channelId: string): Source[] {
  return linkedSourcesByChannelCache.get(channelId) ?? []
}

export function getChannelTagsById(channelId: string): ChannelTag[] {
  return channelTagsByChannelCache.get(channelId) ?? []
}

export function getTeamChannelTags(teamId: string): ChannelTag[] {
  return teamChannelTagsCache.get(teamId) ?? []
}

export async function checkChannelAccess(teamId: string, telegramTarget: string) {
  return apiPost<TeamChannelCheckResponse>(`/api/teams/${teamId}/channels/check`, { telegramTarget })
}

export async function getTelegramBotInfo(teamId: string) {
  return apiGet<TelegramBotInfo>(`/api/teams/${teamId}/channels/bot`)
}

export interface CreateChannelData {
  name: string
  telegramTarget: string
  isActive?: boolean
}

export async function createChannel(teamId: string, data: CreateChannelData): Promise<ServiceResult<Channel>> {
  try {
    const response = await apiPost<{ channel: ChannelRecord }>(`/api/teams/${teamId}/channels`, data)
    const channel = mapChannel(response.channel)
    upsertChannel(teamId, channel)
    channelTagsByChannelCache.set(channel.id, response.channel.tags?.map(mapTag) ?? [])
    linkedSourceIdsByChannelCache.set(channel.id, [])
    return ok(channel)
  } catch (error) {
    return err(getLimitAwareErrorMessage(error, 'Не удалось создать канал'), getLimitAwareErrorCode(error), getLimitAwareErrorMeta(error))
  }
}

export async function deleteChannel(channelId: string, teamId: string): Promise<ServiceResult<void>> {
  try {
    await apiDelete(`/api/channels/${channelId}`)
    teamChannelsCache.set(
      teamId,
      (teamChannelsCache.get(teamId) ?? []).filter((channel) => channel.id !== channelId),
    )
    channelByIdCache.delete(channelId)
    channelTagsByChannelCache.delete(channelId)
    linkedSourceIdsByChannelCache.delete(channelId)
    linkedSourcesByChannelCache.delete(channelId)
    noteChannelDeleted(channelId)
    return ok(undefined)
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Не удалось удалить канал')
  }
}

export async function toggleChannelActive(channelId: string, teamId: string, active: boolean): Promise<ServiceResult<Channel>> {
  try {
    const response = await apiPatch<{ channel: ChannelRecord }>(`/api/channels/${channelId}/active`, { isActive: active })
    const channel = mapChannel(response.channel)
    upsertChannel(teamId, channel)
    return ok(channel)
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Не удалось изменить статус канала')
  }
}

export interface ChannelSettingsData {
  postStyle?: string
  disableMedia?: boolean
  agentInstructions?: string
  skipLlmRewrite?: boolean
  contentStrategy?: 'newest' | 'agent'
  publishMode?: 'periodic' | 'scheduled' | 'every_material'
  publishIntervalSec?: number
  scheduleJson?: ChannelSchedule
}

export async function updateChannelSettings(channelId: string, teamId: string, data: ChannelSettingsData): Promise<ServiceResult<Channel>> {
  try {
    const response = await apiPatch<{ channel: ChannelRecord }>(`/api/channels/${channelId}/settings`, data)
    const channel = mapChannel(response.channel)
    upsertChannel(teamId, channel)
    return ok(channel)
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Не удалось сохранить настройки канала')
  }
}

export async function refreshChannelMetadata(
  channelId: string,
  _teamId: string,
): Promise<ServiceResult<{ job: QueuedChannelRefreshJob; reused: boolean }>> {
  try {
    const response = await apiPost<{ job: QueuedChannelRefreshJob; reused: boolean }>(`/api/channels/${channelId}/refresh`)
    return ok(response)
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Не удалось обновить метаданные канала')
  }
}

export async function linkSource(channelId: string, sourceId: string): Promise<ServiceResult<void>> {
  try {
    await apiPost(`/api/channels/${channelId}/sources/${sourceId}`)
    const nextIds = Array.from(new Set([...(linkedSourceIdsByChannelCache.get(channelId) ?? []), sourceId]))
    linkedSourceIdsByChannelCache.set(channelId, nextIds)
    const source = getSourceByIdSync(sourceId)
    if (source) {
      const nextSources = linkedSourcesByChannelCache.get(channelId) ?? []
      if (!nextSources.some((entry) => entry.id === sourceId)) {
        linkedSourcesByChannelCache.set(channelId, [...nextSources, source])
      }
    }
    noteChannelLinkedToSource(channelId, sourceId)
    updateLinkedSourcesCount(channelId, 1)
    return ok(undefined)
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Не удалось привязать источник')
  }
}

export async function unlinkSource(channelId: string, sourceId: string): Promise<ServiceResult<void>> {
  try {
    await apiDelete(`/api/channels/${channelId}/sources/${sourceId}`)
    linkedSourceIdsByChannelCache.set(
      channelId,
      (linkedSourceIdsByChannelCache.get(channelId) ?? []).filter((id) => id !== sourceId),
    )
    linkedSourcesByChannelCache.set(
      channelId,
      (linkedSourcesByChannelCache.get(channelId) ?? []).filter((source) => source.id !== sourceId),
    )
    noteChannelUnlinkedFromSource(channelId, sourceId)
    updateLinkedSourcesCount(channelId, -1)
    return ok(undefined)
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Не удалось отвязать источник')
  }
}

export async function createChannelTag(teamId: string, name: string, color: ChannelTag['color']) {
  const response = await apiPost<{ tag: ChannelTagRecord }>(`/api/teams/${teamId}/tags/channels`, { name, color })
  const tag = mapTag(response.tag)
  const current = teamChannelTagsCache.get(teamId) ?? []
  teamChannelTagsCache.set(teamId, [...current, tag])
  return tag
}

export async function updateChannelTag(teamId: string, tagId: string, input: { name?: string; color?: ChannelTag['color'] }) {
  const response = await apiPatch<{ tag: ChannelTagRecord }>(`/api/teams/${teamId}/tags/channels/${tagId}`, input)
  const updatedTag = mapTag(response.tag)

  teamChannelTagsCache.set(
    teamId,
    (teamChannelTagsCache.get(teamId) ?? []).map((tag) => (tag.id === tagId ? updatedTag : tag)),
  )

  for (const [channelId, tags] of channelTagsByChannelCache.entries()) {
    channelTagsByChannelCache.set(
      channelId,
      tags.map((tag) => (tag.id === tagId ? updatedTag : tag)),
    )
  }

  return updatedTag
}

export async function deleteChannelTag(teamId: string, tagId: string) {
  await apiDelete(`/api/teams/${teamId}/tags/channels/${tagId}`)
  teamChannelTagsCache.set(
    teamId,
    (teamChannelTagsCache.get(teamId) ?? []).filter((tag) => tag.id !== tagId),
  )

  for (const [channelId, tags] of channelTagsByChannelCache.entries()) {
    channelTagsByChannelCache.set(
      channelId,
      tags.filter((tag) => tag.id !== tagId),
    )
  }
}

export async function assignChannelTag(channelId: string, tagId: string) {
  await apiPost(`/api/channels/${channelId}/tags/${tagId}`)
  const channel = channelByIdCache.get(channelId)
  if (!channel) {
    return
  }

  const teamTags = teamChannelTagsCache.get(channel.teamId) ?? []
  const tag = teamTags.find((item) => item.id === tagId)
  if (!tag) {
    return
  }

  const current = channelTagsByChannelCache.get(channelId) ?? []
  if (!current.some((item) => item.id === tagId)) {
    channelTagsByChannelCache.set(channelId, [...current, tag])
  }
}

export async function removeChannelTagLink(channelId: string, tagId: string) {
  await apiDelete(`/api/channels/${channelId}/tags/${tagId}`)
  channelTagsByChannelCache.set(
    channelId,
    (channelTagsByChannelCache.get(channelId) ?? []).filter((tag) => tag.id !== tagId),
  )
}

export async function generateChannelTestingPreview(
  channelId: string,
  itemId: string,
): Promise<ServiceResult<ChannelTestingPreviewResponse>> {
  try {
    const response = await apiPost<ChannelTestingPreviewResponse>(`/api/channels/${channelId}/testing/generate`, { itemId })
    return ok(response)
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Не удалось сгенерировать тестовый пост')
  }
}

export async function publishChannelItem(
  channelId: string,
  itemId: string,
  previewDraft?: PublishPreviewDraftInput,
): Promise<ServiceResult<PublishChannelItemResponse>> {
  try {
    const response = await apiPost<PublishChannelItemResponse>(`/api/channels/${channelId}/publish`, {
      itemId,
      ...(previewDraft
        ? {
            previewGeneratedContent: previewDraft.previewGeneratedContent,
            previewGeneratedContentFormat: previewDraft.previewGeneratedContentFormat ?? undefined,
            previewTraceId: previewDraft.previewTraceId ?? undefined,
          }
        : {}),
    })
    return ok(response)
  } catch (error) {
    return err(
      getLimitAwareErrorMessage(error, 'Не удалось поставить публикацию в очередь'),
      getLimitAwareErrorCode(error),
      getLimitAwareErrorMeta(error),
    )
  }
}

