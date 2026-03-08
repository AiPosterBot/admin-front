// Mock data for the AI Poster admin panel
// ══════════════════════════════════════════
// Two separate entity types: Admin and User
// ══════════════════════════════════════════

// ── Admin (отдельная сущность, ник + пароль) ──
export interface Admin {
  id: string;
  nickname: string;
  password: string; // mock
  isRoot: boolean;  // root неизменяем, создаётся при запуске
  isActive: boolean;
  createdAt: string;
  lastActive: string;
}

// ── User (email + пароль + displayName) ──
export interface User {
  id: string;
  email: string;
  displayName: string;
  password: string; // mock
  isActive: boolean;
  emailVerified: boolean;
  canCreateTeam: boolean; // даётся при инвайте от админа
  maxTeams: number;       // сколько команд может создать (default 1)
  telegramUsername?: string; // привязанный TG-аккаунт (без @)
  telegramLinkedAt?: string;
  createdAt: string;
  lastActive: string;
}

// ── AdsPost (рекламный пост, захваченный через бота) ──
export interface AdsPost {
  id: string;
  teamId: string;
  createdByUserId: string;
  createdByName: string;
  text: string;
  mediaUrl?: string;
  usedInCampaigns: string[]; // ids кампаний, где используется
  createdAt: string;
}

// ── Team member role ──
export type TeamMemberRole = 'owner' | 'member';

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  isActive: boolean;
  channelsCount: number;
  sourcesCount: number;
  membersCount: number;
  limits: {
    maxPostsPerDay: number;
    maxChannels: number;
    maxSources: number;
    maxAgentRuns: number;
    maxMembers: number;
  };
  lastError?: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  teamId: string;
  role: TeamMemberRole;
  isActive: boolean;
  createdAt: string;
}

// ── Invitation ──
export type InvitationStatus = 'pending' | 'accepted' | 'cancelled';

export interface Invitation {
  id: string;
  teamId: string;
  email: string;
  invitedByUserId: string;
  invitedByName: string;
  status: InvitationStatus;
  inviteToken: string; // для ссылки принятия
  createdAt: string;
  acceptedAt?: string;
}

// ── Agent config types ──
// website_full: парсит и ленту, и статью
export interface WebsiteFullConfig {
  kind: 'website_full';
  version: number;
  list: {
    itemSelectors: string[];
    linkSelectors: string[];
  };
  article: {
    titleSelectors: string[];
    contentSelectors: string[];
    dateSelectors: string[];
    mediaSelectors: string[];
    idSelectors: string[];
    canonicalSelectors: string[];
  };
  quality: {
    minContentChars: number;
  };
}

// rss_article_only: НЕ парсит ленту, только HTML статьи
export interface RssArticleOnlyConfig {
  kind: 'rss_article_only';
  version: number;
  article: {
    titleSelectors: string[];
    contentSelectors: string[];
    dateSelectors: string[];
    mediaSelectors: string[];
    idSelectors: string[];
    canonicalSelectors: string[];
  };
  quality: {
    minContentChars: number;
  };
  rssFallbackPolicy: {
    minFeedContentChars: number;
    preferFeedWhenFull: boolean;
  };
}

export type AgentConfig = WebsiteFullConfig | RssArticleOnlyConfig;

// RSS-режим: feed_only | feed_with_article_agent
export type RssMode = 'feed_only' | 'feed_with_article_agent';

// Onboarding status
export type OnboardingStatus = 'pending' | 'running' | 'done' | 'failed';

export interface Channel {
  id: string;
  teamId: string;
  name: string;
  telegramId: string;
  isActive: boolean;
  botCanPost: boolean;
  publishMode: 'instant' | 'scheduled';
  cron?: string;
  timezone?: string;
  contentStrategy: 'newest' | 'agent';
  postStyle?: string;
  agentInstructions?: string;
  linkedSourcesCount: number;
  subscribersCount: number;
  lastPublishedAt?: string;
  lastError?: string;
  createdAt: string;
}

export interface Source {
  id: string;
  teamId: string;
  name: string;
  type: 'telegram' | 'rss' | 'website';
  isActive: boolean;
  url: string;
  status: 'ok' | 'error';
  lastError?: string;
  lastFetchedAt?: string;
  itemsCount: number;
  itemsCount24h: number;
  itemsCountWeek: number;
  itemsCountMonth: number;
  createdAt: string;
  // ── Website-specific ──
  onboardingStatus?: OnboardingStatus;
  activeConfigJson?: AgentConfig;
  activeConfigVersion?: number;
  lastOnboardedAt?: string;
  lastOnboardJobId?: string;
  // ── RSS-specific ──
  rssMode?: RssMode;
  rssArticleConfig?: RssArticleOnlyConfig;
  /** Статус onboarding article-агента для hybrid-режима */
  rssArticleOnboardingStatus?: OnboardingStatus;
  rssArticleOnboardedAt?: string;
  rssArticleLastOnboardJobId?: string;
  etag?: string;
  lastModified?: string;
  feedTitle?: string;
  feedDescription?: string;
  /** Метрики последнего hybrid-скана (только feed_with_article_agent) */
  lastScanStats?: {
    savedFromFeed: number;
    parsedFromArticle: number;
    fallbackSavedAsTeaser: number;
    parseErrors: number;
    failedUrls?: string[];
    scanJobId?: string;
    scannedAt?: string;
  };
  // ── Telegram-specific ──
  telegramChatId?: number;
  telegramUsername?: string;
  lastMessageId?: number;
  accessStatus?: 'ok' | 'no_access' | 'pending';
}

export interface Item {
  id: string;
  teamId: string;
  sourceId: string;
  sourceName: string;
  title: string;
  content: string;
  mediaUrl?: string;
  extractedAt: string;
  // ── Extended fields ──
  url?: string;
  publishedAt?: string;
  externalId?: string;
  canonicalUrl?: string;
  dedupeKey?: string;
}

export interface PostedItem {
  id: string;
  teamId: string;
  channelId: string;
  channelName: string;
  itemId: string;
  itemTitle: string;
  sourceId: string;
  sourceName: string;
  jobId: string;
  generatedContent: string;
  postedAt: string;
  status: 'success' | 'failed';
  llmTraceId?: string;
  telegramMessageId?: number;
  views?: number;
  reactions?: number;
  mediaUrl?: string;
}

// ── Job — строгие типы (импорт из types/dto для полного контракта) ──
// Для обратной совместимости params/result оставлены широкими,
// но тип `type` — литеральный union из JobType.
// Используй AnyJob и�� types/dto.ts в новом коде.
export type JobType =
  | 'publish_to_channel'
  | 'fetch_rss'
  | 'fetch_rss_hybrid'
  | 'fetch_telegram'
  | 'fetch_website'
  | 'onboard_website'
  | 'onboard_rss_article'
  | 'ads_campaign';

export interface Job {
  id: string;
  teamId: string;
  /** Литеральный union — заменяет `string`. Новый код: используй AnyJob из types/dto.ts */
  type: JobType;
  status: 'pending' | 'running' | 'success' | 'failed';
  progress: number;
  /** @deprecated Используй типизированные params из types/dto.ts JobParamsMap */
  params: Record<string, unknown>;
  /** @deprecated Используй типизированные result из types/dto.ts JobResultMap */
  result?: Record<string, unknown>;
  error?: string;
  logs: string[];
  createdAt: string;
  completedAt?: string;
  llmTraceIds: string[];
}

export interface LLMTrace {
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
  /** Типизировано: массив вызовов инструментов (tool use в LLM API) */
  toolCalls?: Array<{ name: string; arguments: Record<string, unknown>; result?: unknown }>;
  rawRequest: Record<string, unknown>;
  rawResponse: Record<string, unknown>;
  createdAt: string;
}

export interface AdsCampaign {
  id: string;
  name: string;
  status: 'ready' | 'sending' | 'completed' | 'failed';
  scheduledAt?: string;
  adsPostId: string; // ссылка на AdsPost
  targetChannels: string[];
  /** Для каждого канала — результат отправки */
  channelResults?: Record<string, {
    status: 'sent' | 'failed' | 'pending';
    telegramMessageId?: number;
    viewsCount?: number;
    error?: string;
  }>;
  sentCount: number;
  failedCount: number;
  createdAt: string;
}

// ──────────────────────────────────────────
// Channel ↔ Source links
// ──────────────────────────────────────────
export interface ChannelSourceLink {
  channelId: string;
  sourceId: string;
}

// ──────────────────────────────────────────
// Tags
// ──────────────────────────────────────────
export type TagColor = 'red' | 'blue' | 'green' | 'amber' | 'purple' | 'pink' | 'teal' | 'orange';
export const TAG_COLORS: TagColor[] = ['red', 'blue', 'green', 'amber', 'purple', 'pink', 'teal', 'orange'];

export interface ChannelTag {
  id: string;
  teamId: string;
  name: string;
  color: TagColor;
}

export interface SourceTag {
  id: string;
  teamId: string;
  name: string;
  color: TagColor;
}

export interface ChannelTagLink {
  channelId: string;
  tagId: string;
}

export interface SourceTagLink {
  sourceId: string;
  tagId: string;
}

export let mockChannelTags: ChannelTag[] = [
  { id: 'chtag1', teamId: 'team1', name: 'Новости',       color: 'blue' },
  { id: 'chtag2', teamId: 'team1', name: 'Развлечения',   color: 'pink' },
  { id: 'chtag3', teamId: 'team1', name: 'Технологии',    color: 'purple' },
  { id: 'chtag4', teamId: 'team1', name: 'Бизнес',        color: 'amber' },
  { id: 'chtag5', teamId: 'team2', name: 'Маркетинг',     color: 'green' },
  { id: 'chtag6', teamId: 'team2', name: 'Аналитика',     color: 'teal' },
];

export let mockSourceTags: SourceTag[] = [
  { id: 'srctag1', teamId: 'team1', name: 'IT',          color: 'blue' },
  { id: 'srctag2', teamId: 'team1', name: 'Финансы',     color: 'green' },
  { id: 'srctag3', teamId: 'team1', name: 'Наука',       color: 'purple' },
  { id: 'srctag4', teamId: 'team1', name: 'Безопасность',color: 'red' },
  { id: 'srctag5', teamId: 'team1', name: 'AI/ML',       color: 'amber' },
  { id: 'srctag6', teamId: 'team2', name: 'Маркетинг',   color: 'orange' },
];

export let mockChannelTagLinks: ChannelTagLink[] = [
  { channelId: 'ch1', tagId: 'chtag1' },
  { channelId: 'ch1', tagId: 'chtag3' },
  { channelId: 'ch2', tagId: 'chtag3' },
  { channelId: 'ch2', tagId: 'chtag1' },
  { channelId: 'ch3', tagId: 'chtag3' },
  { channelId: 'ch4', tagId: 'chtag5' },
];

export let mockSourceTagLinks: SourceTagLink[] = [
  { sourceId: 'src1', tagId: 'srctag1' },
  { sourceId: 'src1', tagId: 'srctag5' },
  { sourceId: 'src2', tagId: 'srctag1' },
  { sourceId: 'src3', tagId: 'srctag5' },
  { sourceId: 'src4', tagId: 'srctag5' },
  { sourceId: 'src5', tagId: 'srctag1' },
  { sourceId: 'src6', tagId: 'srctag1' },
  { sourceId: 'src6', tagId: 'srctag3' },
  { sourceId: 'src7', tagId: 'srctag4' },
  { sourceId: 'src8', tagId: 'srctag1' },
  { sourceId: 'src9', tagId: 'srctag1' },
  { sourceId: 'src9', tagId: 'srctag3' },
  { sourceId: 'src10', tagId: 'srctag6' },
  { sourceId: 'src11', tagId: 'srctag1' },
  { sourceId: 'src11', tagId: 'srctag5' },
];

// Tag helpers
export const getChannelTags = (channelId: string): ChannelTag[] => {
  const tagIds = mockChannelTagLinks.filter(l => l.channelId === channelId).map(l => l.tagId);
  return mockChannelTags.filter(t => tagIds.includes(t.id));
};

export const getSourceTags = (sourceId: string): SourceTag[] => {
  const tagIds = mockSourceTagLinks.filter(l => l.sourceId === sourceId).map(l => l.tagId);
  return mockSourceTags.filter(t => tagIds.includes(t.id));
};

export const addChannelTag = (teamId: string, name: string, color: TagColor): ChannelTag => {
  const tag: ChannelTag = { id: `chtag${Date.now()}`, teamId, name, color };
  mockChannelTags.push(tag);
  return tag;
};

export const addSourceTag = (teamId: string, name: string, color: TagColor): SourceTag => {
  const tag: SourceTag = { id: `srctag${Date.now()}`, teamId, name, color };
  mockSourceTags.push(tag);
  return tag;
};

export const deleteChannelTag = (tagId: string): number => {
  const count = mockChannelTagLinks.filter(l => l.tagId === tagId).length;
  mockChannelTags = mockChannelTags.filter(t => t.id !== tagId);
  mockChannelTagLinks = mockChannelTagLinks.filter(l => l.tagId !== tagId);
  return count;
};

export const deleteSourceTag = (tagId: string): number => {
  const count = mockSourceTagLinks.filter(l => l.tagId === tagId).length;
  mockSourceTags = mockSourceTags.filter(t => t.id !== tagId);
  mockSourceTagLinks = mockSourceTagLinks.filter(l => l.tagId !== tagId);
  return count;
};

export const renameChannelTag = (tagId: string, name: string) => {
  const tag = mockChannelTags.find(t => t.id === tagId);
  if (tag) tag.name = name;
};

export const renameSourceTag = (tagId: string, name: string) => {
  const tag = mockSourceTags.find(t => t.id === tagId);
  if (tag) tag.name = name;
};

export const assignChannelTag = (channelId: string, tagId: string) => {
  if (!mockChannelTagLinks.find(l => l.channelId === channelId && l.tagId === tagId)) {
    mockChannelTagLinks.push({ channelId, tagId });
  }
};

export const removeChannelTagLink = (channelId: string, tagId: string) => {
  mockChannelTagLinks = mockChannelTagLinks.filter(
    l => !(l.channelId === channelId && l.tagId === tagId)
  );
};

export const assignSourceTag = (sourceId: string, tagId: string) => {
  if (!mockSourceTagLinks.find(l => l.sourceId === sourceId && l.tagId === tagId)) {
    mockSourceTagLinks.push({ sourceId, tagId });
  }
};

export const removeSourceTagLink = (sourceId: string, tagId: string) => {
  mockSourceTagLinks = mockSourceTagLinks.filter(
    l => !(l.sourceId === sourceId && l.tagId === tagId)
  );
};

export let mockChannelSourceLinks: ChannelSourceLink[] = [
  { channelId: 'ch1', sourceId: 'src1' },
  { channelId: 'ch1', sourceId: 'src2' },
  { channelId: 'ch1', sourceId: 'src3' },
  { channelId: 'ch2', sourceId: 'src3' },
  { channelId: 'ch2', sourceId: 'src1' },
  { channelId: 'ch3', sourceId: 'src2' },
  { channelId: 'ch4', sourceId: 'src10' },
];

export function linkSource(channelId: string, sourceId: string) {
  if (!mockChannelSourceLinks.find(l => l.channelId === channelId && l.sourceId === sourceId)) {
    mockChannelSourceLinks.push({ channelId, sourceId });
    const ch = mockChannels.find(c => c.id === channelId);
    if (ch) ch.linkedSourcesCount++;
  }
}

export function unlinkSource(channelId: string, sourceId: string) {
  mockChannelSourceLinks = mockChannelSourceLinks.filter(
    l => !(l.channelId === channelId && l.sourceId === sourceId)
  );
  const ch = mockChannels.find(c => c.id === channelId);
  if (ch) ch.linkedSourcesCount = Math.max(0, ch.linkedSourcesCount - 1);
}

// ──────────────────────────────────────────
// Mock admins
// ─────────────��────────────────────────────
export const mockAdmins: Admin[] = [
  {
    id: 'admin-root',
    nickname: 'root',
    password: 'root123',
    isRoot: true,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    lastActive: '2026-02-25T08:00:00Z',
  },
  {
    id: 'admin-2',
    nickname: 'admin',
    password: 'admin123',
    isRoot: false,
    isActive: true,
    createdAt: '2024-01-15T00:00:00Z',
    lastActive: '2026-02-25T07:30:00Z',
  },
];

// ──────────────────────────────────────────
// Mock users
// ──────────────────────────────────────────
export const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'john@example.com',
    displayName: 'John Doe',
    password: 'pass123',
    isActive: true,
    emailVerified: true,
    canCreateTeam: true,
    maxTeams: 2,
    telegramUsername: 'johndoe',
    telegramLinkedAt: '2025-06-10T12:00:00Z',
    createdAt: '2024-02-01T00:00:00Z',
    lastActive: '2026-02-25T09:00:00Z',
  },
  {
    id: 'user-2',
    email: 'jane@example.com',
    displayName: 'Jane Smith',
    password: 'pass123',
    isActive: true,
    emailVerified: true,
    canCreateTeam: true,
    maxTeams: 2,
    createdAt: '2024-02-10T00:00:00Z',
    lastActive: '2026-02-24T18:00:00Z',
  },
  {
    id: 'user-3',
    email: 'alex@example.com',
    displayName: 'Alex Petrov',
    password: 'pass123',
    isActive: true,
    emailVerified: true,
    canCreateTeam: false,
    maxTeams: 0,
    createdAt: '2024-03-10T00:00:00Z',
    lastActive: '2026-02-25T08:45:00Z',
  },
  {
    id: 'user-4',
    email: 'maria@example.com',
    displayName: 'Maria Ivanova',
    password: 'pass123',
    isActive: true,
    emailVerified: true,
    canCreateTeam: false,
    maxTeams: 0,
    createdAt: '2024-03-15T00:00:00Z',
    lastActive: '2026-02-24T20:00:00Z',
  },
  {
    id: 'user-5',
    email: 'disabled@example.com',
    displayName: 'Disabled User',
    password: 'pass123',
    isActive: false,
    emailVerified: true,
    canCreateTeam: true,
    maxTeams: 1,
    createdAt: '2024-03-01T00:00:00Z',
    lastActive: '2024-12-01T00:00:00Z',
  },
];

// ──────────────────────────────────────────
// Mock teams
// ──────────────────────────────────────────
export const mockTeams: Team[] = [
  {
    id: 'team1',
    name: 'Tech News Team',
    ownerId: 'user-1',
    ownerName: 'John Doe',
    isActive: true,
    channelsCount: 3,
    sourcesCount: 10,
    membersCount: 3,
    limits: {
      maxPostsPerDay: 100,
      maxChannels: 10,
      maxSources: 20,
      maxAgentRuns: 20,
      maxMembers: 5,
    },
    createdAt: '2024-02-15T00:00:00Z',
  },
  {
    id: 'team2',
    name: 'Marketing Hub',
    ownerId: 'user-2',
    ownerName: 'Jane Smith',
    isActive: true,
    channelsCount: 2,
    sourcesCount: 2,
    membersCount: 2,
    limits: {
      maxPostsPerDay: 100,
      maxChannels: 10,
      maxSources: 20,
      maxAgentRuns: 20,
      maxMembers: 3,
    },
    lastError: 'Channel @marketing_main failed to post',
    createdAt: '2024-03-01T00:00:00Z',
  },
  {
    id: 'team3',
    name: 'Crypto Analytics',
    ownerId: 'user-1',
    ownerName: 'John Doe',
    isActive: false,
    channelsCount: 1,
    sourcesCount: 2,
    membersCount: 1,
    limits: {
      maxPostsPerDay: 100,
      maxChannels: 10,
      maxSources: 20,
      maxAgentRuns: 20,
      maxMembers: 2,
    },
    createdAt: '2024-03-15T00:00:00Z',
  },
];

// ──────────────────────────────────────────
// Mock team members
// ──────────────────────────────────────────
export const mockTeamMembers: TeamMember[] = [
  {
    id: 'member1',
    userId: 'user-1',
    userName: 'John Doe',
    userEmail: 'john@example.com',
    teamId: 'team1',
    role: 'owner',
    isActive: true,
    createdAt: '2024-02-15T00:00:00Z',
  },
  {
    id: 'member4',
    userId: 'user-3',
    userName: 'Alex Petrov',
    userEmail: 'alex@example.com',
    teamId: 'team1',
    role: 'member',
    isActive: true,
    createdAt: '2024-03-10T00:00:00Z',
  },
  {
    id: 'member7',
    userId: 'user-4',
    userName: 'Maria Ivanova',
    userEmail: 'maria@example.com',
    teamId: 'team1',
    role: 'member',
    isActive: true,
    createdAt: '2024-03-15T00:00:00Z',
  },
  {
    id: 'member5',
    userId: 'user-2',
    userName: 'Jane Smith',
    userEmail: 'jane@example.com',
    teamId: 'team2',
    role: 'owner',
    isActive: true,
    createdAt: '2024-03-01T00:00:00Z',
  },
  {
    id: 'member8',
    userId: 'user-3',
    userName: 'Alex Petrov',
    userEmail: 'alex@example.com',
    teamId: 'team2',
    role: 'member',
    isActive: true,
    createdAt: '2024-03-20T00:00:00Z',
  },
  {
    id: 'member6',
    userId: 'user-1',
    userName: 'John Doe',
    userEmail: 'john@example.com',
    teamId: 'team3',
    role: 'owner',
    isActive: true,
    createdAt: '2024-03-15T00:00:00Z',
  },
];

// ──────────────────────────────���───────────
// Mock invitations
// ──────────────────────────────────────────
export const mockInvitations: Invitation[] = [
  {
    id: 'inv1',
    teamId: 'team1',
    email: 'newuser@example.com',
    invitedByUserId: 'user-1',
    invitedByName: 'John Doe',
    status: 'pending',
    inviteToken: 'tok_abc123',
    createdAt: '2026-02-25T10:00:00Z',
  },
  {
    id: 'inv2',
    teamId: 'team2',
    email: 'another@example.com',
    invitedByUserId: 'user-2',
    invitedByName: 'Jane Smith',
    status: 'pending',
    inviteToken: 'tok_def456',
    createdAt: '2026-02-24T14:00:00Z',
  },
  {
    // Invitation for an EXISTING user (jane@example.com) to team1
    // This lets you test the "user exists → login → accept" flow
    id: 'inv3',
    teamId: 'team1',
    email: 'jane@example.com',
    invitedByUserId: 'user-1',
    invitedByName: 'John Doe',
    status: 'pending',
    inviteToken: 'tok_existing_user',
    createdAt: '2026-02-25T11:00:00Z',
  },
];

// ── Admin invitations (invite from admin → user gets ability to create team) ──
export interface AdminInvite {
  id: string;
  email: string;
  invitedByAdminId: string;
  inviteToken: string;
  status: 'pending' | 'accepted';
  createdAt: string;
}

export const mockAdminInvites: AdminInvite[] = [
  {
    id: 'adm-inv1',
    email: 'pending-user@example.com',
    invitedByAdminId: 'admin-root',
    inviteToken: 'adm_tok_xyz789',
    status: 'pending',
    createdAt: '2026-02-25T12:00:00Z',
  },
];

// ─────────────────────────────���────────────
// Mock channels
// ──────────────────────────────────────────
export const mockChannels: Channel[] = [
  {
    id: 'ch1',
    teamId: 'team1',
    name: 'Tech Daily',
    telegramId: '@tech_daily_news',
    isActive: true,
    botCanPost: true,
    publishMode: 'scheduled',
    cron: '0 9,15,21 * * *',
    timezone: 'UTC',
    contentStrategy: 'agent',
    postStyle: 'Пиши кратко и увлекательно, как для широкой аудитории. Используй эмодзи, хэштеги и призыв к действию �� конце.',
    agentInstructions: 'Выбирай самый интересный и актуальный материал. Приоритет — громкие новости и эксклюзивы.',
    linkedSourcesCount: 3,
    subscribersCount: 14_820,
    lastPublishedAt: '2026-02-25T09:00:00Z',
    createdAt: '2024-02-15T00:00:00Z',
  },
  {
    id: 'ch2',
    teamId: 'team1',
    name: 'AI Updates',
    telegramId: '@ai_updates_channel',
    isActive: true,
    botCanPost: true,
    publishMode: 'instant',
    contentStrategy: 'newest',
    postStyle: 'Профессиональный тон, фокус на практических выводах и влиянии на индустрию. Без воды.',
    linkedSourcesCount: 2,
    subscribersCount: 8_340,
    lastPublishedAt: '2026-02-25T08:30:00Z',
    createdAt: '2024-02-18T00:00:00Z',
  },
  {
    id: 'ch3',
    teamId: 'team1',
    name: 'Web3 Corner',
    telegramId: '@web3_corner',
    isActive: false,
    botCanPost: false,
    publishMode: 'scheduled',
    cron: '0 12 * * *',
    timezone: 'Europe/Moscow',
    contentStrategy: 'newest',
    postStyle: 'Объясняй доступно для крипто-энтузиастов. Акцент на новостях рынка и технологиях.',
    agentInstructions: 'Выбирай новости с наибольшим влиянием на рынок.',
    linkedSourcesCount: 1,
    subscribersCount: 3_210,
    lastError: 'Бот был удалён из канала администратором. Добавьте бота обратно и выдайте права на постинг.',
    createdAt: '2024-03-01T00:00:00Z',
  },
  {
    id: 'ch4',
    teamId: 'team2',
    name: 'Marketing Pro',
    telegramId: '@marketing_main',
    isActive: true,
    botCanPost: true,
    publishMode: 'scheduled',
    cron: '0 10,16 * * *',
    timezone: 'America/New_York',
    contentStrategy: 'agent',
    postStyle: 'Превращай маркетинговые инсайты в практические советы. Фокус на ROI и конкретных действиях.',
    linkedSourcesCount: 2,
    subscribersCount: 22_150,
    createdAt: '2024-03-01T00:00:00Z',
  },
];

// ──────────────────────────────────────────
// Mock sources
// ─────────────────────────────────────────
export const mockSources: Source[] = [
  {
    id: 'src1',
    teamId: 'team1',
    name: 'TechCrunch',
    type: 'rss',
    isActive: true,
    url: 'https://techcrunch.com/feed',
    status: 'ok',
    itemsCount: 124,
    itemsCount24h: 9,
    itemsCountWeek: 47,
    itemsCountMonth: 98,
    lastFetchedAt: '2026-02-25T10:30:00Z',
    createdAt: '2024-02-15T00:00:00Z',
    // RSS-specific
    rssMode: 'feed_only',
    etag: '"6a5b4c3d-2e1f"',
    lastModified: 'Mon, 25 Feb 2026 10:30:00 GMT',
    feedTitle: 'TechCrunch',
    feedDescription: 'Startup and Technology News',
  },
  {
    id: 'src2',
    teamId: 'team1',
    name: 'Hacker News',
    type: 'website',
    isActive: true,
    url: 'https://news.ycombinator.com',
    status: 'ok',
    itemsCount: 89,
    itemsCount24h: 6,
    itemsCountWeek: 31,
    itemsCountMonth: 72,
    lastFetchedAt: '2026-02-25T10:00:00Z',
    createdAt: '2024-02-15T00:00:00Z',
    // Website-specific
    onboardingStatus: 'done',
    activeConfigJson: {
      kind: 'website_full',
      version: 1,
      list: {
        itemSelectors: ['.athing', '.itemlist tr.athing'],
        linkSelectors: ['.titleline > a[href]'],
      },
      article: {
        titleSelectors: ['h1', 'meta[property="og:title"]'],
        contentSelectors: ['article .content', 'main article', '.comment-text'],
        dateSelectors: ['time[datetime]', '.age a'],
        mediaSelectors: ['meta[property="og:image"]'],
        idSelectors: ['meta[name="item-id"]'],
        canonicalSelectors: ['link[rel="canonical"]', 'meta[property="og:url"]'],
      },
      quality: { minContentChars: 280 },
    },
    activeConfigVersion: 1,
    lastOnboardedAt: '2026-02-15T00:00:08Z',
    lastOnboardJobId: 'job27',
  },
  {
    id: 'src3',
    teamId: 'team1',
    name: 'AI News Channel',
    type: 'telegram',
    isActive: true,
    url: '@ai_newschannel',
    status: 'ok',
    itemsCount: 156,
    itemsCount24h: 12,
    itemsCountWeek: 54,
    itemsCountMonth: 128,
    lastFetchedAt: '2026-03-01T09:45:00Z',
    createdAt: '2024-02-18T00:00:00Z',
    // Telegram-specific
    telegramChatId: -1001234567890,
    telegramUsername: 'ai_newschannel',
    lastMessageId: 4521,
    accessStatus: 'ok',
  },
  {
    id: 'src4',
    teamId: 'team1',
    name: 'OpenAI Blog',
    type: 'rss',
    isActive: false,
    url: 'https://openai.com/blog/rss',
    status: 'error',
    lastError: 'Connection timeout after 3 retries',
    itemsCount: 0,
    itemsCount24h: 0,
    itemsCountWeek: 0,
    itemsCountMonth: 0,
    lastFetchedAt: '2026-02-24T10:00:00Z',
    createdAt: '2024-02-20T00:00:00Z',
    // RSS-specific
    rssMode: 'feed_with_article_agent',
    rssArticleConfig: {
      kind: 'rss_article_only',
      version: 1,
      article: {
        titleSelectors: ['h1', 'meta[property="og:title"]'],
        contentSelectors: ['.blog-post-content', 'main article'],
        dateSelectors: ['time[datetime]', 'meta[property="article:published_time"]'],
        mediaSelectors: ['meta[property="og:image"]', 'article img'],
        idSelectors: ['meta[name="article:id"]'],
        canonicalSelectors: ['link[rel="canonical"]'],
      },
      quality: { minContentChars: 280 },
      rssFallbackPolicy: { minFeedContentChars: 700, preferFeedWhenFull: true },
    },
    feedTitle: 'OpenAI Blog',
    feedDescription: 'OpenAI research and announcements',
  },
  {
    id: 'src5',
    teamId: 'team1',
    name: 'Технозавр',
    type: 'telegram',
    isActive: true,
    url: '@tehnozavr',
    status: 'error',
    lastError: 'Бот не добавлен в канал как администратор. Нет прав на чтение сообщений.',
    itemsCount: 0,
    itemsCount24h: 0,
    itemsCountWeek: 0,
    itemsCountMonth: 0,
    lastFetchedAt: undefined as any,
    createdAt: '2026-02-28T00:00:00Z',
    // Telegram-specific
    telegramUsername: 'tehnozavr',
    accessStatus: 'no_access',
  },
  {
    id: 'src6',
    teamId: 'team1',
    name: 'Habr',
    type: 'website',
    isActive: true,
    url: 'https://habr.com/ru/flows/develop/',
    status: 'ok',
    itemsCount: 312,
    itemsCount24h: 18,
    itemsCountWeek: 87,
    itemsCountMonth: 245,
    lastFetchedAt: '2026-03-01T10:00:00Z',
    createdAt: '2024-01-10T00:00:00Z',
    // Website-specific
    onboardingStatus: 'done',
    activeConfigJson: {
      kind: 'website_full',
      version: 1,
      list: {
        itemSelectors: ['article.tm-articles-list__item', '.content-list__item'],
        linkSelectors: ['a.tm-title__link[href]', 'h2 a[href]'],
      },
      article: {
        titleSelectors: ['h1.tm-title', 'meta[property="og:title"]'],
        contentSelectors: ['div.tm-article-body', 'article .article-formatted-body'],
        dateSelectors: ['time[datetime]', 'meta[property="article:published_time"]'],
        mediaSelectors: ['meta[property="og:image"]', 'article img'],
        idSelectors: ['meta[name="article:id"]', 'article[data-id]'],
        canonicalSelectors: ['link[rel="canonical"]', 'meta[property="og:url"]'],
      },
      quality: { minContentChars: 280 },
    },
    activeConfigVersion: 2,
    lastOnboardedAt: '2026-01-15T12:00:00Z',
  },
  {
    id: 'src7',
    teamId: 'team1',
    name: 'Cyber Security News',
    type: 'telegram',
    isActive: true,
    url: '@cybersecnews',
    status: 'ok',
    itemsCount: 89,
    itemsCount24h: 5,
    itemsCountWeek: 28,
    itemsCountMonth: 73,
    lastFetchedAt: '2026-03-01T08:30:00Z',
    createdAt: '2024-06-01T00:00:00Z',
    // Telegram-specific
    telegramChatId: -1009876543210,
    telegramUsername: 'cybersecnews',
    lastMessageId: 2891,
    accessStatus: 'ok',
  },
  {
    id: 'src8',
    teamId: 'team1',
    name: 'The Verge',
    type: 'rss',
    isActive: true,
    url: 'https://www.theverge.com/rss/index.xml',
    status: 'ok',
    itemsCount: 203,
    itemsCount24h: 14,
    itemsCountWeek: 62,
    itemsCountMonth: 178,
    lastFetchedAt: '2026-03-01T10:15:00Z',
    createdAt: '2024-03-15T00:00:00Z',
    // RSS-specific
    rssMode: 'feed_with_article_agent',
    rssArticleConfig: {
      kind: 'rss_article_only',
      version: 1,
      article: {
        titleSelectors: ['h1', 'meta[property="og:title"]'],
        contentSelectors: ['.duet--article--article-body-component', 'article .entry-content'],
        dateSelectors: ['time[datetime]', 'meta[property="article:published_time"]'],
        mediaSelectors: ['meta[property="og:image"]', 'figure img'],
        idSelectors: ['meta[name="sailthru.content.id"]'],
        canonicalSelectors: ['link[rel="canonical"]'],
      },
      quality: { minContentChars: 280 },
      rssFallbackPolicy: { minFeedContentChars: 700, preferFeedWhenFull: true },
    },
    etag: '"abc123def456"',
    lastModified: 'Sat, 01 Mar 2026 10:15:00 GMT',
    feedTitle: 'The Verge',
    feedDescription: 'The Verge covers the intersection of technology, science, art, and culture.',
    rssArticleOnboardingStatus: 'done',
    rssArticleOnboardedAt: '2026-01-20T14:00:00Z',
    rssArticleLastOnboardJobId: 'job22-roa',
    lastScanStats: {
      savedFromFeed: 11,
      parsedFromArticle: 8,
      fallbackSavedAsTeaser: 1,
      parseErrors: 1,
      failedUrls: ['https://www.theverge.com/sponsored/blocked-article'],
      scanJobId: 'job23-rfh',
      scannedAt: '2026-03-01T10:15:00Z',
    },
  },
  {
    id: 'src9',
    teamId: 'team1',
    name: 'ArsTechnica',
    type: 'website',
    isActive: false,
    url: 'https://arstechnica.com',
    status: 'ok',
    itemsCount: 67,
    itemsCount24h: 0,
    itemsCountWeek: 0,
    itemsCountMonth: 12,
    lastFetchedAt: '2026-02-15T14:00:00Z',
    createdAt: '2024-05-20T00:00:00Z',
    // Website-specific
    onboardingStatus: 'done',
    activeConfigJson: {
      kind: 'website_full',
      version: 1,
      list: {
        itemSelectors: ['article.listing', 'li.listing-item'],
        linkSelectors: ['a.listing-link[href]', 'h2 a[href]'],
      },
      article: {
        titleSelectors: ['h1', 'meta[property="og:title"]'],
        contentSelectors: ['div.article-content', 'article .post-content'],
        dateSelectors: ['time[datetime]'],
        mediaSelectors: ['meta[property="og:image"]', 'figure img'],
        idSelectors: ['meta[name="article:id"]'],
        canonicalSelectors: ['link[rel="canonical"]'],
      },
      quality: { minContentChars: 280 },
    },
    activeConfigVersion: 1,
    lastOnboardedAt: '2024-05-20T01:00:00Z',
  },
  {
    id: 'src10',
    teamId: 'team2',
    name: 'Marketing Week',
    type: 'rss',
    isActive: true,
    url: 'https://marketingweek.com/feed',
    status: 'ok',
    itemsCount: 43,
    itemsCount24h: 3,
    itemsCountWeek: 18,
    itemsCountMonth: 38,
    lastFetchedAt: '2026-02-25T07:30:00Z',
    createdAt: '2024-03-01T00:00:00Z',
    // RSS-specific
    rssMode: 'feed_only',
    etag: '"mk-week-etag-001"',
    feedTitle: 'Marketing Week',
    feedDescription: 'Marketing news and insights',
  },
  // ── Новый hybrid-источник (MIT Technology Review) ──
  {
    id: 'src11',
    teamId: 'team1',
    name: 'MIT Technology Review',
    type: 'rss',
    isActive: true,
    url: 'https://www.technologyreview.com/feed/',
    status: 'ok',
    itemsCount: 91,
    itemsCount24h: 5,
    itemsCountWeek: 26,
    itemsCountMonth: 81,
    lastFetchedAt: '2026-03-06T09:00:00Z',
    createdAt: '2026-01-10T00:00:00Z',
    // RSS-specific
    rssMode: 'feed_with_article_agent',
    rssArticleConfig: {
      kind: 'rss_article_only',
      version: 2,
      article: {
        titleSelectors: ['h1.article__title', 'meta[property="og:title"]'],
        contentSelectors: ['div.article__body-text', 'section.article-body'],
        dateSelectors: ['time[datetime]', 'meta[property="article:published_time"]'],
        mediaSelectors: ['meta[property="og:image"]', 'figure.article__image img'],
        idSelectors: ['meta[name="article:id"]', 'article[data-post-id]'],
        canonicalSelectors: ['link[rel="canonical"]', 'meta[property="og:url"]'],
      },
      quality: { minContentChars: 500 },
      rssFallbackPolicy: { minFeedContentChars: 700, preferFeedWhenFull: true },
    },
    rssArticleOnboardingStatus: 'done',
    rssArticleOnboardedAt: '2026-01-10T01:30:00Z',
    rssArticleLastOnboardJobId: 'job25-roa',
    etag: '"trmit-etag-20260306"',
    lastModified: 'Thu, 06 Mar 2026 09:00:00 GMT',
    feedTitle: 'MIT Technology Review',
    feedDescription: '',
    lastScanStats: {
      savedFromFeed: 18,
      parsedFromArticle: 6,
      fallbackSavedAsTeaser: 0,
      parseErrors: 1,
      failedUrls: ['https://www.technologyreview.com/2026/3/5/paywalled/exclusive-report'],
      scanJobId: 'job26-rfh',
      scannedAt: '2026-03-06T09:00:00Z',
    },
  },
];

// ──────────────────────────────────────────
// Mock items (raw extracted content)
// ──────────────────────────────────────────
export const mockItems: Item[] = [
  {
    id: 'item1',
    teamId: 'team1',
    sourceId: 'src1',
    sourceName: 'TechCrunch',
    title: 'OpenAI announces GPT-5 with revolutionary capabilities',
    content: 'OpenAI has unveiled GPT-5, featuring enhanced reasoning, multimodal understanding, and significantly reduced hallucinations. The model shows 40% improvement on standard benchmarks compared to GPT-4...',
    mediaUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
    extractedAt: '2026-02-25T08:00:00Z',
    url: 'https://techcrunch.com/2026/02/25/openai-gpt-5/',
    publishedAt: '2026-02-25T07:30:00Z',
    externalId: 'tc-gpt5-2026',
    canonicalUrl: 'https://techcrunch.com/2026/02/25/openai-gpt-5/',
    dedupeKey: 'tc:openai-gpt5-2026',
  },
  {
    id: 'item2',
    teamId: 'team1',
    sourceId: 'src2',
    sourceName: 'Hacker News',
    title: 'Show HN: I built a real-time collaborative code editor',
    content: 'After 6 months of development, I\'m excited to share my side project - a real-time collaborative code editor built with WebRTC and CRDTs for conflict resolution. It handles 100+ simultaneous editors...',
    extractedAt: '2026-02-25T07:45:00Z',
    url: 'https://news.ycombinator.com/item?id=39012345',
    publishedAt: '2026-02-25T07:00:00Z',
    externalId: '39012345',
    canonicalUrl: 'https://collab-editor.dev',
    dedupeKey: 'hn:39012345',
  },
  {
    id: 'item3',
    teamId: 'team1',
    sourceId: 'src3',
    sourceName: 'AI News Channel',
    title: 'Google DeepMind releases Gemini Ultra 2.0',
    content: 'Google DeepMind today released Gemini Ultra 2.0, claiming state-of-the-art performance on reasoning tasks. The model features a 2M context window and native multimodality...',
    extractedAt: '2026-02-25T08:15:00Z',
  },
  {
    id: 'item4',
    teamId: 'team1',
    sourceId: 'src1',
    sourceName: 'TechCrunch',
    title: 'Anthropic raises $2B at $60B valuation',
    content: 'Anthropic, the AI safety company behind Claude, has secured $2 billion in new funding at a $60 billion valuation. The round was led by Google and a consortium of tech investors...',
    extractedAt: '2026-02-25T06:30:00Z',
  },
  {
    id: 'item5',
    teamId: 'team1',
    sourceId: 'src2',
    sourceName: 'Hacker News',
    title: 'Ask HN: What\'s your preferred stack for building AI agents in 2026?',
    content: 'I\'ve been building AI agents for the past year and I\'m curious what stacks others are using. Currently using LangGraph + FastAPI + Redis for state management. Thoughts?...',
    extractedAt: '2026-02-25T05:00:00Z',
  },
  {
    id: 'item6',
    teamId: 'team1',
    sourceId: 'src3',
    sourceName: 'AI News Channel',
    title: 'Meta releases Llama 4 with 70B and 400B parameter variants',
    content: 'Meta AI has open-sourced Llama 4 in two sizes: 70B for consumer hardware and 400B for enterprise deployments. Both models include native tool calling and 128K context window...',
    extractedAt: '2026-02-24T20:00:00Z',
  },
  {
    id: 'item7',
    teamId: 'team1',
    sourceId: 'src1',
    sourceName: 'TechCrunch',
    title: 'Microsoft announces Copilot+ integration across all Office apps',
    content: 'Microsoft is rolling out deep Copilot+ AI integration into Word, Excel, PowerPoint and Outlook. The update brings real-time suggestions, document summarization and cross-app AI automation to 400M+ users...',
    extractedAt: '2026-02-24T14:00:00Z',
  },
  // ── Новые материалы (часть неопубликована) ──
  {
    id: 'item8',
    teamId: 'team1',
    sourceId: 'src1',
    sourceName: 'TechCrunch',
    title: 'Apple Vision Pro 2 leaked specs reveal 8K displays and M4 chip',
    content: 'Insider sources have shared leaked specifications for the upcoming Apple Vision Pro 2. The new model is expected to feature dual 8K micro-OLED displays, the M4 chip, and a redesigned lighter frame. Battery life improvements are also anticipated with a new external battery pack design...',
    mediaUrl: 'https://images.unsplash.com/photo-1617469767053-d3b523a0b982?w=800',
    extractedAt: '2026-02-25T10:30:00Z',
  },
  {
    id: 'item9',
    teamId: 'team1',
    sourceId: 'src2',
    sourceName: 'Hacker News',
    title: "Show HN: SQLite as the only database you'll ever need for 95% of projects",
    content: 'A deep dive into why SQLite with WAL mode and proper indexing outperforms PostgreSQL for most web apps under 10k concurrent users. Benchmarks included, along with a guide to running SQLite in production on Fly.io and Railway...',
    extractedAt: '2026-02-25T10:00:00Z',
  },
  {
    id: 'item10',
    teamId: 'team1',
    sourceId: 'src3',
    sourceName: 'AI News Channel',
    title: 'xAI releases Grok 3 with real-time internet access and 256K context',
    content: 'Elon Musk\'s xAI has launched Grok 3, featuring real-time internet browsing, 256K context window and a new reasoning mode called "DeepThink". The model is available to Premium+ subscribers on X platform. Early benchmarks show competitive results against GPT-4o and Claude 3.5...',
    mediaUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800',
    extractedAt: '2026-02-25T09:45:00Z',
  },
  {
    id: 'item11',
    teamId: 'team1',
    sourceId: 'src1',
    sourceName: 'TechCrunch',
    title: 'NVIDIA unveils Blackwell B300 GPU with 288GB HBM3e memory',
    content: 'NVIDIA has officially announced the Blackwell B300 GPU targeting AI inference workloads. The card features 288GB of HBM3e memory, 20 petaflops of FP8 compute, and a new NVLink 5.0 interconnect. Cloud providers AWS, Azure and GCP have already committed to deployments in Q3 2026...',
    extractedAt: '2026-02-25T07:15:00Z',
  },
  {
    id: 'item12',
    teamId: 'team1',
    sourceId: 'src2',
    sourceName: 'Hacker News',
    title: 'React 20 alpha: server components by default, no more client boundary',
    content: 'The React team published the alpha release of React 20. The biggest change is that all components are now server components by default. Client components require explicit "use client" directive. The update also ships a new concurrent scheduler and native transitions API without wrapping in startTransition...',
    extractedAt: '2026-02-25T06:00:00Z',
  },
  {
    id: 'item13',
    teamId: 'team1',
    sourceId: 'src3',
    sourceName: 'AI News Channel',
    title: 'Mistral releases Mistral Large 3 beating GPT-4o on coding benchmarks',
    content: 'French AI startup Mistral AI has released Mistral Large 3, claiming state-of-the-art performance on HumanEval and SWE-bench coding benchmarks. The model features a 128K context window, is available via API and as a self-hosted option. Pricing is 30% lower than GPT-4o...',
    extractedAt: '2026-02-24T22:00:00Z',
  },
  {
    id: 'item14',
    teamId: 'team1',
    sourceId: 'src1',
    sourceName: 'TechCrunch',
    title: 'Tesla FSD 13.2 achieves Level 3 autonomy certification in California',
    content: 'Tesla has received Level 3 autonomous driving certification from the California DMV for its Full Self-Driving 13.2 software. The certification allows Tesla vehicles to operate without driver supervision on specific highway segments at speeds up to 65 mph. This marks a regulatory milestone for consumer autonomous vehicles...',
    mediaUrl: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800',
    extractedAt: '2026-02-24T18:30:00Z',
  },
  {
    id: 'item15',
    teamId: 'team1',
    sourceId: 'src2',
    sourceName: 'Hacker News',
    title: 'Ask HN: How are you handling LLM costs at scale in production?',
    content: "We're spending $40k/month on LLM API calls. Looking for strategies others use in production. Caching, prompt compression, routing to smaller models — what actually works? Share your numbers if you can...",
    extractedAt: '2026-02-24T16:00:00Z',
  },
  {
    id: 'item16',
    teamId: 'team1',
    sourceId: 'src3',
    sourceName: 'AI News Channel',
    title: 'Perplexity AI raises $500M Series D at $9B valuation from SoftBank',
    content: 'Perplexity AI has closed a $500 million Series D funding round led by SoftBank, valuing the company at $9 billion. The search AI startup reports 15 million daily active users and plans to expand into enterprise with a dedicated Perplexity for Business product launching in Q2 2026...',
    extractedAt: '2026-02-24T12:00:00Z',
  },
  {
    id: 'item17',
    teamId: 'team1',
    sourceId: 'src1',
    sourceName: 'TechCrunch',
    title: 'Apple M4 Ultra breaks records in Geekbench with 32-core CPU',
    content: "Apple's M4 Ultra chip has appeared in Geekbench leaks with an unprecedented 32-core CPU configuration and 192GB unified memory. The chip shows a 45% multi-core improvement over M3 Ultra and will power the upcoming Mac Pro refresh expected at WWDC 2026...",
    extractedAt: '2026-02-24T10:00:00Z',
  },
  {
    id: 'item18',
    teamId: 'team1',
    sourceId: 'src2',
    sourceName: 'Hacker News',
    title: 'Go 2.0 proposal: generics improvements, error handling overhaul',
    content: "The Go team has published a detailed proposal for Go 2.0, addressing long-standing community requests: improved generics with type constraints, a new error handling mechanism inspired by Rust's Result type, and built-in coroutines. Public comment period runs through March 2026...",
    extractedAt: '2026-02-24T08:00:00Z',
  },
  {
    id: 'item19',
    teamId: 'team1',
    sourceId: 'src3',
    sourceName: 'AI News Channel',
    title: 'Amazon Bedrock adds Claude 3.7 Sonnet with extended thinking mode',
    content: 'AWS has added Claude 3.7 Sonnet to Amazon Bedrock, including access to the extended thinking mode that allows the model to reason through complex problems step-by-step. The integration includes native support for Bedrock Agents and Knowledge Bases. Free trial tokens available to existing Bedrock customers...',
    extractedAt: '2026-02-23T20:00:00Z',
  },
  {
    id: 'item20',
    teamId: 'team1',
    sourceId: 'src1',
    sourceName: 'TechCrunch',
    title: 'EU AI Act enforcement begins: first fines issued to high-risk AI deployments',
    content: 'The European AI Office has issued its first enforcement actions under the EU AI Act, targeting three unnamed companies deploying high-risk AI systems without proper conformity assessments. Fines range from 500,000 to 2 million euros. The enforcement wave is expected to accelerate through 2026...',
    mediaUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800',
    extractedAt: '2026-02-23T15:00:00Z',
  },
  {
    id: 'item21',
    teamId: 'team1',
    sourceId: 'src2',
    sourceName: 'Hacker News',
    title: 'I replaced my entire backend with Cloudflare Workers and saved $3k/month',
    content: 'After migrating from a traditional Node.js + PostgreSQL stack to Cloudflare Workers + D1 + R2, our startup reduced infra costs from $3,500/month to under $200/month. Latency improved by 60% globally. The trade-offs and migration story are documented here...',
    extractedAt: '2026-02-23T11:00:00Z',
  },
  {
    id: 'item22',
    teamId: 'team1',
    sourceId: 'src3',
    sourceName: 'AI News Channel',
    title: 'Runway Gen-4 video model generates 4K 60fps video from single image',
    content: 'Runway has released Gen-4, their latest AI video generation model. The model can produce 4K resolution, 60fps video clips up to 60 seconds long from a single reference image. New motion controls allow precise camera path definition. Currently available via API for enterprise customers...',
    extractedAt: '2026-02-23T09:00:00Z',
  },
  // ── team2 items ──
  {
    id: 'item-mk1',
    teamId: 'team2',
    sourceId: 'src10',
    sourceName: 'Marketing Week',
    title: 'Marketing automation trends 2026: AI takes over repetitive campaigns',
    content: 'New research from Marketing Week shows 73% of enterprise marketing teams now use AI automation for email campaigns, social scheduling, and ad copy generation. The ROI is significant: teams report 40% time savings and 22% improvement in conversion rates. The key is human oversight at campaign strategy level...',
    mediaUrl: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=800',
    extractedAt: '2026-02-25T10:00:00Z',
  },
  {
    id: 'item-mk2',
    teamId: 'team2',
    sourceId: 'src10',
    sourceName: 'Marketing Week',
    title: 'B2B lead generation: LinkedIn outperforms all other channels in 2026',
    content: 'A comprehensive study of 500 B2B companies reveals LinkedIn generated 80% of their social media leads. The new AI-powered targeting features, including intent signals and predictive audiences, have improved cost-per-lead by 35% year-over-year. TikTok and YouTube are emerging as secondary B2B channels...',
    extractedAt: '2026-02-24T14:00:00Z',
  },
  {
    id: 'item-mk3',
    teamId: 'team2',
    sourceId: 'src10',
    sourceName: 'Marketing Week',
    title: 'The death of third-party cookies: what marketers need to do now',
    content: "With Google's final deprecation of third-party cookies in Chrome by Q3 2026, marketers must act now. First-party data collection, contextual advertising, and cohort-based targeting are the three pillars of the post-cookie strategy. Companies that delay face 40-60% drop in retargeting effectiveness...",
    extractedAt: '2026-02-23T12:00:00Z',
  },
];

// ──────────────────────────────────────────
// Mock posted items
// ──────────────────────────────────────────
export const mockPostedItems: PostedItem[] = [
  {
    id: 'pi1',
    teamId: 'team1',
    channelId: 'ch1',
    channelName: 'Tech Daily',
    itemId: 'item1',
    itemTitle: 'OpenAI announces GPT-5 with revolutionary capabilities',
    sourceId: 'src1',
    sourceName: 'TechCrunch',
    jobId: 'job1',
    generatedContent: '🚀 Breaking: OpenAI just dropped GPT-5 and it\'s a game-changer!\n\nThe latest AI model brings revolutionary improvements in reasoning, multimodal understanding, and significantly reduced hallucinations. Benchmarks show 40% better results than GPT-4.\n\n#AI #GPT5 #OpenAI #TechNews',
    postedAt: '2026-02-25T09:00:07Z',
    status: 'success',
    llmTraceId: 'llm1',
    telegramMessageId: 1042,
    views: 150,
    reactions: 20,
    mediaUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
  },
  {
    id: 'pi2',
    teamId: 'team1',
    channelId: 'ch2',
    channelName: 'AI Updates',
    itemId: 'item3',
    itemTitle: 'Google DeepMind releases Gemini Ultra 2.0',
    sourceId: 'src3',
    sourceName: 'AI News Channel',
    jobId: 'job4',
    generatedContent: '🤖 Google DeepMind выпустила Gemini Ultra 2.0 — новый флагман в мире AI.\n\nКлючевые характеристики:\n• 2M токенов контекстного окна\n• Нативная мультимодальность\n• SOTA на задачах рассуждения\n\nЭто меняет расклад для корпоративных AI-решений.',
    postedAt: '2026-02-25T08:30:00Z',
    status: 'success',
    llmTraceId: 'llm2',
    telegramMessageId: 587,
    views: 120,
    reactions: 15,
  },
  {
    id: 'pi3',
    teamId: 'team1',
    channelId: 'ch1',
    channelName: 'Tech Daily',
    itemId: 'item4',
    itemTitle: 'Anthropic raises $2B at $60B valuation',
    sourceId: 'src1',
    sourceName: 'TechCrunch',
    jobId: 'job5',
    generatedContent: '💰 Anthropic привлёк $2 млрд при оценке $60 млрд!\n\nGoogle ведёт раунд. Деньги пойдут на масштабирование Claude и исследования AI-безопасности. Рынок AI продолжает разогреваться.\n\n#Anthropic #Claude #AIInvestment',
    postedAt: '2026-02-25T06:45:00Z',
    status: 'success',
    llmTraceId: 'llm3',
    telegramMessageId: 1043,
    views: 100,
    reactions: 10,
  },
  {
    id: 'pi4',
    teamId: 'team1',
    channelId: 'ch2',
    channelName: 'AI Updates',
    itemId: 'item6',
    itemTitle: 'Meta releases Llama 4 with 70B and 400B parameter variants',
    sourceId: 'src3',
    sourceName: 'AI News Channel',
    jobId: 'job6',
    generatedContent: '🦙 Llama 4 вышел в открытый доступ!\n\nMeta открывает две версии:\n→ 70B — для запуска на потребительском железе\n→ 400B — для enterprise\n\nОба варианта: нативный tool calling + 128K контекст. Open-source AI ускоряется.',
    postedAt: '2026-02-24T21:00:00Z',
    status: 'success',
    llmTraceId: 'llm2',
    telegramMessageId: 588,
    views: 80,
    reactions: 5,
  },
  {
    id: 'pi5',
    teamId: 'team1',
    channelId: 'ch1',
    channelName: 'Tech Daily',
    itemId: 'item2',
    itemTitle: 'Show HN: I built a real-time collaborative code editor',
    sourceId: 'src2',
    sourceName: 'Hacker News',
    jobId: 'job7',
    generatedContent: '⚡ Разработчик-одиночка запустил редактор кода с совместной работой в реальном времени!\n\nПостроен на WebRTC + CRDT. Держит 100+ одновременных редакторов без конфликтов. Open source.\n\n#OpenSource #DevTools #WebRTC',
    postedAt: '2026-02-24T15:00:00Z',
    status: 'success',
    telegramMessageId: 1040,
    views: 60,
    reactions: 3,
  },
  {
    id: 'pi6',
    teamId: 'team1',
    channelId: 'ch1',
    channelName: 'Tech Daily',
    itemId: 'item7',
    itemTitle: 'Microsoft announces Copilot+ integration across all Office apps',
    sourceId: 'src1',
    sourceName: 'TechCrunch',
    jobId: 'job5',
    generatedContent: '💼 Microsoft запускает Copilot+ во всех приложениях Office!\n\nWord, Excel, PowerPoint и Outlook олучают глубокую AI-интеграцию: умные подсказки, саммаризация документов и автоматизация между приложениями.\n\n400 млн пользователей. Уже сейчас.\n\n#Microsoft #Copilot #AI #Productivity',
    postedAt: '2026-02-24T14:30:00Z',
    status: 'success',
    llmTraceId: 'llm3',
    telegramMessageId: 1039,
    views: 70,
    reactions: 4,
  },
  {
    id: 'pi7',
    teamId: 'team1',
    channelId: 'ch2',
    channelName: 'AI Updates',
    itemId: 'item7',
    itemTitle: 'Microsoft announces Copilot+ integration across all Office apps',
    sourceId: 'src1',
    sourceName: 'TechCrunch',
    jobId: 'job4',
    generatedContent: '🧠 Microsoft Copilot+ теперь везде в Office.\n\nДля tech-специалистов: речь идёт о нативной AI-автоматизации прямо в рабочих инструментах. Real-time suggestions, cross-app workflows, document summarization — без дополнительных плагинов.\n\nПрактический импакт для enterprise уже в Q1 2026.',
    postedAt: '2026-02-24T14:35:00Z',
    status: 'success',
    llmTraceId: 'llm2',
    telegramMessageId: 589,
    views: 50,
    reactions: 2,
  },
  {
    id: 'pi8',
    teamId: 'team1',
    channelId: 'ch1',
    channelName: 'Tech Daily',
    itemId: 'item5',
    itemTitle: 'Ask HN: What\'s your preferred stack for building AI agents in 2026?',
    sourceId: 'src2',
    sourceName: 'Hacker News',
    jobId: 'job7',
    generatedContent: '🤔 Какой стек выбрать для AI-агентов в 2026?\n\nHacker News обсуждает: LangGraph, AutoGen, или чистый Python? Большинство склоняется к гибридному подходу — LLM-оркестратор + FastAPI + Redis.\n\n#AIAgents #Dev #HackerNews',
    postedAt: '2026-02-23T18:00:00Z',
    status: 'success',
    llmTraceId: 'llm1',
    telegramMessageId: 1038,
    views: 43,
    reactions: 7,
  },
  {
    id: 'pi9',
    teamId: 'team1',
    channelId: 'ch1',
    channelName: 'Tech Daily',
    itemId: 'item3',
    itemTitle: 'Google DeepMind releases Gemini Ultra 2.0',
    sourceId: 'src3',
    sourceName: 'AI News Channel',
    jobId: 'job4',
    generatedContent: '🌐 Google DeepMind показала Gemini Ultra 2.0.\n\nСамая большая языковая модель от Google с 2M-токенным контекстом. Что это значит на практике? Целая кодовая база в одном промпте.\n\n#Google #Gemini #AI',
    postedAt: '2026-02-23T12:00:00Z',
    status: 'failed',
    views: 0,
    reactions: 0,
  },
  {
    id: 'pi10',
    teamId: 'team1',
    channelId: 'ch1',
    channelName: 'Tech Daily',
    itemId: 'item1',
    itemTitle: 'OpenAI announces GPT-5 with revolutionary capabilities',
    sourceId: 'src1',
    sourceName: 'TechCrunch',
    jobId: 'job1',
    generatedContent: '⚙️ Технический разбор GPT-5 от OpenAI.\n\nПод капотом: mixture-of-experts архитектура, улучшенный RLHF и новый подход к tool calling. Разработчики уже тестируют API.\n\n#GPT5 #OpenAI #API #Tech',
    postedAt: '2026-02-22T21:00:00Z',
    status: 'success',
    llmTraceId: 'llm3',
    telegramMessageId: 1037,
    views: 95,
    reactions: 18,
    mediaUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
  },
  {
    id: 'pi11',
    teamId: 'team1',
    channelId: 'ch1',
    channelName: 'Tech Daily',
    itemId: 'item4',
    itemTitle: 'Anthropic raises $2B at $60B valuation',
    sourceId: 'src1',
    sourceName: 'TechCrunch',
    jobId: 'job5',
    generatedContent: '📊 Раунд Anthropic: что стоит за цифрами.\n\n$60B оценка — это уже не стартап. Claude 3.5 занял 38% enterprise AI-рынка. Инвесторы ставят на безопасный AI как долгосрочное преимущество.\n\n#Anthropic #Startup #AI',
    postedAt: '2026-02-22T09:00:00Z',
    status: 'success',
    llmTraceId: 'llm2',
    telegramMessageId: 586,
    views: 88,
    reactions: 12,
  },
  // ── Новые публикации для новых items ──
  {
    id: 'pi12',
    teamId: 'team1',
    channelId: 'ch1',
    channelName: 'Tech Daily',
    itemId: 'item11',
    itemTitle: 'NVIDIA unveils Blackwell B300 GPU with 288GB HBM3e memory',
    sourceId: 'src1',
    sourceName: 'TechCrunch',
    jobId: 'job9',
    generatedContent: '🖥️ NVIDIA Blackwell B300 — монстр для AI-инференса!\n\n288 ГБ памяти HBM3e, 20 петафлопс FP8-вычислений и NVLink 5.0. AWS, Azure и GCP уже забронировали слоты на Q3 2026.\n\nАпгрейд датацентров начался.\n\n#NVIDIA #GPU #AI #Blackwell',
    postedAt: '2026-02-25T09:30:00Z',
    status: 'success',
    llmTraceId: 'llm4',
    telegramMessageId: 1044,
    views: 210,
    reactions: 34,
  },
  {
    id: 'pi13',
    teamId: 'team1',
    channelId: 'ch2',
    channelName: 'AI Updates',
    itemId: 'item12',
    itemTitle: 'React 20 alpha: server components by default, no more client boundary',
    sourceId: 'src2',
    sourceName: 'Hacker News',
    jobId: 'job10',
    generatedContent: '⚛️ React 20 Alpha вышел — меняет всё.\n\nСервер-компоненты теперь по умолчанию. Клиент — только по явному "use client". Новый планировщик и нативные транзишены без startTransition.\n\nДля enterprise-разработчиков: пора готовиться к миграции.\n\n#React #Frontend #JavaScript',
    postedAt: '2026-02-25T08:00:00Z',
    status: 'success',
    llmTraceId: 'llm5',
    telegramMessageId: 590,
    views: 175,
    reactions: 28,
  },
  {
    id: 'pi14',
    teamId: 'team1',
    channelId: 'ch1',
    channelName: 'Tech Daily',
    itemId: 'item14',
    itemTitle: 'Tesla FSD 13.2 achieves Level 3 autonomy certification in California',
    sourceId: 'src1',
    sourceName: 'TechCrunch',
    jobId: 'job11',
    generatedContent: '🚗 Tesla FSD 13.2 получил сертификат Level 3 от California DMV!\n\nАвтономное вождение без контроля водителя на шоссе до 105 км/ч — это уже реальность. Первый потребительский продукт с таким допуском в США.\n\n#Tesla #FSD #AutonomousDriving',
    postedAt: '2026-02-24T19:00:00Z',
    status: 'success',
    llmTraceId: 'llm4',
    telegramMessageId: 1041,
    views: 145,
    reactions: 22,
    mediaUrl: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800',
  },
  {
    id: 'pi15',
    teamId: 'team1',
    channelId: 'ch2',
    channelName: 'AI Updates',
    itemId: 'item14',
    itemTitle: 'Tesla FSD 13.2 achieves Level 3 autonomy certification in California',
    sourceId: 'src1',
    sourceName: 'TechCrunch',
    jobId: 'job12',
    generatedContent: '🧠 Регуляторный прорыв для автономного транспорта.\n\nTesla FSD 13.2 — первый сертифицированный Level 3 для массового рынка в Калифорнии. Что это значит для индустрии: давление на Waymo, Aurora и Cruise усилится.',
    postedAt: '2026-02-24T19:05:00Z',
    status: 'failed',
    views: 0,
    reactions: 0,
    mediaUrl: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800',
  },
  {
    id: 'pi16',
    teamId: 'team1',
    channelId: 'ch2',
    channelName: 'AI Updates',
    itemId: 'item16',
    itemTitle: 'Perplexity AI raises $500M Series D at $9B valuation from SoftBank',
    sourceId: 'src3',
    sourceName: 'AI News Channel',
    jobId: 'job13',
    generatedContent: '💰 Perplexity AI — $9 млрд за поиск нового поколения.\n\nSoftBank ведёт раунд $500M Series D. 15 млн DAU и запуск Perplexity for Business в Q2 2026. Поисковый рынок перераспределяется.\n\n#Perplexity #AI #Search #Startup',
    postedAt: '2026-02-24T13:00:00Z',
    status: 'success',
    llmTraceId: 'llm5',
    telegramMessageId: 591,
    views: 130,
    reactions: 19,
  },
  {
    id: 'pi17',
    teamId: 'team1',
    channelId: 'ch1',
    channelName: 'Tech Daily',
    itemId: 'item19',
    itemTitle: 'Amazon Bedrock adds Claude 3.7 Sonnet with extended thinking mode',
    sourceId: 'src3',
    sourceName: 'AI News Channel',
    jobId: 'job14',
    generatedContent: '☁️ AWS Bedrock + Claude 3.7 Sonnet — уже доступно!\n\nExtended Thinking Mode позволяет модели рассуждать пошагово. Нативная интеграция с Bedrock Agents и Knowledge Bases. Бесплатные токены для существующих клиентов.\n\n#AWS #Claude #Anthropic #Cloud',
    postedAt: '2026-02-23T21:00:00Z',
    status: 'success',
    llmTraceId: 'llm6',
    telegramMessageId: 1045,
    views: 98,
    reactions: 14,
  },
  {
    id: 'pi18',
    teamId: 'team1',
    channelId: 'ch1',
    channelName: 'Tech Daily',
    itemId: 'item20',
    itemTitle: 'EU AI Act enforcement begins: first fines issued to high-risk AI deployments',
    sourceId: 'src1',
    sourceName: 'TechCrunch',
    jobId: 'job15',
    generatedContent: '⚖️ Регулятор заработал: первые штрафы по EU AI Act!\n\nЕвропейский офис по AI выписал три первых штрафа за развёртывание высокорисковых AI-систем без оценки соответствия. До 2 млн евро за нарушение.\n\nКомпаниям в EU — время аудировать AI-продукты.\n\n#EUAIAct #AIRegulation #Compliance',
    postedAt: '2026-02-23T16:00:00Z',
    status: 'success',
    llmTraceId: 'llm4',
    views: 112,
    reactions: 16,
    mediaUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800',
  },
  {
    id: 'pi19',
    teamId: 'team1',
    channelId: 'ch2',
    channelName: 'AI Updates',
    itemId: 'item22',
    itemTitle: 'Runway Gen-4 video model generates 4K 60fps video from single image',
    sourceId: 'src3',
    sourceName: 'AI News Channel',
    jobId: 'job16',
    generatedContent: '🎬 Runway Gen-4: AI-видео 4K 60fps из одной фотографии.\n\nДо 60 секунд видео, точное управление движением камеры. Enterprise API уже открыт.\n\nГраница между AI-контентом и реальностью стирается быстрее, чем мы думали.\n\n#Runway #AIVideo #GenAI',
    postedAt: '2026-02-23T10:00:00Z',
    status: 'success',
    llmTraceId: 'llm6',
    views: 87,
    reactions: 11,
  },
  // ── team2 публикации ──
  {
    id: 'pi20',
    teamId: 'team2',
    channelId: 'ch4',
    channelName: 'Marketing Pro',
    itemId: 'item-mk1',
    itemTitle: 'Marketing automation trends 2026: AI takes over repetitive campaigns',
    sourceId: 'src10',
    sourceName: 'Marketing Week',
    jobId: 'job8',
    generatedContent: '🤖 AI забирает рутину маркетологов — и это хорошо.\n\n73% enterprise-команд уже используют AI-автоматизацию. Экономия: 40% времени, рост конверсий на 22%.\n\nГлавное — оставить стратегию за людьми.\n\n#Marketing #AI #Automation',
    postedAt: '2026-02-25T10:00:04Z',
    status: 'failed',
    views: 0,
    reactions: 0,
    mediaUrl: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=800',
  },
  {
    id: 'pi21',
    teamId: 'team2',
    channelId: 'ch4',
    channelName: 'Marketing Pro',
    itemId: 'item-mk3',
    itemTitle: 'The death of third-party cookies: what marketers need to do now',
    sourceId: 'src10',
    sourceName: 'Marketing Week',
    jobId: 'job20',
    generatedContent: '🍪 Конец эпохи сторонних cookie — дедлайн Q3 2026.\n\nGoogle окончательно убивает third-party cookies в Chrome. Three pillars стратегии: first-party data, контекстная реклама, cohort targeting.\n\nКто не начнёт готовиться сейчас — потеряет 40-60% ретаргетинга.\n\n#Marketing #Cookies #DataStrategy',
    postedAt: '2026-02-23T14:00:00Z',
    status: 'success',
    llmTraceId: 'llm7',
    views: 63,
    reactions: 8,
  },
];

// ──────────────────────────────────────────
// Mock jobs
// ──────────────────────────────────────────
export const mockJobs: Job[] = [
  {
    id: 'job1',
    teamId: 'team1',
    type: 'publish_to_channel',
    status: 'success',
    progress: 100,
    params: { channelId: 'ch1', itemId: 'item1' },
    result: { messageId: '12345', publishedAt: '2026-02-25T09:00:07Z' },
    logs: [
      '[09:00:01] Starting publish job for channel @tech_daily_news',
      '[09:00:02] Loading item item1 from TechCrunch',
      '[09:00:03] Generating content with LLM (gpt-4-turbo)',
      '[09:00:05] LLM response received: 380 tokens',
      '[09:00:06] Content approved, publishing to Telegram',
      '[09:00:07] ✅ Success: Message ID 12345',
    ],
    createdAt: '2026-02-25T09:00:00Z',
    completedAt: '2026-02-25T09:00:07Z',
    llmTraceIds: ['llm1'],
  },
  {
    id: 'job2',
    teamId: 'team1',
    type: 'fetch_rss',
    status: 'running',
    progress: 65,
    params: { sourceId: 'src1', sourceName: 'TechCrunch' },
    logs: [
      '[08:00:00] Fetching RSS feed from TechCrunch',
      '[08:00:01] Retrieved 25 items from feed',
      '[08:00:02] Processing items, checking for already saved content...',
      '[08:00:03] 8 new items saved',
      '[08:00:04] Processing item 16/25',
    ],
    createdAt: '2026-02-25T08:00:00Z',
    llmTraceIds: [],
  },
  {
    id: 'job3',
    teamId: 'team1',
    type: 'onboard_website',
    status: 'failed',
    progress: 45,
    params: { sourceId: 'src4', url: 'https://openai.com/blog' },
    error: 'Connection timeout after 3 retries',
    logs: [
      '[10:00:00] Starting website onboarding for openai.com/blog',
      '[10:00:01] Analyzing site structure...',
      '[10:00:02] Attempt 1: Connection timeout (30s)',
      '[10:00:32] Attempt 2: Connection timeout (30s)',
      '[10:01:02] Attempt 3: Connection timeout (30s)',
      '[10:01:32] ❌ Job failed: max retries exceeded',
    ],
    createdAt: '2026-02-24T10:00:00Z',
    completedAt: '2026-02-24T10:01:32Z',
    llmTraceIds: [],
  },
  {
    id: 'job4',
    teamId: 'team1',
    type: 'publish_to_channel',
    status: 'success',
    progress: 100,
    params: { channelId: 'ch2', itemId: 'item3' },
    result: { messageId: '12340', publishedAt: '2026-02-25T08:30:00Z' },
    logs: [
      '[08:30:00] Starting publish job for channel @ai_updates_channel',
      '[08:30:01] Loading item item3 from AI News Channel',
      '[08:30:02] Generating content with LLM (gpt-4-turbo)',
      '[08:30:04] LLM response received: 220 tokens',
      '[08:30:05] ✅ Success: Message ID 12340',
    ],
    createdAt: '2026-02-25T08:30:00Z',
    completedAt: '2026-02-25T08:30:05Z',
    llmTraceIds: ['llm2'],
  },
  {
    id: 'job5',
    teamId: 'team1',
    type: 'publish_to_channel',
    status: 'success',
    progress: 100,
    params: { channelId: 'ch1', itemId: 'item4' },
    result: { messageId: '12330', publishedAt: '2026-02-25T06:45:00Z' },
    logs: [
      '[06:45:00] Starting publish job for channel @tech_daily_news',
      '[06:45:01] Loading item item4 from TechCrunch',
      '[06:45:02] Generating content with LLM (gpt-4-turbo)',
      '[06:45:04] ✅ Success: Message ID 12330',
    ],
    createdAt: '2026-02-25T06:45:00Z',
    completedAt: '2026-02-25T06:45:04Z',
    llmTraceIds: ['llm3'],
  },
  {
    id: 'job6',
    teamId: 'team1',
    type: 'fetch_telegram',
    status: 'success',
    progress: 100,
    params: { sourceId: 'src3', sourceName: 'AI News Channel' },
    result: { newItemsCount: 3 },
    logs: [
      '[20:00:00] Fetching messages from t.me/ai_news_official',
      '[20:00:01] Retrieved 15 new messages',
      '[20:00:02] 3 new items saved',
      '[20:00:03] ✅ Done',
    ],
    createdAt: '2026-02-24T20:00:00Z',
    completedAt: '2026-02-24T20:00:03Z',
    llmTraceIds: [],
  },
  {
    id: 'job7',
    teamId: 'team1',
    type: 'publish_to_channel',
    status: 'success',
    progress: 100,
    params: { channelId: 'ch1', itemId: 'item2' },
    result: { messageId: '12320', publishedAt: '2026-02-24T15:00:00Z' },
    logs: [
      '[15:00:00] Starting publish job',
      '[15:00:02] ✅ Success: Message ID 12320',
    ],
    createdAt: '2026-02-24T15:00:00Z',
    completedAt: '2026-02-24T15:00:02Z',
    llmTraceIds: [],
  },
  {
    id: 'job8',
    teamId: 'team2',
    type: 'publish_to_channel',
    status: 'failed',
    progress: 80,
    params: { channelId: 'ch4', itemId: 'item-mk1' },
    error: 'Bot was kicked from channel @marketing_main',
    logs: [
      '[10:00:00] Starting publish job for @marketing_main',
      '[10:00:01] Generating content with LLM',
      '[10:00:03] Content ready',
      '[10:00:04] ❌ Telegram error: bot not a member of the channel',
    ],
    createdAt: '2026-02-25T10:00:00Z',
    completedAt: '2026-02-25T10:00:04Z',
    llmTraceIds: [],
  },
  // ── Новые задачи ──
  {
    id: 'job9',
    teamId: 'team1',
    type: 'publish_to_channel',
    status: 'success',
    progress: 100,
    params: { channelId: 'ch1', itemId: 'item11' },
    result: { messageId: '12360', publishedAt: '2026-02-25T09:30:00Z' },
    logs: [
      '[09:30:00] Starting publish job for channel @tech_daily_news',
      '[09:30:01] Loading item item11 from TechCrunch',
      '[09:30:02] Generating content with LLM (gpt-4-turbo)',
      '[09:30:04] LLM response received: 312 tokens',
      '[09:30:05] Content approved, publishing to Telegram',
      '[09:30:06] ✅ Success: Message ID 12360',
    ],
    createdAt: '2026-02-25T09:30:00Z',
    completedAt: '2026-02-25T09:30:06Z',
    llmTraceIds: ['llm4'],
  },
  {
    id: 'job10',
    teamId: 'team1',
    type: 'publish_to_channel',
    status: 'success',
    progress: 100,
    params: { channelId: 'ch2', itemId: 'item12' },
    result: { messageId: '12355', publishedAt: '2026-02-25T08:00:00Z' },
    logs: [
      '[08:00:00] Starting publish job for channel @ai_updates_channel',
      '[08:00:01] Loading item item12 from Hacker News',
      '[08:00:03] Generating content with LLM (gpt-4-turbo)',
      '[08:00:05] LLM response received: 265 tokens',
      '[08:00:06] ✅ Success: Message ID 12355',
    ],
    createdAt: '2026-02-25T08:00:00Z',
    completedAt: '2026-02-25T08:00:06Z',
    llmTraceIds: ['llm5'],
  },
  {
    id: 'job11',
    teamId: 'team1',
    type: 'publish_to_channel',
    status: 'success',
    progress: 100,
    params: { channelId: 'ch1', itemId: 'item14' },
    result: { messageId: '12348', publishedAt: '2026-02-24T19:00:00Z' },
    logs: [
      '[19:00:00] Starting publish job for channel @tech_daily_news',
      '[19:00:01] Loading item item14 from TechCrunch',
      '[19:00:03] Generating content with LLM (gpt-4-turbo)',
      '[19:00:05] LLM response received: 290 tokens',
      '[19:00:06] ✅ Success: Message ID 12348',
    ],
    createdAt: '2026-02-24T19:00:00Z',
    completedAt: '2026-02-24T19:00:06Z',
    llmTraceIds: ['llm4'],
  },
  {
    id: 'job12',
    teamId: 'team1',
    type: 'publish_to_channel',
    status: 'failed',
    progress: 75,
    params: { channelId: 'ch2', itemId: 'item14' },
    error: 'Channel ch2 rate limit: too many messages in 24h window',
    logs: [
      '[19:05:00] Starting publish job for channel @ai_updates_channel',
      '[19:05:01] Loading item item14 from TechCrunch',
      '[19:05:02] Generating content with LLM (gpt-4-turbo)',
      '[19:05:04] LLM response received: 198 tokens',
      '[19:05:05] ❌ Telegram error: flood control exceeded, retry after 3600 seconds',
    ],
    createdAt: '2026-02-24T19:05:00Z',
    completedAt: '2026-02-24T19:05:05Z',
    llmTraceIds: [],
  },
  {
    id: 'job13',
    teamId: 'team1',
    type: 'publish_to_channel',
    status: 'success',
    progress: 100,
    params: { channelId: 'ch2', itemId: 'item16' },
    result: { messageId: '12340', publishedAt: '2026-02-24T13:00:00Z' },
    logs: [
      '[13:00:00] Starting publish job for channel @ai_updates_channel',
      '[13:00:01] Loading item item16 from AI News Channel',
      '[13:00:03] Generating content with LLM (gpt-4-turbo)',
      '[13:00:05] LLM response received: 245 tokens',
      '[13:00:06] ✅ Success: Message ID 12340',
    ],
    createdAt: '2026-02-24T13:00:00Z',
    completedAt: '2026-02-24T13:00:06Z',
    llmTraceIds: ['llm5'],
  },
  {
    id: 'job14',
    teamId: 'team1',
    type: 'publish_to_channel',
    status: 'success',
    progress: 100,
    params: { channelId: 'ch1', itemId: 'item19' },
    result: { messageId: '12330', publishedAt: '2026-02-23T21:00:00Z' },
    logs: [
      '[21:00:00] Starting publish job for channel @tech_daily_news',
      '[21:00:01] Loading item item19 from AI News Channel',
      '[21:00:02] Generating content with LLM (gpt-4-turbo)',
      '[21:00:04] LLM response received: 277 tokens',
      '[21:00:05] ✅ Success: Message ID 12330',
    ],
    createdAt: '2026-02-23T21:00:00Z',
    completedAt: '2026-02-23T21:00:05Z',
    llmTraceIds: ['llm6'],
  },
  {
    id: 'job15',
    teamId: 'team1',
    type: 'publish_to_channel',
    status: 'success',
    progress: 100,
    params: { channelId: 'ch1', itemId: 'item20' },
    result: { messageId: '12322', publishedAt: '2026-02-23T16:00:00Z' },
    logs: [
      '[16:00:00] Starting publish job for channel @tech_daily_news',
      '[16:00:01] Loading item item20 from TechCrunch',
      '[16:00:02] Generating content with LLM (gpt-4-turbo)',
      '[16:00:04] LLM response received: 305 tokens',
      '[16:00:05] ✅ Success: Message ID 12322',
    ],
    createdAt: '2026-02-23T16:00:00Z',
    completedAt: '2026-02-23T16:00:05Z',
    llmTraceIds: ['llm4'],
  },
  {
    id: 'job16',
    teamId: 'team1',
    type: 'publish_to_channel',
    status: 'success',
    progress: 100,
    params: { channelId: 'ch2', itemId: 'item22' },
    result: { messageId: '12315', publishedAt: '2026-02-23T10:00:00Z' },
    logs: [
      '[10:00:00] Starting publish job for channel @ai_updates_channel',
      '[10:00:01] Loading item item22 from AI News Channel',
      '[10:00:02] Generating content with LLM (gpt-4-turbo)',
      '[10:00:04] LLM response received: 231 tokens',
      '[10:00:05] ✅ Success: Message ID 12315',
    ],
    createdAt: '2026-02-23T10:00:00Z',
    completedAt: '2026-02-23T10:00:05Z',
    llmTraceIds: ['llm6'],
  },
  {
    id: 'job17',
    teamId: 'team1',
    type: 'fetch_rss',
    status: 'success',
    progress: 100,
    params: { sourceId: 'src1', sourceName: 'TechCrunch' },
    result: { newItemsCount: 5, totalFetched: 30 },
    logs: [
      '[06:00:00] Fetching RSS feed from TechCrunch',
      '[06:00:01] Retrieved 30 items from feed',
      '[06:00:02] Checking for duplicates...',
      '[06:00:03] 5 new items found',
      '[06:00:04] Saving items to database',
      '[06:00:05] ✅ Done: 5 new items saved',
    ],
    createdAt: '2026-02-25T06:00:00Z',
    completedAt: '2026-02-25T06:00:05Z',
    llmTraceIds: [],
  },
  {
    id: 'job18',
    teamId: 'team1',
    type: 'fetch_telegram',
    status: 'success',
    progress: 100,
    params: { sourceId: 'src3', sourceName: 'AI News Channel' },
    result: { newItemsCount: 4 },
    logs: [
      '[07:00:00] Fetching messages from t.me/ai_news_official',
      '[07:00:01] Connecting to Telegram API',
      '[07:00:02] Retrieved 20 recent messages',
      '[07:00:03] 4 new items saved',
      '[07:00:04] ✅ Done',
    ],
    createdAt: '2026-02-25T07:00:00Z',
    completedAt: '2026-02-25T07:00:04Z',
    llmTraceIds: [],
  },
  {
    id: 'job19',
    teamId: 'team1',
    type: 'fetch_rss',
    status: 'running',
    progress: 42,
    params: { sourceId: 'src1', sourceName: 'TechCrunch' },
    logs: [
      '[10:30:00] Fetching RSS feed from TechCrunch',
      '[10:30:01] Retrieved 25 items from feed',
      '[10:30:02] Processing items...',
      '[10:30:03] Processed 10/25 items',
    ],
    createdAt: '2026-02-25T10:30:00Z',
    llmTraceIds: [],
  },
  {
    id: 'job20',
    teamId: 'team2',
    type: 'publish_to_channel',
    status: 'success',
    progress: 100,
    params: { channelId: 'ch4', itemId: 'item-mk3' },
    result: { messageId: '9901', publishedAt: '2026-02-23T14:00:00Z' },
    logs: [
      '[14:00:00] Starting publish job for @marketing_main',
      '[14:00:01] Loading item item-mk3 from Marketing Week',
      '[14:00:02] Generating content with LLM (gpt-4-turbo)',
      '[14:00:04] LLM response received: 258 tokens',
      '[14:00:05] ✅ Success: Message ID 9901',
    ],
    createdAt: '2026-02-23T14:00:00Z',
    completedAt: '2026-02-23T14:00:05Z',
    llmTraceIds: ['llm7'],
  },
  {
    id: 'job21',
    teamId: 'team1',
    type: 'fetch_website',
    status: 'success',
    progress: 100,
    params: { sourceId: 'src2', sourceName: 'Hacker News' },
    result: { newItemsCount: 8, pagesScanned: 3 },
    logs: [
      '[05:00:00] Starting website scraper for news.ycombinator.com',
      '[05:00:01] Fetching page 1/3...',
      '[05:00:03] Page 1 scraped: 15 items found',
      '[05:00:04] Fetching page 2/3...',
      '[05:00:06] Page 2 scraped: 12 items found',
      '[05:00:07] Fetching page 3/3...',
      '[05:00:09] Page 3 scraped: 10 items found',
      '[05:00:10] Deduplication: 8 new items saved',
      '[05:00:11] ✅ Done',
    ],
    createdAt: '2026-02-25T05:00:00Z',
    completedAt: '2026-02-25T05:00:11Z',
    llmTraceIds: [],
  },
  {
    id: 'job22',
    teamId: 'team1',
    type: 'fetch_rss',
    status: 'failed',
    progress: 30,
    params: { sourceId: 'src4', sourceName: 'OpenAI Blog' },
    error: 'Connection timeout after 3 retries',
    logs: [
      '[10:00:00] Fetching RSS feed from openai.com/blog/rss',
      '[10:00:01] Attempt 1: Connection timeout (30s)',
      '[10:00:31] Attempt 2: Connection timeout (30s)',
      '[10:01:01] Attempt 3: Connection timeout (30s)',
      '[10:01:31] ❌ Failed: max retries exceeded',
    ],
    createdAt: '2026-02-25T10:00:00Z',
    completedAt: '2026-02-25T10:01:31Z',
    llmTraceIds: [],
  },
  {
    id: 'job23',
    teamId: 'team1',
    type: 'publish_to_channel',
    status: 'pending',
    progress: 0,
    params: { channelId: 'ch1', itemId: 'item8' },
    logs: [
      '[10:35:00] Job queued, waiting for scheduler',
    ],
    createdAt: '2026-02-25T10:35:00Z',
    llmTraceIds: [],
  },
  {
    id: 'job24',
    teamId: 'team1',
    type: 'publish_to_channel',
    status: 'pending',
    progress: 0,
    params: { channelId: 'ch2', itemId: 'item10' },
    logs: [
      '[10:36:00] Job queued, waiting for scheduler',
    ],
    createdAt: '2026-02-25T10:36:00Z',
    llmTraceIds: [],
  },
  {
    id: 'job25',
    teamId: 'team2',
    type: 'fetch_rss',
    status: 'success',
    progress: 100,
    params: { sourceId: 'src10', sourceName: 'Marketing Week' },
    result: { newItemsCount: 3, totalFetched: 20 },
    logs: [
      '[07:30:00] Fetching RSS feed from marketingweek.com/feed',
      '[07:30:01] Retrieved 20 items from feed',
      '[07:30:02] 3 new items saved',
      '[07:30:03] ✅ Done',
    ],
    createdAt: '2026-02-25T07:30:00Z',
    completedAt: '2026-02-25T07:30:03Z',
    llmTraceIds: [],
  },
  {
    id: 'job26',
    teamId: 'team1',
    type: 'fetch_telegram',
    status: 'failed',
    progress: 20,
    params: { sourceId: 'src3', sourceName: 'AI News Channel' },
    error: 'Rate limit reached, will retry in 15 min',
    logs: [
      '[08:15:00] Fetching messages from t.me/ai_news_official',
      '[08:15:01] Connecting to Telegram API',
      '[08:15:02] ❌ FloodWaitError: Rate limit reached (900s)',
    ],
    createdAt: '2026-02-25T08:15:00Z',
    completedAt: '2026-02-25T08:15:02Z',
    llmTraceIds: [],
  },
  {
    id: 'job27',
    teamId: 'team1',
    type: 'onboard_website',
    status: 'success',
    progress: 100,
    params: { sourceId: 'src2', url: 'https://news.ycombinator.com' },
    result: { itemsFound: 37, structureDetected: 'listing' },
    logs: [
      '[00:00:00] Starting website onboarding for news.ycombinator.com',
      '[00:00:01] Analyzing site structure...',
      '[00:00:03] Structure detected: news listing page',
      '[00:00:04] Extracting selectors for title, URL, date...',
      '[00:00:06] Test scrape: 37 items found',
      '[00:00:08] ✅ Onboarding complete, source configured',
    ],
    createdAt: '2026-02-15T00:00:00Z',
    completedAt: '2026-02-15T00:00:08Z',
    llmTraceIds: ['llm8'],
  },
  // ── Ads campaign jobs ──
  {
    id: 'job28',
    teamId: 'team1',
    type: 'ads_campaign',
    status: 'success',
    progress: 100,
    params: { campaignId: 'ads1', campaignName: 'Новогодняя акция 2026', channelCount: 3 },
    result: { sentCount: 3, failedCount: 0 },
    logs: [
      '[00:00:01] Запуск рассылки кампании «Новогодняя акция 2026»',
      '[00:00:02] Загрузка рекламного поста adp1',
      '[00:00:03] Отправка в @tech_daily_news... ✅ отправлено (msg 4201)',
      '[00:00:04] Отправка в @ai_updates_channel... ✅ отправлено (msg 1502)',
      '[00:00:05] Отправка в @marketing_pro_channel... ✅ отправлено (msg 890)',
      '[00:00:06] ✅ Рассылка завершена: 3/3 отправлено, 0 ошибок',
    ],
    createdAt: '2026-01-01T00:00:00Z',
    completedAt: '2026-01-01T00:00:06Z',
    llmTraceIds: [],
  },
  {
    id: 'job29',
    teamId: 'team1',
    type: 'ads_campaign',
    status: 'success',
    progress: 100,
    params: { campaignId: 'ads4', campaignName: 'Чёрная пятница 2025', channelCount: 3 },
    result: { sentCount: 1, failedCount: 2 },
    logs: [
      '[08:00:01] Запуск рассылки кампании «Чёрная пятница 2025»',
      '[08:00:02] Загрузка рекламного поста adp4',
      '[08:00:03] Отправка в @tech_daily_news... ✅ отправлено (msg 3980)',
      '[08:00:04] Отправка в @ai_updates_channel... �� Таймаут соединения',
      '[08:00:05] Отправка в @marketing_pro_channel... ❌ Бот не является администратором',
      '[08:00:06] ⚠️ Рассылка завершена с ошибками: 1/3 отправлено, 2 ошибки',
    ],
    createdAt: '2025-11-29T08:00:00Z',
    completedAt: '2025-11-29T08:00:06Z',
    llmTraceIds: [],
  },
  {
    id: 'job30',
    teamId: 'team1',
    type: 'ads_campaign',
    status: 'running',
    progress: 25,
    params: { campaignId: 'ads11', campaignName: 'Розыгрыш подписок — март', channelCount: 4 },
    logs: [
      '[17:00:01] Запуск рассылки кампании «Розыгрыш подписок — март»',
      '[17:00:02] Загрузка рекламного поста adp17',
      '[17:00:03] Отправка в @tech_daily_news... ✅ отправлено (msg 4320)',
      '[17:00:04] Отправка в @ai_updates_channel...',
    ],
    createdAt: '2026-03-01T17:00:00Z',
    llmTraceIds: [],
  },
  {
    id: 'job31',
    teamId: 'team1',
    type: 'ads_campaign',
    status: 'success',
    progress: 100,
    params: { campaignId: 'ads9', campaignName: 'Награда TechReview — все каналы', channelCount: 4 },
    result: { sentCount: 3, failedCount: 1 },
    logs: [
      '[11:00:01] Запуск рассылки кампании «Награда TechReview — все каналы»',
      '[11:00:02] Загрузка рекламного поста adp12',
      '[11:00:03] Отправка в @tech_daily_news... ✅ отправлено (msg 4280)',
      '[11:00:04] Отправка в @ai_updates_channel... ✅ отправлено (msg 1530)',
      '[11:00:05] Отправка в @web3_corner... ✅ отправлено (msg 730)',
      '[11:00:06] Отправка в @marketing_pro_channel... ❌ Канал временно недоступен',
      '[11:00:07] ⚠️ Рассылка завершена с ошибками: 3/4 отправлено, 1 ошибка',
    ],
    createdAt: '2026-01-20T11:00:00Z',
    completedAt: '2026-01-20T11:00:07Z',
    llmTraceIds: [],
  },
  // ── RSS hybrid onboarding: The Verge (src8) ──
  {
    id: 'job22-roa',
    teamId: 'team1',
    type: 'onboard_rss_article',
    status: 'success',
    progress: 100,
    params: { sourceId: 'src8', url: 'https://www.theverge.com/rss/index.xml', sourceName: 'The Verge' },
    result: { configVersion: 1, sampleArticlesParsed: 3, verdict: 'pass' },
    logs: [
      '[14:00:00] Запуск article-агента для The Verge',
      '[14:00:01] Получен RSS feed: 25 items',
      '[14:00:02] Выбраны 3 статьи для анализа HTML',
      '[14:00:04] Открытие https://www.theverge.com/2026/1/20/article-1...',
      '[14:00:06] Анализ DOM-структуры статьи...',
      '[14:00:07] titleSelectors: h1, meta[property="og:title"]',
      '[14:00:08] contentSelectors: .duet--article--article-body-component',
      '[14:00:09] dateSelectors: time[datetime]',
      '[14:00:10] mediaSelectors: meta[property="og:image"], figure img',
      '[14:00:11] Dry-run: статья 1 OK (1847 символов)',
      '[14:00:12] Dry-run: статья 2 OK (2103 символа)',
      '[14:00:13] Dry-run: статья 3 OK (1562 символа)',
      '[14:00:14] Verdict: PASSED',
      '[14:00:15] ✅ Конфигурация сохранена (v1)',
    ],
    createdAt: '2026-01-20T14:00:00Z',
    completedAt: '2026-01-20T14:00:15Z',
    llmTraceIds: ['llm8'],
  },
  // ── RSS hybrid fetch: The Verge scan stats job ──
  {
    id: 'job23-rfh',
    teamId: 'team1',
    type: 'fetch_rss_hybrid',
    status: 'success',
    progress: 100,
    params: { sourceId: 'src8', sourceName: 'The Verge' },
    result: {
      totalFetched: 21,
      savedFromFeed: 11,
      parsedFromArticle: 8,
      fallbackSavedAsTeaser: 1,
      parseErrors: 1,
      failedUrls: ['https://www.theverge.com/sponsored/blocked-article'],
    },
    logs: [
      '[10:15:00] Загрузка RSS ленты The Verge...',
      '[10:15:01] Получено 21 item из feed',
      '[10:15:02] Проверка дубликатов (externalId/canonicalUrl)...',
      '[10:15:02] item #1: feed length=2341 >= 700 → FULL (saved from feed)',
      '[10:15:02] item #2: feed length=320 < 700 → TEASER (article parser required)',
      '[10:15:03] Открытие URL для 9 тизеров...',
      '[10:15:04] https://www.theverge.com/article/2 → OK (1923 символа)',
      '[10:15:05] https://www.theverge.com/article/5 → OK (2105 символов)',
      '[10:15:06] https://www.theverge.com/article/8 → OK (1755 символов)',
      '[10:15:07] https://www.theverge.com/article/11 → OK (2011 символов)',
      '[10:15:08] https://www.theverge.com/article/13 → OK (988 символов)',
      '[10:15:09] https://www.theverge.com/article/15 → OK (1654 символа)',
      '[10:15:10] https://www.theverge.com/article/17 → OK (2234 символа)',
      '[10:15:11] https://www.theverge.com/article/19 → OK (1123 символа)',
      '[10:15:12] https://www.theverge.com/sponsored/blocked-article → ❌ 403 Forbidden',
      '[10:15:12] item #sponsored: parse error, saved as teaser fallback',
      '[10:15:13] Дедупликация завершена. Новых item: 21',
      '[10:15:14] ✅ Скан завершён: saved_from_feed=11, parsed_from_article=8, teaser_fallback=1, errors=1',
    ],
    createdAt: '2026-03-01T10:15:00Z',
    completedAt: '2026-03-01T10:15:14Z',
    llmTraceIds: [],
  },
  // ── RSS hybrid onboarding: MIT Tech Review (src11) ──
  {
    id: 'job25-roa',
    teamId: 'team1',
    type: 'onboard_rss_article',
    status: 'success',
    progress: 100,
    params: { sourceId: 'src11', url: 'https://www.technologyreview.com/feed/', sourceName: 'MIT Technology Review' },
    result: { configVersion: 2, sampleArticlesParsed: 3, verdict: 'pass' },
    logs: [
      '[01:00:00] Запуск article-агента для MIT Technology Review',
      '[01:00:01] Получен RSS feed: 20 items, feedTitle="MIT Technology Review"',
      '[01:00:02] minFeedContentChars=700, preferFeedWhenFull=true',
      '[01:00:03] Выбраны 3 статьи для анализа HTML',
      '[01:00:05] Открытие https://www.technologyreview.com/2026/1/10/article-a...',
      '[01:00:07] titleSelectors: h1.article__title → найдено ✅',
      '[01:00:08] contentSelectors: div.article__body-text → найдено ✅',
      '[01:00:09] dateSelectors: time[datetime] → найдено ✅',
      '[01:00:10] mediaSelectors: figure.article__image img → найдено ✅',
      '[01:00:11] Dry-run: статья 1 OK (3241 символ)',
      '[01:00:12] Dry-run: статья 2 OK (2887 символов)',
      '[01:00:13] Dry-run: статья 3 OK (4102 символа)',
      '[01:00:14] Качество: средняя длина 3410 — ✅ выше minContentChars=500',
      '[01:00:15] Verdict: PASSED',
      '[01:00:16] ✅ Конфигурация сохранена (v2)',
    ],
    createdAt: '2026-01-10T01:00:00Z',
    completedAt: '2026-01-10T01:00:16Z',
    llmTraceIds: [],
  },
  // ── RSS hybrid fetch: MIT Tech Review latest scan ──
  {
    id: 'job26-rfh',
    teamId: 'team1',
    type: 'fetch_rss_hybrid',
    status: 'success',
    progress: 100,
    params: { sourceId: 'src11', sourceName: 'MIT Technology Review' },
    result: {
      totalFetched: 25,
      savedFromFeed: 18,
      parsedFromArticle: 6,
      fallbackSavedAsTeaser: 0,
      parseErrors: 1,
      failedUrls: ['https://www.technologyreview.com/2026/3/5/paywalled/exclusive-report'],
    },
    logs: [
      '[09:00:00] Загрузка RSS ленты MIT Technology Review...',
      '[09:00:01] Получено 25 items, etag="trmit-etag-20260306"',
      '[09:00:02] Проверка дубликатов по guid/canonicalUrl...',
      '[09:00:03] 18 items: feed length >= 700 → FULL (saved from feed)',
      '[09:00:04] 7 items: feed length < 700 → TEASER, требуется article parser',
      '[09:00:05] Запуск article parser для 7 статей...',
      '[09:00:06] article 1 → OK (3241 символ)',
      '[09:00:07] article 2 → OK (2887 символов)',
      '[09:00:08] article 3 → OK (4102 символа)',
      '[09:00:09] article 4 → OK (2650 символов)',
      '[09:00:10] article 5 → OK (1943 символа)',
      '[09:00:11] article 6 → OK (3188 символов)',
      '[09:00:12] https://www.technologyreview.com/paywalled/exclusive-report → ❌ 402 Payment Required',
      '[09:00:13] ✅ Скан завершён: saved_from_feed=18, parsed_from_article=6, teaser_fallback=0, errors=1',
    ],
    createdAt: '2026-03-06T09:00:00Z',
    completedAt: '2026-03-06T09:00:13Z',
    llmTraceIds: [],
  },
];

// ──────────────────────────────────────────
// Mock LLM traces
// ──────────────────────────────────────────
export const mockLLMTraces: LLMTrace[] = [
  {
    id: 'llm1',
    jobId: 'job1',
    teamId: 'team1',
    operation: 'publish',
    model: 'gpt-4-turbo',
    promptTokens: 1250,
    completionTokens: 380,
    totalTokens: 1630,
    cost: 0.0245,
    latencyMs: 2340,
    prompt: 'System: Rewrite tech news in engaging style for general audience. Add emojis and hashtags.\n\nUser: OpenAI has unveiled GPT-5, featuring enhanced reasoning, multimodal understanding...',
    response: '🚀 Breaking: OpenAI just dropped GPT-5 and it\'s a game-changer!\n\nThe latest AI model brings revolutionary improvements...',
    toolCalls: [],
    rawRequest: {
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: 'Rewrite tech news in engaging style...' },
        { role: 'user', content: 'OpenAI has unveiled GPT-5...' },
      ],
      temperature: 0.7,
      max_tokens: 512,
    },
    rawResponse: {
      id: 'chatcmpl-abc123',
      object: 'chat.completion',
      created: 1708851607,
      model: 'gpt-4-turbo',
      choices: [{ index: 0, message: { role: 'assistant', content: '🚀 Breaking...' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1250, completion_tokens: 380, total_tokens: 1630 },
    },
    createdAt: '2026-02-25T09:00:03Z',
  },
  {
    id: 'llm2',
    jobId: 'job4',
    teamId: 'team1',
    operation: 'publish',
    model: 'gpt-4-turbo',
    promptTokens: 890,
    completionTokens: 220,
    totalTokens: 1110,
    cost: 0.0167,
    latencyMs: 1890,
    prompt: 'System: Summarize AI news for tech professionals. Focus on practical implications.\n\nUser: Google DeepMind today released Gemini Ultra 2.0...',
    response: '🤖 Google DeepMind выпустила Gemini Ultra 2.0...',
    toolCalls: [],
    rawRequest: {
      model: 'gpt-4-turbo',
      messages: [{ role: 'system', content: 'Summarize AI news...' }],
      temperature: 0.6,
    },
    rawResponse: {
      id: 'chatcmpl-def456',
      object: 'chat.completion',
      created: 1708851500,
    },
    createdAt: '2026-02-25T08:30:02Z',
  },
  {
    id: 'llm3',
    jobId: 'job5',
    teamId: 'team1',
    operation: 'publish',
    model: 'gpt-4-turbo',
    promptTokens: 740,
    completionTokens: 190,
    totalTokens: 930,
    cost: 0.0140,
    latencyMs: 1650,
    prompt: 'System: Rewrite tech news in engaging style...\n\nUser: Anthropic, the AI safety company behind Claude, has secured $2 billion...',
    response: '💰 Anthropic привлёк $2 млрд при оценке $60 млрд!...',
    toolCalls: [],
    rawRequest: {
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: 'Anthropic...' }],
    },
    rawResponse: {
      id: 'chatcmpl-ghi789',
      object: 'chat.completion',
      created: 1708851400,
    },
    createdAt: '2026-02-25T06:45:02Z',
  },
  {
    id: 'llm4',
    jobId: 'job9',
    teamId: 'team1',
    operation: 'publish',
    model: 'gpt-4-turbo',
    promptTokens: 1050,
    completionTokens: 312,
    totalTokens: 1362,
    cost: 0.0204,
    latencyMs: 2100,
    prompt: 'System: Rewrite tech news in engaging style for general audience. Add emojis and hashtags.\\n\\nUser: NVIDIA has officially announced the Blackwell B300 GPU targeting AI inference workloads...',
    response: '🖥️ NVIDIA Blackwell B300 — монстр для AI-инференса!...',
    toolCalls: [],
    rawRequest: {
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: 'Rewrite tech news in engaging style...' },
        { role: 'user', content: 'NVIDIA has officially announced...' },
      ],
      temperature: 0.7,
      max_tokens: 512,
    },
    rawResponse: {
      id: 'chatcmpl-jkl012',
      object: 'chat.completion',
      created: 1740476406,
      model: 'gpt-4-turbo',
      choices: [{ index: 0, message: { role: 'assistant', content: '🖥️ NVIDIA Blackwell B300...' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1050, completion_tokens: 312, total_tokens: 1362 },
    },
    createdAt: '2026-02-25T09:30:02Z',
  },
  {
    id: 'llm5',
    jobId: 'job10',
    teamId: 'team1',
    operation: 'publish',
    model: 'gpt-4-turbo',
    promptTokens: 920,
    completionTokens: 265,
    totalTokens: 1185,
    cost: 0.0178,
    latencyMs: 1950,
    prompt: 'System: Summarize AI news for tech professionals. Focus on practical implications.\\n\\nUser: The React team published the alpha release of React 20...',
    response: '⚛️ React 20 Alpha вышел — меняет всё...',
    toolCalls: [],
    rawRequest: {
      model: 'gpt-4-turbo',
      messages: [{ role: 'system', content: 'Summarize AI news...' }],
      temperature: 0.6,
    },
    rawResponse: {
      id: 'chatcmpl-mno345',
      object: 'chat.completion',
      created: 1740470403,
    },
    createdAt: '2026-02-25T08:00:03Z',
  },
  {
    id: 'llm6',
    jobId: 'job14',
    teamId: 'team1',
    operation: 'publish',
    model: 'gpt-4o',
    promptTokens: 810,
    completionTokens: 277,
    totalTokens: 1087,
    cost: 0.0054,
    latencyMs: 1420,
    prompt: 'System: Rewrite tech news in engaging style...\\n\\nUser: AWS has added Claude 3.7 Sonnet to Amazon Bedrock...',
    response: '☁️ AWS Bedrock + Claude 3.7 Sonnet — уже доступно!...',
    toolCalls: [],
    rawRequest: {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'AWS has added Claude 3.7 Sonnet...' }],
      temperature: 0.7,
    },
    rawResponse: {
      id: 'chatcmpl-pqr678',
      object: 'chat.completion',
      created: 1740344402,
    },
    createdAt: '2026-02-23T21:00:02Z',
  },
  {
    id: 'llm7',
    jobId: 'job20',
    teamId: 'team2',
    operation: 'publish',
    model: 'gpt-4o',
    promptTokens: 780,
    completionTokens: 258,
    totalTokens: 1038,
    cost: 0.0052,
    latencyMs: 1380,
    prompt: "System: Transform marketing insights into actionable tips. Focus on ROI and practical advice.\\n\\nUser: With Google's final deprecation of third-party cookies in Chrome by Q3 2026...",
    response: '🍪 Конец эпохи сторонних cookie — дедлайн Q3 2026...',
    toolCalls: [],
    rawRequest: {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: "With Google's final deprecation..." }],
      temperature: 0.7,
    },
    rawResponse: {
      id: 'chatcmpl-stu901',
      object: 'chat.completion',
      created: 1740218402,
    },
    createdAt: '2026-02-23T14:00:02Z',
  },
  {
    id: 'llm8',
    jobId: 'job27',
    teamId: 'team1',
    operation: 'onboard',
    model: 'gpt-4-turbo',
    promptTokens: 1580,
    completionTokens: 420,
    totalTokens: 2000,
    cost: 0.0300,
    latencyMs: 3200,
    prompt: 'System: Analyze the structure of the provided HTML page and identify CSS selectors for article title, URL, date, and preview text.\\n\\nUser: <html>...news.ycombinator.com...</html>',
    response: '{"title_selector": ".titleline > a", "url_selector": ".titleline > a[href]", "date_selector": ".age", "preview_selector": null, "pagination": ".morelink"}',
    toolCalls: [
      { name: 'analyze_html_structure', args: { url: 'https://news.ycombinator.com' }, result: 'success' },
    ],
    rawRequest: {
      model: 'gpt-4-turbo',
      messages: [{ role: 'system', content: 'Analyze HTML structure...' }],
      temperature: 0.2,
      tools: [{ type: 'function', function: { name: 'analyze_html_structure' } }],
    },
    rawResponse: {
      id: 'chatcmpl-vwx234',
      object: 'chat.completion',
      created: 1739577606,
    },
    createdAt: '2026-02-15T00:00:04Z',
  },
];

// ──────────────────────────────────────────
// Mock ads campaigns
// ──────────────────────────────────────────
export const mockAdsPosts: AdsPost[] = [
  {
    id: 'adp1', teamId: 'team1', createdByUserId: 'user-1', createdByName: 'John Doe',
    text: '🎉 С Новым Годом! Специальное предложение: скидка 50% на премиум-подписку!\n\nТолько до 10 января — подключите годовой план со скидкой. Не упустите шанс!',
    mediaUrl: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=800',
    usedInCampaigns: ['ads1', 'ads5'], createdAt: '2025-12-27T15:00:00Z',
  },
  {
    id: 'adp2', teamId: 'team1', createdByUserId: 'user-1', createdByName: 'John Doe',
    text: '🚀 Новые функции уже доступны!\n\n✅ Авто-расписание публикаций\n✅ Улучшенная аналитика каналов\n✅ Мультиязычные промпты\n\nОбновите бота и попробуйте прямо сейчас!',
    usedInCampaigns: ['ads2', 'ads6'], createdAt: '2026-02-23T10:00:00Z',
  },
  {
    id: 'adp3', teamId: 'team1', createdByUserId: 'user-1', createdByName: 'John Doe',
    text: '🌸 Весенний марафон контента!\n\nВесь март публикуем лучшие материалы каждый день. Подписывайтесь, чтобы не пропустить!\n\n#марафон #контент #весна',
    usedInCampaigns: ['ads3'], createdAt: '2026-02-26T18:30:00Z',
  },
  {
    id: 'adp4', teamId: 'team1', createdByUserId: 'user-2', createdByName: 'Jane Smith',
    text: '🔥 Чёрная пятница!\n\nСкидки до 70% на все тарифы. Только 24 часа!\n\nПромокод: BLACKFRIDAY2025',
    usedInCampaigns: ['ads4'], createdAt: '2025-11-28T08:00:00Z',
  },
  {
    id: 'adp5', teamId: 'team1', createdByUserId: 'user-1', createdByName: 'John Doe',
    text: '📢 Приглашаем на бесплатный вебинар!\n\nТема: «Автоматизация контент-маркетинга с ИИ»\n\n📅 15 марта, 19:00 МСК\n🔗 Ссылка для регистрации в закреплённом сообщении\n\nКоличество мест ограничено!',
    usedInCampaigns: [], createdAt: '2026-02-28T14:00:00Z',
  },
  {
    id: 'adp6', teamId: 'team1', createdByUserId: 'user-1', createdByName: 'John Doe',
    text: '🤝 Партнёрская программа Q1 2026\n\nПриглашайте друзей и получайте бонусы:\n• 1 приглашение — 1 месяц бесплатно\n• 5 приглашений — полгода бесплатно\n• 10 приглашений — навсегда!',
    usedInCampaigns: [], createdAt: '2026-03-01T09:00:00Z',
  },
  {
    id: 'adp7', teamId: 'team1', createdByUserId: 'user-2', createdByName: 'Jane Smith',
    text: '💡 Совет дня: как увеличить охваты в 3 раза\n\nИспользуйте AI Poster для автоматического постинга в оптимальное время. Наш ИИ анализирует активность вашей аудитории и подбирает лучшие слоты.',
    mediaUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
    usedInCampaigns: [], createdAt: '2026-03-01T13:00:00Z',
  },
  {
    id: 'adp8', teamId: 'team2', createdByUserId: 'user-1', createdByName: 'John Doe',
    text: '📊 Маркетинговый отчёт за февраль\n\nОсновные метрики:\n📈 +45% подписчиков\n👁 230K просмотров\n💬 12K реакций\n\nПодробности в новом посте на канале.',
    usedInCampaigns: [], createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'adp9', teamId: 'team1', createdByUserId: 'user-2', createdByName: 'Jane Smith',
    text: '🎓 Запускаем курс «Telegram-маркетинг от А до Я»\n\n12 уроков, домашние задания, личный куратор.\n\nЧему научитесь:\n• Создавать контент-план на месяц\n• Настраивать автоворонки\n• Анализировать метрики и расти\n\nСтарт — 20 марта. Ранняя цена до 10 марта!',
    mediaUrl: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800',
    usedInCampaigns: ['ads7', 'ads8'], createdAt: '2026-02-20T11:30:00Z',
  },
  {
    id: 'adp10', teamId: 'team1', createdByUserId: 'user-1', createdByName: 'John Doe',
    text: '⚡ Молниеносная поддержка 24/7\n\nТеперь наша команда отвечает в среднем за 3 минуты. Пишите в @ai_poster_support — поможем с любым вопросом!',
    usedInCampaigns: [], createdAt: '2026-02-18T16:00:00Z',
  },
  {
    id: 'adp11', teamId: 'team1', createdByUserId: 'user-2', createdByName: 'Jane Smith',
    text: '📱 Мобильное приложение уже в разработке!\n\nСовсем скоро вы сможете управлять каналами прямо с телефона. Предзаказ доступен в профиле — получите месяц бесплатно при запуске.\n\n#скоро #мобильноеприложение #aiposter',
    usedInCampaigns: [], createdAt: '2026-02-15T09:45:00Z',
  },
  {
    id: 'adp12', teamId: 'team1', createdByUserId: 'user-1', createdByName: 'John Doe',
    text: '🏆 AI Poster — лучший инструмент 2025 года по версии TechReview!\n\nСпасибо каждому из вас за доверие. Мы продолжаем развиваться и делать продукт ещё лучше.',
    mediaUrl: 'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=800',
    usedInCampaigns: ['ads9', 'ads10'], createdAt: '2026-01-15T12:00:00Z',
  },
  {
    id: 'adp13', teamId: 'team1', createdByUserId: 'user-2', createdByName: 'Jane Smith',
    text: '🎯 Таргетированные публикации\n\nНовая функция: выбирайте сегменты аудитории для каждого поста. ИИ подберёт оптимальный формат и время для максимальног�� охвата.\n\nДоступно на тарифах Pro и Enterprise.',
    usedInCampaigns: [], createdAt: '2026-01-10T14:20:00Z',
  },
  {
    id: 'adp14', teamId: 'team1', createdByUserId: 'user-1', createdByName: 'John Doe',
    text: '🎄 Итоги 2025 года в цифрах\n\n🔢 15 000+ активных команд\n📝 2.4 млн опубликованных постов\n🌍 48 стран\n⭐ 4.9 средний рейтинг\n\nБлагодарим за невероятный год! Впереди ещё больше крутых обновлений 🚀',
    mediaUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
    usedInCampaigns: [], createdAt: '2025-12-31T20:00:00Z',
  },
  {
    id: 'adp15', teamId: 'team1', createdByUserId: 'user-2', createdByName: 'Jane Smith',
    text: '💼 Кейс: как @techstartup увеличил подписчиков на 300% за 2 ме��яца\n\nРассказываем по шагам:\n1. Настроили 5 источников контента\n2. Подключили AI-рерайт с фирменным стилем\n3. Запустили авто-публикации 3 раза в день\n4. Добавили рекламные кампании на выходные\n\nРезультат: с 2K до 8K подписчиков. Полный кейс — в блоге.',
    usedInCampaigns: [], createdAt: '2026-02-10T10:00:00Z',
  },
  {
    id: 'adp16', teamId: 'team1', createdByUserId: 'user-1', createdByName: 'John Doe',
    text: '🔒 Безопасность — наш приоритет\n\nМы прошли аудит SOC 2 Type II. Все данные зашифрованы, доступ контролируется, а резервные копии создаются каждый час.\n\nПодробнее о нашей политике безопасности — в разделе «О нас».',
    usedInCampaigns: [], createdAt: '2026-02-05T08:30:00Z',
  },
  {
    id: 'adp17', teamId: 'team1', createdByUserId: 'user-2', createdByName: 'Jane Smith',
    text: '🎁 Розыгрыш!\n\nРазыгрываем 3 годовых подписки Pro среди наших пользователей.\n\nУсловия:\n1. Подпишитесь на канал\n2. Поставьте реакцию 🔥 на этот пост\n3. Напишите в комментариях, за что вы любите AI Poster\n\nИтоги — 15 марта. Удачи!',
    mediaUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800',
    usedInCampaigns: ['ads11'], createdAt: '2026-02-25T17:00:00Z',
  },
  {
    id: 'adp18', teamId: 'team1', createdByUserId: 'user-1', createdByName: 'John Doe',
    text: '📋 Обновление: новый редактор промптов\n\nТеперь вы можете:\n• Использовать переменные {{channel}}, {{date}}, {{topic}}\n• Сохранять шаблоны промптов\n• Тестировать генерацию прямо в интерфейсе\n\nОбновление уже доступно для всех пользователей.',
    usedInCampaigns: [], createdAt: '2026-02-12T13:15:00Z',
  },
];

// ──────────────────────────────────────────
// Mock ads campaigns
// ──────────────────────────────────────────
export const mockAdsCampaigns: AdsCampaign[] = [
  {
    id: 'ads1', name: 'Новогодняя акция 2026', status: 'completed',
    scheduledAt: '2026-01-01T00:00:00Z', adsPostId: 'adp1',
    targetChannels: ['ch1', 'ch2', 'ch4'],
    channelResults: {
      ch1: { status: 'sent', telegramMessageId: 4201, viewsCount: 4_830 },
      ch2: { status: 'sent', telegramMessageId: 1502, viewsCount: 2_710 },
      ch4: { status: 'sent', telegramMessageId: 890, viewsCount: 6_420 },
    },
    sentCount: 3, failedCount: 0, createdAt: '2025-12-28T00:00:00Z',
  },
  {
    id: 'ads2', name: 'Анонс новых функций', status: 'ready',
    scheduledAt: '2026-03-05T10:00:00Z', adsPostId: 'adp2',
    targetChannels: ['ch1', 'ch2'],
    sentCount: 0, failedCount: 0, createdAt: '2026-02-24T00:00:00Z',
  },
  {
    id: 'ads3', name: 'Весенний марафон контента', status: 'sending',
    scheduledAt: '2026-03-01T09:00:00Z', adsPostId: 'adp3',
    targetChannels: ['ch1', 'ch2', 'ch4'],
    channelResults: {
      ch1: { status: 'sent', telegramMessageId: 4210, viewsCount: 1_230 },
      ch2: { status: 'sent', telegramMessageId: 1510, viewsCount: 890 },
      ch4: { status: 'pending' },
    },
    sentCount: 2, failedCount: 0, createdAt: '2026-02-27T14:00:00Z',
  },
  {
    id: 'ads4', name: 'Чёрная пятница 2025', status: 'completed',
    scheduledAt: '2025-11-29T08:00:00Z', adsPostId: 'adp4',
    targetChannels: ['ch1', 'ch2', 'ch4'],
    channelResults: {
      ch1: { status: 'sent', telegramMessageId: 3980, viewsCount: 3_640 },
      ch2: { status: 'failed', error: 'Таймаут соединения' },
      ch4: { status: 'failed', error: 'Бот не является администратором' },
    },
    sentCount: 1, failedCount: 2, createdAt: '2025-11-28T10:00:00Z',
  },
  {
    id: 'ads5', name: 'Повторная новогодняя рассылка', status: 'completed',
    scheduledAt: '2026-01-05T12:00:00Z', adsPostId: 'adp1',
    targetChannels: ['ch1', 'ch3'],
    channelResults: {
      ch1: { status: 'sent', telegramMessageId: 4250, viewsCount: 5_120 },
      ch3: { status: 'sent', telegramMessageId: 710, viewsCount: 1_340 },
    },
    sentCount: 2, failedCount: 0, createdAt: '2026-01-04T10:00:00Z',
  },
  {
    id: 'ads6', name: 'Функции — повторный анонс', status: 'completed',
    scheduledAt: '2026-03-01T14:00:00Z', adsPostId: 'adp2',
    targetChannels: ['ch3', 'ch4'],
    channelResults: {
      ch3: { status: 'sent', telegramMessageId: 720, viewsCount: 980 },
      ch4: { status: 'sent', telegramMessageId: 900, viewsCount: 7_150 },
    },
    sentCount: 2, failedCount: 0, createdAt: '2026-02-28T09:00:00Z',
  },
  {
    id: 'ads7', name: 'Курс TG-маркетинга — запуск', status: 'ready',
    scheduledAt: '2026-03-10T10:00:00Z', adsPostId: 'adp9',
    targetChannels: ['ch1', 'ch2', 'ch3', 'ch4'],
    sentCount: 0, failedCount: 0, createdAt: '2026-03-01T08:00:00Z',
  },
  {
    id: 'ads8', name: 'Курс TG-маркетинга — напоминание', status: 'ready',
    scheduledAt: '2026-03-18T10:00:00Z', adsPostId: 'adp9',
    targetChannels: ['ch1', 'ch2'],
    sentCount: 0, failedCount: 0, createdAt: '2026-03-01T08:30:00Z',
  },
  {
    id: 'ads9', name: 'Награда TechReview — все каналы', status: 'completed',
    scheduledAt: '2026-01-20T11:00:00Z', adsPostId: 'adp12',
    targetChannels: ['ch1', 'ch2', 'ch3', 'ch4'],
    channelResults: {
      ch1: { status: 'sent', telegramMessageId: 4280, viewsCount: 4_200 },
      ch2: { status: 'sent', telegramMessageId: 1530, viewsCount: 2_450 },
      ch3: { status: 'sent', telegramMessageId: 730, viewsCount: 1_180 },
      ch4: { status: 'failed', error: 'Канал временно недоступен' },
    },
    sentCount: 3, failedCount: 1, createdAt: '2026-01-18T15:00:00Z',
  },
  {
    id: 'ads10', name: 'Награда TechReview — повтор', status: 'completed',
    scheduledAt: '2026-01-25T11:00:00Z', adsPostId: 'adp12',
    targetChannels: ['ch4'],
    channelResults: {
      ch4: { status: 'sent', telegramMessageId: 910, viewsCount: 8_300 },
    },
    sentCount: 1, failedCount: 0, createdAt: '2026-01-23T12:00:00Z',
  },
  {
    id: 'ads11', name: 'Розыгрыш подписок — март', status: 'sending',
    scheduledAt: '2026-03-01T17:00:00Z', adsPostId: 'adp17',
    targetChannels: ['ch1', 'ch2', 'ch3', 'ch4'],
    channelResults: {
      ch1: { status: 'sent', telegramMessageId: 4320, viewsCount: 620 },
      ch2: { status: 'pending' },
      ch3: { status: 'pending' },
      ch4: { status: 'pending' },
    },
    sentCount: 1, failedCount: 0, createdAt: '2026-02-28T16:00:00Z',
  },
];

// ──────────────────────────────────────────
// Helper functions
// ──────────────────────────────────────────

// ── Auth type ──
export type AuthType = 'admin' | 'user';

export const getAuthType = (): AuthType => {
  return (localStorage.getItem('authType') as AuthType) || 'user';
};

export const setAuthType = (type: AuthType) => {
  localStorage.setItem('authType', type);
};

// ── Admin auth ──
export const getCurrentAdmin = (): Admin | null => {
  const adminId = localStorage.getItem('currentAdminId');
  if (adminId) {
    return mockAdmins.find(a => a.id === adminId) || null;
  }
  return null;
};

export const setCurrentAdmin = (adminId: string) => {
  localStorage.setItem('currentAdminId', adminId);
  setAuthType('admin');
};

export const getAllAdmins = () => mockAdmins;

// ── User auth ──
export const getCurrentUser = (): User | null => {
  const userId = localStorage.getItem('currentUserId');
  if (userId) {
    return mockUsers.find(u => u.id === userId) || null;
  }
  return null;
};

export const setCurrentUser = (userId: string) => {
  localStorage.setItem('currentUserId', userId);
  setAuthType('user');
};

export const getAllUsers = () => mockUsers;

// ── Teams ──
export const getUserTeams = (): Team[] => {
  const user = getCurrentUser();
  if (!user) return [];

  const userTeamIds = mockTeamMembers
    .filter(m => m.userId === user.id)
    .map(m => m.teamId);

  return mockTeams.filter(t => userTeamIds.includes(t.id));
};

export const getCurrentTeam = (teamId: string | null): Team | null => {
  if (!teamId) return null;
  return mockTeams.find(t => t.id === teamId) || null;
};

export const canAccessTeam = (teamId: string): boolean => {
  const user = getCurrentUser();
  if (!user) return false;
  return mockTeamMembers.some(m => m.teamId === teamId && m.userId === user.id);
};

// ── Team membership role check ──
export const getUserTeamRole = (userId: string, teamId: string): TeamMemberRole | null => {
  const member = mockTeamMembers.find(m => m.userId === userId && m.teamId === teamId);
  return member?.role || null;
};

export const isTeamOwner = (userId: string, teamId: string): boolean => {
  return getUserTeamRole(userId, teamId) === 'owner';
};

// ── Create team ──
export const createTeam = (name: string): Team => {
  const user = getCurrentUser();
  if (!user) throw new Error('No user logged in');

  const newTeam: Team = {
    id: `team${Date.now()}`,
    name,
    ownerId: user.id,
    ownerName: user.displayName,
    isActive: true,
    channelsCount: 0,
    sourcesCount: 0,
    membersCount: 1,
    limits: {
      maxPostsPerDay: 100,
      maxChannels: 10,
      maxSources: 20,
      maxAgentRuns: 20,
      maxMembers: 5,
    },
    createdAt: new Date().toISOString(),
  };

  mockTeams.push(newTeam);

  const newMember: TeamMember = {
    id: `member${Date.now()}`,
    userId: user.id,
    userName: user.displayName,
    userEmail: user.email,
    teamId: newTeam.id,
    role: 'owner',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  mockTeamMembers.push(newMember);

  return newTeam;
};

// ── Delete team ──
export const canDeleteTeam = (teamId: string): { canDelete: boolean; reason?: string } => {
  const team = mockTeams.find(t => t.id === teamId);
  if (!team) return { canDelete: false, reason: 'Команда не найдена' };

  const user = getCurrentUser();
  if (!user || team.ownerId !== user.id) {
    return { canDelete: false, reason: 'Только владелец может удалить команду' };
  }

  const teamChannels = mockChannels.filter(c => c.teamId === teamId);
  if (teamChannels.length > 0) {
    return { canDelete: false, reason: 'Удалите все каналы перед удалением команды' };
  }

  const teamSources = mockSources.filter(s => s.teamId === teamId);
  if (teamSources.length > 0) {
    return { canDelete: false, reason: 'Удалите все источники перед удалением команды' };
  }

  const members = mockTeamMembers.filter(m => m.teamId === teamId);
  if (members.length > 1) {
    return { canDelete: false, reason: 'Удалите всех участников перед удалением команды' };
  }

  return { canDelete: true };
};

export const deleteTeam = (teamId: string): boolean => {
  const check = canDeleteTeam(teamId);
  if (!check.canDelete) return false;

  const teamIndex = mockTeams.findIndex(t => t.id === teamId);
  if (teamIndex !== -1) mockTeams.splice(teamIndex, 1);

  const memberIndices = mockTeamMembers
    .map((m, i) => m.teamId === teamId ? i : -1)
    .filter(i => i !== -1)
    .reverse();
  memberIndices.forEach(i => mockTeamMembers.splice(i, 1));

  return true;
};

// ── Team usage / limits ──
export interface TeamUsage {
  postsToday: number;
  channelsUsed: number;
  sourcesUsed: number;
  agentRunsToday: number;
  membersUsed: number;
}

export const getTeamUsage = (teamId: string): TeamUsage => {
  const today = new Date('2026-02-25');

  const postsToday = mockPostedItems.filter(
    p => p.teamId === teamId && p.status === 'success' &&
      new Date(p.postedAt).toDateString() === today.toDateString()
  ).length;

  const channelsUsed = mockChannels.filter(c => c.teamId === teamId).length;
  const sourcesUsed = mockSources.filter(s => s.teamId === teamId).length;

  const agentRunsToday = mockJobs.filter(
    j => j.teamId === teamId && j.type === 'onboard_website' &&
      new Date(j.createdAt).toDateString() === today.toDateString()
  ).length;

  // Members: confirmed members + pending invitations (both occupy slots)
  const confirmedMembers = mockTeamMembers.filter(m => m.teamId === teamId).length;
  const pendingInvites = mockInvitations.filter(i => i.teamId === teamId && i.status === 'pending').length;
  const membersUsed = confirmedMembers + pendingInvites;

  return { postsToday, channelsUsed, sourcesUsed, agentRunsToday, membersUsed };
};

// ── Invitations ──
export const sendInvitation = (teamId: string, email: string): Invitation => {
  const user = getCurrentUser();
  if (!user) throw new Error('No user logged in');

  const token = `tok_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const inv: Invitation = {
    id: `inv${Date.now()}`,
    teamId,
    email,
    invitedByUserId: user.id,
    invitedByName: user.displayName,
    status: 'pending',
    inviteToken: token,
    createdAt: new Date().toISOString(),
  };

  mockInvitations.push(inv);
  return inv;
};

export const cancelInvitation = (invitationId: string) => {
  const inv = mockInvitations.find(i => i.id === invitationId);
  if (inv) inv.status = 'cancelled';
};

// Accept an invitation — adds user to team, marks invitation accepted
export const acceptInvitation = (invitationId: string): boolean => {
  const inv = mockInvitations.find(i => i.id === invitationId);
  if (!inv || inv.status !== 'pending') return false;

  const user = getCurrentUser();
  if (!user || user.email !== inv.email) return false;

  // Check if already a member
  const alreadyMember = mockTeamMembers.some(
    m => m.userId === user.id && m.teamId === inv.teamId
  );
  if (alreadyMember) {
    inv.status = 'accepted';
    inv.acceptedAt = new Date().toISOString();
    return true;
  }

  // Add as team member
  const newMember: TeamMember = {
    id: `member${Date.now()}`,
    userId: user.id,
    userName: user.displayName,
    userEmail: user.email,
    teamId: inv.teamId,
    role: 'member',
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  mockTeamMembers.push(newMember);

  // Update team members count
  const team = mockTeams.find(t => t.id === inv.teamId);
  if (team) team.membersCount += 1;

  // Mark invitation as accepted
  inv.status = 'accepted';
  inv.acceptedAt = new Date().toISOString();

  return true;
};

export const getTeamInvitations = (teamId: string): Invitation[] => {
  return mockInvitations.filter(i => i.teamId === teamId && i.status === 'pending');
};

// ── Admin invite (admin invites new user to the platform) ──
export const sendAdminInvite = (email: string): AdminInvite => {
  const admin = getCurrentAdmin();
  if (!admin) throw new Error('No admin logged in');

  const token = `adm_tok_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const inv: AdminInvite = {
    id: `adm-inv${Date.now()}`,
    email,
    invitedByAdminId: admin.id,
    inviteToken: token,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  mockAdminInvites.push(inv);
  return inv;
};

// ── Channel CRUD ──
export const addChannel = (
  teamId: string,
  data: Omit<Channel, "id" | "createdAt" | "teamId">
): Channel => {
  const newChannel: Channel = {
    ...data,
    id: `ch${Date.now()}`,
    teamId,
    createdAt: new Date().toISOString(),
  };
  mockChannels.push(newChannel);

  const team = mockTeams.find(t => t.id === teamId);
  if (team) team.channelsCount += 1;

  return newChannel;
};

export const deleteChannel = (channelId: string): boolean => {
  const idx = mockChannels.findIndex(c => c.id === channelId);
  if (idx === -1) return false;

  const channel = mockChannels[idx];
  mockChannels.splice(idx, 1);

  const team = mockTeams.find(t => t.id === channel.teamId);
  if (team && team.channelsCount > 0) team.channelsCount -= 1;

  return true;
};

// ── Source CRUD ──
export const createSource = (
  teamId: string,
  data: {
    name: string;
    type: Source['type'];
    url: string;
    /** RSS-only: режим работы (default: feed_only) */
    rssMode?: RssMode;
    /** RSS hybrid: минимальная длина контента из feed для сохранения без article-агента */
    rssMinFeedContentChars?: number;
    /** RSS hybrid: при достаточном объёме в feed — сохранять из feed, не идти в article */
    rssPreferFeedWhenFull?: boolean;
  }
): Source => {
  // Если выбран гибридный режим RSS — сразу создаём заготовку конфига
  const rssArticleConfig: RssArticleOnlyConfig | undefined =
    data.type === 'rss' && data.rssMode === 'feed_with_article_agent'
      ? {
          kind: 'rss_article_only',
          version: 0, // 0 = ещё не onboarded
          article: {
            titleSelectors: ['h1', 'meta[property="og:title"]'],
            contentSelectors: ['article .content', 'main article'],
            dateSelectors: ['time[datetime]', "meta[property='article:published_time']"],
            mediaSelectors: ["meta[property='og:image']", 'article img'],
            idSelectors: ["meta[name='article:id']", 'article[data-id]'],
            canonicalSelectors: ["link[rel='canonical']", "meta[property='og:url']"],
          },
          quality: { minContentChars: 280 },
          rssFallbackPolicy: {
            minFeedContentChars: data.rssMinFeedContentChars ?? 700,
            preferFeedWhenFull: data.rssPreferFeedWhenFull ?? true,
          },
        }
      : undefined;

  const newSource: Source = {
    id: `src${Date.now()}`,
    teamId,
    name: data.name,
    type: data.type,
    isActive: true,
    url: data.url,
    status: 'ok',
    itemsCount: 0,
    itemsCount24h: 0,
    itemsCountWeek: 0,
    itemsCountMonth: 0,
    createdAt: new Date().toISOString(),
    // RSS-specific
    ...(data.type === 'rss' ? {
      rssMode: data.rssMode ?? 'feed_only',
      rssArticleConfig,
      rssArticleOnboardingStatus: rssArticleConfig ? 'pending' : undefined,
    } : {}),
  };
  mockSources.push(newSource);

  const team = mockTeams.find(t => t.id === teamId);
  if (team) team.sourcesCount += 1;

  return newSource;
};

export const deleteSource = (sourceId: string): boolean => {
  const idx = mockSources.findIndex(s => s.id === sourceId);
  if (idx === -1) return false;

  const source = mockSources[idx];
  mockSources.splice(idx, 1);

  // Remove all channel links for this source
  mockChannelSourceLinks = mockChannelSourceLinks.filter(l => l.sourceId !== sourceId);

  const team = mockTeams.find(t => t.id === source.teamId);
  if (team && team.sourcesCount > 0) team.sourcesCount -= 1;

  return true;
};

// ── AdsPost CRUD ���─
export const deleteAdsPost = (postId: string): boolean => {
  const post = mockAdsPosts.find(p => p.id === postId);
  if (!post) return false;
  if (post.usedInCampaigns.length > 0) return false; // нельзя удалить, если используется
  const idx = mockAdsPosts.findIndex(p => p.id === postId);
  mockAdsPosts.splice(idx, 1);
  return true;
};

// ── Campaign CRUD ──
export const deleteAdsCampaign = (campaignId: string): boolean => {
  const idx = mockAdsCampaigns.findIndex(c => c.id === campaignId);
  if (idx === -1) return false;
  const campaign = mockAdsCampaigns[idx];
  if (campaign.status !== 'ready') return false;
  const post = mockAdsPosts.find(p => p.id === campaign.adsPostId);
  if (post) {
    post.usedInCampaigns = post.usedInCampaigns.filter(id => id !== campaignId);
  }
  mockAdsCampaigns.splice(idx, 1);
  return true;
};

export const createCampaign = (
  data: { name: string; adsPostId: string; targetChannels: string[]; scheduledAt?: string }
): AdsCampaign => {
  const newCampaign: AdsCampaign = {
    id: `ads${Date.now()}`,
    name: data.name,
    status: 'ready',
    scheduledAt: data.scheduledAt,
    adsPostId: data.adsPostId,
    targetChannels: data.targetChannels,
    sentCount: 0,
    failedCount: 0,
    createdAt: new Date().toISOString(),
  };
  mockAdsCampaigns.push(newCampaign);
  // Привязываем пост к кампании
  const post = mockAdsPosts.find(p => p.id === data.adsPostId);
  if (post) post.usedInCampaigns.push(newCampaign.id);
  return newCampaign;
};

// ── Logout helpers ──
export const logoutUser = () => {
  localStorage.removeItem('currentUserId');
  localStorage.removeItem('currentTeamId');
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('authType');
};

// ── Register new user ──
export interface RegisterResult {
  user: User;
  adminInviteAccepted: boolean;
  teamInviteToken?: string; // if came from team invite, pass back so we can redirect
}

export const registerUser = (
  email: string,
  displayName: string,
  password: string,
  adminInviteToken?: string,
  teamInviteToken?: string,
): RegisterResult => {
  // Check if email already exists
  const existing = mockUsers.find(u => u.email === email);
  if (existing) throw new Error('Пользователь с таким email уже существует');

  // Check admin invite token
  let adminInviteAccepted = false;
  let canCreateTeam = false;
  if (adminInviteToken) {
    const adminInv = mockAdminInvites.find(
      i => i.inviteToken === adminInviteToken && i.status === 'pending'
    );
    if (adminInv) {
      adminInv.status = 'accepted';
      adminInviteAccepted = true;
      canCreateTeam = true;
    }
  }

  const newUser: User = {
    id: `user-${Date.now()}`,
    email,
    displayName,
    password,
    isActive: true,
    emailVerified: true, // mock — считаем подтверждённым после "верификации"
    canCreateTeam,
    maxTeams: canCreateTeam ? 1 : 0,
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  };

  mockUsers.push(newUser);

  return {
    user: newUser,
    adminInviteAccepted,
    teamInviteToken: teamInviteToken || undefined,
  };
};

export const logoutAdmin = () => {
  localStorage.removeItem('currentAdminId');
  localStorage.removeItem('isAdminLoggedIn');
  localStorage.removeItem('authType');
};

// ──────────────────────────────────────────
// Source action helpers — реально обновляют mockSources/mockJobs
// ──────────────────────────────────────────

/** Пауза источника — обновляет isActive в mock store */
export const pauseSource = (sourceId: string): boolean => {
  const src = mockSources.find(s => s.id === sourceId);
  if (!src) return false;
  src.isActive = false;
  return true;
};

/** Возобновление источника — обновляет isActive, сбрасывает ошибку */
export const resumeSource = (sourceId: string): boolean => {
  const src = mockSources.find(s => s.id === sourceId);
  if (!src) return false;
  src.isActive = true;
  src.lastError = undefined;
  src.status = 'ok';
  return true;
};

/** Scan now — создаёт job, через 3 сек завершает его и обновляет source counters */
export const scanSourceNow = (sourceId: string, teamId: string): Job => {
  const src = mockSources.find(s => s.id === sourceId);
  const now = new Date().toISOString();
  const newItems = Math.floor(Math.random() * 8) + 1;

  const job: Job = {
    id: `job${Date.now()}`,
    teamId,
    type: src?.type === 'website'
      ? 'fetch_website'
      : src?.type === 'telegram'
      ? 'fetch_telegram'
      : src?.rssMode === 'feed_with_article_agent'
      ? 'fetch_rss_hybrid'
      : 'fetch_rss',
    status: 'running',
    progress: 0,
    params: { sourceId, sourceName: src?.name || '' },
    logs: [
      `[${new Date().toLocaleTimeString()}] Запуск сканирования ${src?.name || sourceId}`,
    ],
    createdAt: now,
    llmTraceIds: [],
  };
  mockJobs.unshift(job);

  // Имитируем завершение через 3 сек
  setTimeout(() => {
    job.status = 'success';
    job.progress = 100;
    const isHybrid = job.type === 'fetch_rss_hybrid';
    if (isHybrid) {
      const parsedFromArticle = Math.max(1, Math.floor(newItems * 0.3));
      const savedFromFeed = newItems - parsedFromArticle;
      job.result = {
        totalFetched: newItems + Math.floor(Math.random() * 5),
        savedFromFeed,
        parsedFromArticle,
        fallbackSavedAsTeaser: 0,
        parseErrors: 0,
        failedUrls: [],
      };
    } else {
      job.result = { newItemsCount: newItems };
    }
    job.completedAt = new Date().toISOString();
    job.logs.push(
      `[${new Date().toLocaleTimeString()}] Найдено ${newItems} новых материалов`,
      `[${new Date().toLocaleTimeString()}] ✅ Сканирование завершено`,
    );
    if (src) {
      src.lastFetchedAt = new Date().toISOString();
      src.itemsCount += newItems;
      src.itemsCount24h += newItems;
      src.itemsCountWeek += newItems;
      src.itemsCountMonth += newItems;
      src.status = 'ok';
      src.lastError = undefined;
    }
  }, 3000);

  return job;
};

/** Reonboard — создаёт job, обновляет onboardingStatus */
export const reonboardSource = (sourceId: string, teamId: string): Job => {
  const src = mockSources.find(s => s.id === sourceId);
  const now = new Date().toISOString();

  const job: Job = {
    id: `job${Date.now()}`,
    teamId,
    type: 'onboard_website',
    status: 'running',
    progress: 0,
    params: { sourceId, url: src?.url || '', sourceName: src?.name || '' },
    logs: [
      `[${new Date().toLocaleTimeString()}] Запуск AI-агента для ${src?.url || sourceId}`,
      `[${new Date().toLocaleTimeString()}] Анализ структуры сайта...`,
    ],
    createdAt: now,
    llmTraceIds: [],
  };
  mockJobs.unshift(job);

  if (src) {
    src.onboardingStatus = 'running';
    src.lastOnboardJobId = job.id;
  }

  // Завершаем job через 8 секунд (совпадает с UI-таймаутом агента)
  setTimeout(() => {
    job.status = 'success';
    job.progress = 100;
    job.completedAt = new Date().toISOString();
    job.logs.push(
      `[${new Date().toLocaleTimeString()}] Конфигурация успешно сгенерирована`,
      `[${new Date().toLocaleTimeString()}] ✅ AI-агент завершил работу`,
    );
    // onboardingStatus обновится при applyNewConfig (когда пользователь нажмёт «Применить»)
  }, 8000);

  return job;
};

/** Применить новый конфиг к source после reonboard */
export const applyNewConfig = (sourceId: string, config: AgentConfig): void => {
  const src = mockSources.find(s => s.id === sourceId);
  if (!src) return;
  src.activeConfigJson = config;
  src.activeConfigVersion = (src.activeConfigVersion || 0) + 1;
  src.onboardingStatus = 'done';
  src.lastOnboardedAt = new Date().toISOString();

  // Гарантируем, что связанный job тоже помечен как успешный (если ещё running)
  if (src.lastOnboardJobId) {
    const job = mockJobs.find(j => j.id === src.lastOnboardJobId);
    if (job && job.status === 'running') {
      job.status = 'success';
      job.progress = 100;
      job.completedAt = new Date().toISOString();
    }
  }
};

/** Reonboard article-агента для RSS hybrid-источника */
export const reonboardRssArticle = (sourceId: string, teamId: string): Job => {
  const src = mockSources.find(s => s.id === sourceId);
  const now = new Date().toISOString();

  const job: Job = {
    id: `job${Date.now()}`,
    teamId,
    type: 'onboard_rss_article',
    status: 'running',
    progress: 0,
    params: { sourceId, url: src?.url || '', sourceName: src?.name || '' },
    logs: [
      `[${new Date().toLocaleTimeString()}] Запуск article-агента для ${src?.name || sourceId}`,
      `[${new Date().toLocaleTimeString()}] Анализ HTML-структуры статей...`,
    ],
    createdAt: now,
    llmTraceIds: [],
  };
  mockJobs.unshift(job);

  if (src) {
    src.rssArticleOnboardingStatus = 'running';
    src.rssArticleLastOnboardJobId = job.id;
  }

  // Завершаем job через 8 секунд (совпадает с UI-таймаутом агента)
  setTimeout(() => {
    job.status = 'success';
    job.progress = 100;
    job.completedAt = new Date().toISOString();
    job.logs.push(
      `[${new Date().toLocaleTimeString()}] Конфигурация article-парсера успешно сгенерирована`,
      `[${new Date().toLocaleTimeString()}] ✅ Article-агент завершил работу`,
    );
  }, 8000);

  return job;
};

/** Применить новый rss_article_only конфиг после reonboard */
export const applyNewRssArticleConfig = (sourceId: string, config: RssArticleOnlyConfig): void => {
  const src = mockSources.find(s => s.id === sourceId);
  if (!src) return;
  src.rssArticleConfig = config;
  src.rssArticleOnboardingStatus = 'done';
  src.rssArticleOnboardedAt = new Date().toISOString();

  // Гарантируем завершение связанного job (если ещё running)
  if (src.rssArticleLastOnboardJobId) {
    const job = mockJobs.find(j => j.id === src.rssArticleLastOnboardJobId);
    if (job && job.status === 'running') {
      job.status = 'success';
      job.progress = 100;
      job.completedAt = new Date().toISOString();
    }
  }
};

// ──────────────────────────────────────────
// Team member removal — обновляет глобальный mockTeamMembers
// ──────────────────────────────────────────
export const removeMember = (memberId: string): boolean => {
  const idx = mockTeamMembers.findIndex(m => m.id === memberId);
  if (idx === -1) return false;
  const member = mockTeamMembers[idx];
  mockTeamMembers.splice(idx, 1);
  const team = mockTeams.find(t => t.id === member.teamId);
  if (team && team.membersCount > 0) team.membersCount -= 1;
  return true;
};