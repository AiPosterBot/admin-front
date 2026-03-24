export interface Admin {
  id: string
  nickname: string
  password: string
  isRoot: boolean
  isActive: boolean
  createdAt: string
  lastActive: string
}

export interface User {
  id: string
  email: string
  displayName: string
  password: string
  isActive: boolean
  emailVerified: boolean
  canCreateTeam: boolean
  maxTeams: number
  telegramUsername?: string
  telegramLinkedAt?: string
  createdAt: string
  lastActive: string
}

export interface AdsPost {
  id: string
  teamId: string
  createdByUserId: string
  createdByName: string
  text: string
  contentFormat?: TelegramContentFormat
  mediaType?: 'photo' | 'video' | 'document' | null
  mediaUrl?: string
  telegramFileId?: string
  usageCount?: number
  usedInCampaigns: string[]
  createdAt: string
}

export type TeamMemberRole = 'owner' | 'member'

export interface Team {
  id: string
  name: string
  ownerId: string
  ownerName: string
  isActive: boolean
  channelsCount: number
  sourcesCount: number
  membersCount: number
  limits: {
    maxPostsPerDay: number
    maxChannels: number
    maxSources: number
    maxAgentRuns: number
    maxMembers: number
  }
  lastError?: string
  createdAt: string
}

export interface TeamMember {
  id: string
  userId: string
  userName: string
  userEmail: string
  teamId: string
  role: TeamMemberRole
  isActive: boolean
  createdAt: string
}

export type InvitationStatus = 'pending' | 'accepted' | 'cancelled'

export interface Invitation {
  id: string
  teamId: string
  email: string
  invitedByUserId: string
  invitedByName: string
  status: InvitationStatus
  inviteToken: string
  createdAt: string
  acceptedAt?: string
}

export interface ChannelScheduleSlot {
  days: string[]
  times: string[]
}

export interface ChannelSchedule {
  timezone: string
  slots: ChannelScheduleSlot[]
}

export interface WebsiteFullConfig {
  kind: 'website_full'
  version: number
  list: {
    itemSelectors: string[]
    linkSelectors: string[]
  }
  article: {
    titleSelectors: string[]
    contentSelectors: string[]
    dateSelectors: string[]
    mediaSelectors: string[]
    idSelectors: string[]
    canonicalSelectors: string[]
  }
  quality: {
    minContentChars: number
  }
}

export interface RssArticleOnlyConfig {
  kind: 'rss_article_only'
  version: number
  article: {
    titleSelectors: string[]
    contentSelectors: string[]
    dateSelectors: string[]
    mediaSelectors: string[]
    idSelectors: string[]
    canonicalSelectors: string[]
  }
  quality: {
    minContentChars: number
  }
  rssFallbackPolicy: {
    minFeedContentChars: number
    preferFeedWhenFull: boolean
  }
}

export type AgentConfig = WebsiteFullConfig | RssArticleOnlyConfig
export type RssMode = 'feed_only' | 'feed_with_article_agent'
export type OnboardingStatus = 'pending' | 'running' | 'done' | 'failed'

export interface Channel {
  id: string
  teamId: string
  name: string
  telegramTarget: string
  telegramChatId?: string
  telegramUsername?: string
  isActive: boolean
  botCanPost: boolean
  publishMode: 'periodic' | 'scheduled' | 'every_material'
  publishIntervalSec?: number
  scheduleJson?: ChannelSchedule
  contentStrategy: 'newest' | 'agent'
  postStyle?: string
  disableMedia: boolean
  agentInstructions?: string
  skipLlmRewrite: boolean
  linkedSourcesCount: number
  postsToday?: number
  subscribersCount: number
  lastPublishedAt?: string
  publishSinceAt?: string
  lastError?: string
  createdAt: string
}

export interface Source {
  id: string
  teamId: string
  name: string
  type: 'telegram' | 'rss' | 'website'
  isActive: boolean
  url: string
  status: 'ok' | 'error'
  lastError?: string
  lastFetchedAt?: string
  scanIntervalSec?: number | null
  effectiveScanIntervalSec?: number
  minScanIntervalSec?: number
  maxScanIntervalSec?: number
  itemsCount: number
  itemsCount24h: number
  itemsCountWeek: number
  itemsCountMonth: number
  linkedChannelsCount?: number
  linkedChannelsPreview?: Array<Pick<Channel, 'id' | 'teamId' | 'name' | 'telegramTarget' | 'telegramChatId' | 'telegramUsername' | 'isActive'>>
  createdAt: string
  onboardingStatus?: OnboardingStatus
  activeConfigJson?: AgentConfig
  activeConfigVersion?: number
  lastOnboardedAt?: string
  lastOnboardJobId?: string
  rssMode?: RssMode
  rssArticleConfig?: RssArticleOnlyConfig
  rssArticleOnboardingStatus?: OnboardingStatus
  rssArticleOnboardedAt?: string
  rssArticleLastOnboardJobId?: string
  etag?: string
  lastModified?: string
  feedTitle?: string
  feedDescription?: string
  lastScanStats?: {
    savedFromFeed: number
    parsedFromArticle: number
    fallbackSavedAsTeaser: number
    parseErrors: number
    failedUrls?: string[]
    scanJobId?: string
    scannedAt?: string
  }
  telegramChatId?: number
  telegramUsername?: string
  lastMessageId?: number
  accessStatus?: 'ok' | 'no_access' | 'pending'
}

export interface Item {
  id: string
  teamId: string
  sourceId: string
  sourceName: string
  title: string
  content: string
  mediaUrl?: string
  hasMedia?: boolean
  mediaKind?: 'photo' | 'video' | 'document' | 'unknown' | null
  mediaPreviewAvailable?: boolean
  mediaPreviewRestrictedReason?: string | null
  extractedAt: string
  url?: string
  publishedAt?: string
  publicationsPreview?: Array<{
    id: string
    channelId: string
    channelName: string
    postedAt: string
  }>
  publicationsCount?: number
  externalId?: string
  canonicalUrl?: string
  dedupeKey?: string
}

export interface PostedItem {
  id: string
  teamId: string
  channelId: string
  channelName: string
  itemId: string
  itemTitle: string
  sourceId: string
  sourceName: string
  jobId: string
  generatedContent: string
  generatedContentFormat: TelegramContentFormat
  postedAt: string
  status: 'success' | 'failed'
  llmTraceId?: string
  telegramMessageId?: number
  views?: number
  reactions?: number
  mediaUrl?: string
  hasMedia?: boolean
  mediaKind?: 'photo' | 'video' | 'document' | 'unknown' | null
  mediaPreviewAvailable?: boolean
  mediaPreviewRestrictedReason?: string | null
  errorText?: string
}

export type JobType =
  | 'refresh_channel_metadata'
  | 'publish_to_channel'
  | 'fetch_rss'
  | 'fetch_rss_hybrid'
  | 'fetch_telegram'
  | 'fetch_website'
  | 'onboard_website'
  | 'onboard_rss_article'
  | 'ads_campaign'

export interface Job {
  id: string
  teamId: string
  type: JobType
  status: 'pending' | 'running' | 'success' | 'failed' | 'canceled' | 'timed_out'
  attempts?: number
  maxAttempts?: number
  runAt?: string
  progress: number
  params: Record<string, unknown>
  result?: Record<string, unknown>
  error?: string
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
  }
  logs: string[]
  createdAt: string
  completedAt?: string
  llmTraceIds: string[]
}

export interface LLMTrace {
  id: string
  jobId?: string
  teamId: string
  operation: string
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cost: number
  latencyMs: number
  prompt: string
  response: string
  toolCalls?: Array<{ name: string; arguments: Record<string, unknown>; result?: unknown }>
  rawRequest: Record<string, unknown>
  rawResponse: Record<string, unknown>
  createdAt: string
}

export interface AdsCampaign {
  id: string
  teamId: string
  name: string
  status: 'ready' | 'sending' | 'completed' | 'failed'
  scheduledAt?: string
  adsPostId: string
  targetChannels: string[]
  channelResults?: Record<
    string,
    {
      status: 'sent' | 'failed' | 'pending'
      telegramMessageId?: number
      viewsCount?: number
      error?: string
      updatedAt?: string
    }
  >
  sentCount: number
  failedCount: number
  createdAt: string
}

export interface ChannelSourceLink {
  channelId: string
  sourceId: string
}

export type TelegramContentFormat = 'plain' | 'telegram_html'

export type TagColor = 'red' | 'blue' | 'green' | 'amber' | 'purple' | 'pink' | 'teal' | 'orange'

export const TAG_COLORS: TagColor[] = ['red', 'blue', 'green', 'amber', 'purple', 'pink', 'teal', 'orange']

export interface ChannelTag {
  id: string
  teamId: string
  name: string
  color: TagColor
}

export interface SourceTag {
  id: string
  teamId: string
  name: string
  color: TagColor
}

export interface ChannelTagLink {
  channelId: string
  tagId: string
}

export interface SourceTagLink {
  sourceId: string
  tagId: string
}
