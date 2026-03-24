import { apiGet } from '../lib/api'
import type { Item, Source } from '../types/domain'
import { err, type ServiceResult } from '../types/dto'
import { getSourceByIdSync, primeTeamSources } from './sourceService'

interface PaginatedResponse<T> {
  data: T[]
  page: number
  limit: number
  total: number
  hasNext: boolean
}

interface ItemListRecord {
  id: string
  teamId: string
  sourceId: string
  sourceName?: string
  title: string
  contentText?: string
  contentPreview?: string
  url?: string | null
  mediaUrl?: string | null
  hasMedia?: boolean
  mediaKind?: Item['mediaKind']
  mediaPreviewAvailable?: boolean
  mediaPreviewRestrictedReason?: string | null
  publishedAt?: string | null
  extractedAt: string
  publicationsPreview?: Array<{
    id: string
    channelId: string
    channelName: string
    postedAt: string
  }>
  publicationsCount?: number
}

interface ItemDetailResponse {
  item: {
    id: string
    teamId: string
    sourceId: string
    title: string
    contentText: string
    contentHtml?: string | null
    mediaUrl?: string | null
    hasMedia?: boolean
    mediaKind?: Item['mediaKind']
    mediaPreviewAvailable?: boolean
    mediaPreviewRestrictedReason?: string | null
    url?: string | null
    externalId?: string | null
    canonicalUrl?: string | null
    dedupeKey?: string | null
    publishedAt?: string | null
    extractedAt: string
  }
  source: {
    id: string
    name: string
    type: Source['type']
    url?: string | null
  } | null
  publishTargets?: Array<{
    id: string
    name: string
    telegramTarget?: string | null
    telegramChatId?: string | null
    telegramUsername?: string | null
    isActive: boolean
    botCanPost: boolean
    publishMode: 'periodic' | 'scheduled' | 'every_material'
    lastPublishedAt?: string | null
    alreadyPublished: boolean
    publication?: {
      id: string
      status: string
      postedAt: string
    } | null
  }>
  publications?: Array<unknown>
}

interface ItemDetailRecord {
  item: Item
  source: {
    id: string
    name: string
    type: Source['type']
    url?: string | null
  } | null
  publishTargets: Array<{
    id: string
    name: string
    telegramTarget?: string | null
    telegramChatId?: string | null
    telegramUsername?: string | null
    isActive: boolean
    botCanPost: boolean
    publishMode: 'periodic' | 'scheduled' | 'every_material'
    lastPublishedAt?: string | null
    alreadyPublished: boolean
    publication?: {
      id: string
      status: string
      postedAt: string
    } | null
  }>
  publications: Array<unknown>
}

export interface ListTeamItemsOptions {
  page?: number
  limit?: number
  sourceId?: string
  sourceIds?: string[]
  published?: 'all' | 'published' | 'unpublished'
  sourceTagIds?: string[]
  q?: string
  from?: string
  to?: string
}

export interface TeamItemsListResult {
  data: Item[]
  page: number
  limit: number
  total: number
  hasNext: boolean
  facets?: {
    publishCounts: Record<'all' | 'published' | 'unpublished', number>
  }
}

const teamItemsCache = new Map<string, Item[]>()
const itemByIdCache = new Map<string, Item>()
const itemDetailCache = new Map<string, ItemDetailRecord>()

function mapItem(record: ItemListRecord): Item {
  return {
    id: record.id,
    teamId: record.teamId,
    sourceId: record.sourceId,
    sourceName: record.sourceName ?? getSourceByIdSync(record.sourceId)?.name ?? 'Источник',
    title: record.title,
    content: record.contentPreview ?? record.contentText ?? '',
    mediaUrl: record.mediaUrl ?? undefined,
    hasMedia: record.hasMedia ?? Boolean(record.mediaUrl),
    mediaKind: record.mediaKind ?? null,
    mediaPreviewAvailable: record.mediaPreviewAvailable ?? Boolean(record.mediaUrl),
    mediaPreviewRestrictedReason: record.mediaPreviewRestrictedReason ?? null,
    extractedAt: record.extractedAt,
    url: record.url ?? undefined,
    publishedAt: record.publishedAt ?? undefined,
    publicationsPreview: record.publicationsPreview ?? undefined,
    publicationsCount: record.publicationsCount ?? undefined,
  }
}

function upsertTeamItems(teamId: string, items: Item[]) {
  teamItemsCache.set(teamId, items)
  for (const item of items) {
    itemByIdCache.set(item.id, item)
  }
}

function noteItems(items: Item[]) {
  for (const item of items) {
    itemByIdCache.set(item.id, item)
  }
}

export async function getTeamItems(teamId: string): Promise<Item[]> {
  const [response] = await Promise.all([
    apiGet<PaginatedResponse<ItemListRecord>>(`/api/items?page=1&limit=100&teamId=${teamId}`),
    primeTeamSources(teamId),
  ])

  const items = response.data.map(mapItem)
  upsertTeamItems(teamId, items)
  return items
}

export async function listTeamItems(teamId: string, options: ListTeamItemsOptions = {}): Promise<TeamItemsListResult> {
  const params = new URLSearchParams({
    teamId,
    page: String(options.page ?? 1),
    limit: String(options.limit ?? 20),
  })

  if (options.sourceId) {
    params.set('sourceId', options.sourceId)
  }
  if (options.sourceIds && options.sourceIds.length > 0) {
    params.set('sourceIds', options.sourceIds.join(','))
  }
  if (options.published) {
    params.set('published', options.published)
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

  const [response] = await Promise.all([
    apiGet<PaginatedResponse<ItemListRecord> & TeamItemsListResult>(`/api/items?${params.toString()}`),
    primeTeamSources(teamId),
  ])

  const items = response.data.map(mapItem)
  noteItems(items)

  return {
    data: items,
    page: response.page,
    limit: response.limit,
    total: response.total,
    hasNext: response.hasNext,
    facets: response.facets,
  }
}

export function getTeamItemsList(teamId: string): Item[] {
  return teamItemsCache.get(teamId) ?? []
}

export function getItemsBySourceId(sourceId: string): Item[] {
  return Array.from(itemByIdCache.values()).filter((item) => item.sourceId === sourceId)
}

export async function getItemById(itemId: string, teamId: string, options: { fresh?: boolean } = {}): Promise<Item | null> {
  const cached = itemByIdCache.get(itemId)
  if (!options.fresh && cached && cached.teamId === teamId) {
    return cached
  }

  const detail = await getItemDetailById(itemId, teamId, options)
  return detail?.item ?? null
}

export async function getItemDetailById(itemId: string, teamId: string, options: { fresh?: boolean } = {}): Promise<ItemDetailRecord | null> {
  const cached = itemDetailCache.get(itemId)
  if (!options.fresh && cached && cached.item.teamId === teamId) {
    return cached
  }

  const response = await apiGet<ItemDetailResponse>(`/api/items/${itemId}`)
  const sourceName = response.source?.name ?? getSourceByIdSync(response.item.sourceId)?.name ?? 'Источник'
  const item: Item = {
    id: response.item.id,
    teamId: response.item.teamId,
    sourceId: response.item.sourceId,
    sourceName,
    title: response.item.title,
    content: response.item.contentText,
    mediaUrl: response.item.mediaUrl ?? undefined,
    hasMedia: response.item.hasMedia ?? Boolean(response.item.mediaUrl),
    mediaKind: response.item.mediaKind ?? null,
    mediaPreviewAvailable: response.item.mediaPreviewAvailable ?? Boolean(response.item.mediaUrl),
    mediaPreviewRestrictedReason: response.item.mediaPreviewRestrictedReason ?? null,
    extractedAt: response.item.extractedAt,
    url: response.item.url ?? undefined,
    publishedAt: response.item.publishedAt ?? undefined,
    externalId: response.item.externalId ?? undefined,
    canonicalUrl: response.item.canonicalUrl ?? undefined,
    dedupeKey: response.item.dedupeKey ?? undefined,
  }

  if (item.teamId !== teamId) {
    return null
  }

  itemByIdCache.set(item.id, item)
  const current = teamItemsCache.get(teamId) ?? []
  const existingIndex = current.findIndex((entry) => entry.id === item.id)
  const next = [...current]
  if (existingIndex >= 0) {
    next[existingIndex] = item
  } else {
    next.unshift(item)
  }
  teamItemsCache.set(teamId, next)

  const detail: ItemDetailRecord = {
    item,
    source: response.source,
    publishTargets: response.publishTargets ?? [],
    publications: response.publications ?? [],
  }
  itemDetailCache.set(itemId, detail)
  return detail
}

export async function deleteItem(_itemId: string, _teamId: string): Promise<ServiceResult<void>> {
  return err('Удаление материалов пока не реализовано')
}

export function getItemSource(item: Item) {
  return getSourceByIdSync(item.sourceId) ?? null
}
