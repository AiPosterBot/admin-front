import { apiDelete, apiGet, apiPost, apiStream } from '../lib/api'
import type { AdsCampaign, AdsPost } from '../types/domain'

interface PaginatedResponse<T> {
  data: T[]
  page: number
  limit: number
  total: number
  hasNext: boolean
}

interface AdsPostRecord {
  id: string
  teamId: string
  createdByUserId?: string
  createdByName: string
  text: string
  contentFormat?: 'plain' | 'telegram_html'
  mediaType?: 'photo' | 'video' | 'document' | null
  mediaUrl?: string | null
  telegramFileId?: string | null
  usageCount?: number
  usedInCampaigns?: string[]
  createdAt: string
}

interface AdsCampaignRecord {
  id: string
  teamId: string
  name: string
  status: AdsCampaign['status']
  adsPostId: string
  scheduledAt?: string | null
  sentCount: number
  failedCount: number
  createdAt: string
}

interface AdsCampaignChannelResultRecord {
  channelId: string
  status: 'pending' | 'sent' | 'failed'
  telegramMessageId: number | null
  viewsCount: number | null
  errorText: string | null
  updatedAt: string
}

interface AdsCampaignDetailResponse {
  campaign: AdsCampaignRecord
  adsPost: AdsPostRecord
  channelResults: AdsCampaignChannelResultRecord[]
}

interface AdsCampaignActionResponse {
  campaign?: AdsCampaignRecord
  job: {
    id: string
    type: 'ads_campaign'
    status: string
    progress: number
    createdAt: string
  }
  reused: boolean
}

export interface ListAdsPostsOptions {
  page?: number
  limit?: number
  q?: string
  usage?: 'all' | 'used' | 'unused'
}

export interface ListAdsCampaignsOptions {
  page?: number
  limit?: number
  status?: AdsCampaign['status']
}

export interface AdsCampaignDetailView {
  campaign: AdsCampaign
  adsPost: AdsPost
  results: AdsCampaignChannelResultRecord[]
}

export interface SubscribeToAdsCampaignOptions {
  signal?: AbortSignal
  onSnapshot?: (detail: AdsCampaignDetailView) => void
  onProgress?: (payload: { status: AdsCampaign['status']; progress: number; sentCount: number; failedCount: number }) => void
  onChannelResult?: (result: AdsCampaignChannelResultRecord) => void
  onDone?: (payload: { status: AdsCampaign['status']; progress: number; sentCount: number; failedCount: number }) => void
  onError?: (error: unknown) => void
}

function mapAdsPost(record: AdsPostRecord): AdsPost {
  const usedInCampaigns = record.usedInCampaigns ?? []

  return {
    id: record.id,
    teamId: record.teamId,
    createdByUserId: record.createdByUserId ?? '',
    createdByName: record.createdByName,
    text: record.text,
    contentFormat: record.contentFormat ?? 'plain',
    mediaType: record.mediaType ?? null,
    mediaUrl: record.mediaUrl ?? undefined,
    telegramFileId: record.telegramFileId ?? undefined,
    usageCount: record.usageCount ?? usedInCampaigns.length,
    usedInCampaigns,
    createdAt: record.createdAt,
  }
}

function mapAdsCampaign(record: AdsCampaignRecord, results: AdsCampaignChannelResultRecord[] = []): AdsCampaign {
  return {
    id: record.id,
    teamId: record.teamId,
    name: record.name,
    status: record.status,
    scheduledAt: record.scheduledAt ?? undefined,
    adsPostId: record.adsPostId,
    targetChannels: results.map((result) => result.channelId),
    channelResults: results.reduce<NonNullable<AdsCampaign['channelResults']>>((acc, result) => {
      acc[result.channelId] = {
        status: result.status,
        telegramMessageId: result.telegramMessageId ?? undefined,
        viewsCount: result.viewsCount ?? undefined,
        error: result.errorText ?? undefined,
        updatedAt: result.updatedAt,
      }
      return acc
    }, {}),
    sentCount: record.sentCount,
    failedCount: record.failedCount,
    createdAt: record.createdAt,
  }
}

function mapCampaignDetail(response: AdsCampaignDetailResponse): AdsCampaignDetailView {
  return {
    campaign: mapAdsCampaign(response.campaign, response.channelResults),
    adsPost: mapAdsPost(response.adsPost),
    results: response.channelResults,
  }
}

export async function listTeamAdsPosts(teamId: string, options: ListAdsPostsOptions = {}) {
  const params = new URLSearchParams({
    teamId,
    page: String(options.page ?? 1),
    limit: String(options.limit ?? 100),
  })

  if (options.q) {
    params.set('q', options.q)
  }
  if (options.usage && options.usage !== 'all') {
    params.set('usage', options.usage)
  }

  const response = await apiGet<PaginatedResponse<AdsPostRecord>>(`/api/ads/posts?${params.toString()}`)
  return {
    ...response,
    data: response.data.map(mapAdsPost),
  }
}

export async function listTeamAdsCampaigns(teamId: string, options: ListAdsCampaignsOptions = {}) {
  const params = new URLSearchParams({
    teamId,
    page: String(options.page ?? 1),
    limit: String(options.limit ?? 100),
  })

  if (options.status) {
    params.set('status', options.status)
  }

  const response = await apiGet<PaginatedResponse<AdsCampaignRecord>>(`/api/ads/campaigns?${params.toString()}`)
  return {
    ...response,
    data: response.data.map((campaign) => mapAdsCampaign(campaign)),
  }
}

export async function getAdsCampaignDetail(campaignId: string) {
  const response = await apiGet<AdsCampaignDetailResponse>(`/api/ads/campaigns/${campaignId}`)
  return mapCampaignDetail(response)
}

export async function createAdsCampaign(
  teamId: string,
  input: { name: string; adsPostId: string; targetChannels: string[]; scheduledAt?: string },
) {
  const params = new URLSearchParams({ teamId })
  const response = await apiPost<AdsCampaignActionResponse>(`/api/ads/campaigns?${params.toString()}`, input)

  if (response.campaign) {
    return {
      ...response,
      campaign: mapAdsCampaign(response.campaign),
    }
  }

  return response
}

export async function sendAdsCampaignNow(campaignId: string) {
  return apiPost<AdsCampaignActionResponse>(`/api/ads/campaigns/${campaignId}/send-now`)
}

export async function deleteAdsCampaign(campaignId: string) {
  return apiDelete<{ success: boolean }>(`/api/ads/campaigns/${campaignId}`)
}

export async function deleteAdsPost(postId: string) {
  return apiDelete<{ success: boolean }>(`/api/ads/posts/${postId}`)
}

export async function subscribeToAdsCampaign(campaignId: string, options: SubscribeToAdsCampaignOptions) {
  await apiStream(`/api/stream/ads/campaigns/${campaignId}`, {
    signal: options.signal,
    onMessage: (message) => {
      if (!message.event || !message.data) {
        return
      }

      const payload = JSON.parse(message.data) as Record<string, unknown>

      if (message.event === 'campaign.snapshot') {
        options.onSnapshot?.(mapCampaignDetail(payload as unknown as AdsCampaignDetailResponse))
        return
      }

      if (message.event === 'campaign.progress') {
        options.onProgress?.({
          status: String(payload.status) as AdsCampaign['status'],
          progress: Number(payload.progress ?? 0),
          sentCount: Number(payload.sentCount ?? 0),
          failedCount: Number(payload.failedCount ?? 0),
        })
        return
      }

      if (message.event === 'campaign.channel_result') {
        options.onChannelResult?.({
          channelId: String(payload.channelId),
          status: String(payload.status) as AdsCampaignChannelResultRecord['status'],
          telegramMessageId: payload.telegramMessageId === null ? null : Number(payload.telegramMessageId),
          viewsCount: payload.viewsCount === null ? null : Number(payload.viewsCount),
          errorText: payload.errorText ? String(payload.errorText) : null,
          updatedAt: String(payload.updatedAt),
        })
        return
      }

      if (message.event === 'campaign.done') {
        options.onDone?.({
          status: String(payload.status) as AdsCampaign['status'],
          progress: Number(payload.progress ?? 100),
          sentCount: Number(payload.sentCount ?? 0),
          failedCount: Number(payload.failedCount ?? 0),
        })
      }
    },
    onError: options.onError,
  })
}
