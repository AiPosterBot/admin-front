import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api'
import { toJobView, type JobDetailResponse, type JobLogRecord, type JobView } from './jobService'

interface PaginatedResponse<T> {
  data: T[]
  page: number
  limit: number
  total: number
  hasNext: boolean
}

export interface AdminUserListItem {
  id: string
  email: string
  displayName: string
  isActive: boolean
  canCreateTeam: boolean
  maxTeams: number
  timezone: string
  createdAt: string
  teamsCount: number
  ownedTeamsCount: number
}

export interface AdminUserDetail {
  user: {
    id: string
    email: string
    displayName: string
    isActive: boolean
    canCreateTeam: boolean
    maxTeams: number
    timezone: string
    createdAt: string
  }
  teams: Array<{
    id: string
    name: string
    role: 'owner' | 'member'
    joinedAt: string
  }>
  usage: {
    postsToday: number
    agentRunsMonth: number
  }
}

export interface AdminInviteRecord {
  id: string
  email: string
  status: 'pending' | 'accepted' | 'cancelled'
  inviteToken: string
  invitedByAdminId: string
  invitedByNickname: string
  createdAt: string
  acceptedAt?: string | null
}

export interface AdminTeamListItem {
  id: string
  name: string
  ownerUserId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  membersCount: number
  channelsCount: number
  sourcesCount: number
}

export interface AdminTeamDetail {
  team: {
    id: string
    name: string
    ownerUserId: string
    isActive: boolean
    createdAt: string
    updatedAt: string
  }
  limits: {
    maxPostsPerDay: number
    maxChannels: number
    maxSources: number
    maxAgentRuns: number
    maxMembers: number
  }
  usage: {
    postsToday: number
    postsResetAtUtc: string
    agentRunsThisMonth: number
    agentRunsResetAtUtc: string
  }
  channels: Array<{ id: string; name: string; telegramTarget?: string | null; telegramChatId?: string; telegramUsername?: string; isActive: boolean; publishMode: string }>
  sources: Array<{ id: string; name: string; type: string; status: string; isActive: boolean }>
  members: Array<{ userId: string; displayName: string; email: string; role: 'owner' | 'member'; joinedAt: string }>
}

export interface AdminRecord {
  id: string
  nickname: string
  isRoot: boolean
  isActive: boolean
  createdAt: string
}

export interface AdminSchedulerStatus {
  enabled: boolean
  intervalSec: number
  isTickRunning: boolean
  lastTickStartedAt: string | null
  lastTickFinishedAt: string | null
  nextTickAt: string | null
  lastTickSummary: {
    dueSources: number
    createdSourceJobs: number
    skippedSourceAlreadyQueued: number
    failedSources: number
    dueChannels: number
    createdChannelRefreshJobs: number
    skippedChannelRefreshAlreadyQueued: number
    failedChannels: number
  } | null
}

export interface AdminSchedulerSettingsValue {
  schedulerHeartbeatSec: number
  sourceScanIntervalSec: number
  channelMetadataRefreshIntervalSec: number
}

export interface AdminSchedulerSettingsEntry {
  id: string
  version: number
  createdAt: string
  createdByAdminId: string | null
  createdByAdminNickname: string | null
  note: string | null
  value: AdminSchedulerSettingsValue
}

export interface AdminSchedulerSettingsView {
  defaults: AdminSchedulerSettingsValue
  current: AdminSchedulerSettingsValue
  activeEntry: AdminSchedulerSettingsEntry | null
  history: AdminSchedulerSettingsEntry[]
}

export interface AdminDashboardData {
  kpi: {
    teams: number
    activeTeams: number
    channels: number
    activeChannels: number
    sources: number
    activeSources: number
    items24h: number
    posts24h: number
    runningJobs: number
    failedJobs24h: number
    users: number
    llmCost24h: number
    llmTokens24h: number
    llmRequests24h: number
  }
  recentJobs: Array<{
    id: string
    teamId: string
    type: string
    status: string
    progress: number
    createdAt: string
    sourceId?: string | null
    channelId?: string | null
  }>
  recentErrors: Array<{
    sourceId: string
    teamId: string
    sourceName: string
    lastError: string | null
    updatedAt: string
  }>
}

export interface AdminLlmTraceSummary {
  id: string
  teamId: string
  jobId?: string | null
  operation: string
  stage: string
  model: string
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
  costUsd: number | null
  latencyMs: number | null
  createdAt: string
}

export interface AdminLlmTraceDetail extends AdminLlmTraceSummary {
  promptText: string | null
  responseText: string | null
  toolCalls: Array<Record<string, unknown>>
  rawRequest: Record<string, unknown>
  rawResponse: Record<string, unknown>
  job: { id: string; type: string; status: string } | null
}

export interface AdminLlmAnalyticsData {
  summary: {
    totalRequests: number
    shownRequests: number
    totalCostUsd: number
    totalTokens: number
    avgLatencyMs: number
    avgCostUsd: number
  }
  byModel: Array<{
    model: string
    count: number
    costUsd: number
    totalTokens: number
  }>
  byJob: Array<{
    jobId: string
    teamId: string
    jobType: string
    jobStatus: string
    requestCount: number
    totalCostUsd: number
    totalTokens: number
    latestTraceAt: string
  }>
  recentTraces: AdminLlmTraceSummary[]
}

export interface AdminLlmTracesListResult {
  data: AdminLlmTraceSummary[]
  page: number
  limit: number
  total: number
  hasNext: boolean
  summary: {
    totalRequests: number
    totalCostUsd: number
    totalTokens: number
    avgLatencyMs: number
    avgCostUsd: number
  }
}

export async function getAdminDashboard() {
  return apiGet<AdminDashboardData>('/api/admin/dashboard')
}

export function getAdminSchedulerStatus() {
  return apiGet<AdminSchedulerStatus>('/api/admin/scheduler/status')
}

export function runAdminSchedulerNow() {
  return apiPost<AdminSchedulerStatus>('/api/admin/scheduler/run-now')
}

export function getAdminSchedulerSettings() {
  return apiGet<AdminSchedulerSettingsView>('/api/admin/scheduler/settings')
}

export function createAdminSchedulerSettings(input: AdminSchedulerSettingsValue & { note?: string }) {
  return apiPost<{ entry: AdminSchedulerSettingsEntry; current: AdminSchedulerSettingsValue }>('/api/admin/scheduler/settings', input)
}

export function getAdminLlmAnalytics(input: {
  page?: number
  limit?: number
  teamId?: string
  operation?: string
  from?: string
  to?: string
  q?: string
}) {
  const params = new URLSearchParams({
    page: String(input.page ?? 1),
    limit: String(input.limit ?? 100),
  })

  if (input.teamId) params.set('teamId', input.teamId)
  if (input.operation && input.operation !== 'all') params.set('operation', input.operation)
  if (input.from) params.set('from', input.from)
  if (input.to) params.set('to', input.to)
  if (input.q) params.set('q', input.q)

  return apiGet<AdminLlmAnalyticsData>(`/api/admin/llm-analytics?${params.toString()}`)
}

export async function getAdminLlmTraces(input: {
  page?: number
  limit?: number
  teamId?: string
  operation?: string
  from?: string
  to?: string
  q?: string
}) {
  const params = new URLSearchParams({
    page: String(input.page ?? 1),
    limit: String(input.limit ?? 100),
  })

  if (input.teamId) params.set('teamId', input.teamId)
  if (input.operation && input.operation !== 'all') params.set('operation', input.operation)
  if (input.from) params.set('from', input.from)
  if (input.to) params.set('to', input.to)
  if (input.q) params.set('q', input.q)

  return apiGet<AdminLlmTracesListResult>(`/api/admin/llm-traces?${params.toString()}`)
}

export function getAdminLlmTrace(traceId: string) {
  return apiGet<{ llmTrace: Omit<AdminLlmTraceDetail, 'job'>; job: AdminLlmTraceDetail['job'] }>(`/api/admin/llm-traces/${traceId}`)
}

interface AdminJobDetailResponse extends JobDetailResponse {
  logs: JobLogRecord[]
}

export async function getAdminJobById(jobId: string): Promise<JobView> {
  const response = await apiGet<AdminJobDetailResponse>(`/api/admin/jobs/${jobId}`)
  return {
    ...toJobView(response.job, response.logs, response.llmTraces, response.related),
    diagnostics: response.diagnostics ?? null,
  }
}

export async function getAdminUsers(searchQuery: string) {
  const response = await apiGet<PaginatedResponse<AdminUserListItem>>(
    `/api/admin/users?page=1&limit=100${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`,
  )
  return response.data
}

export function getAdminUser(userId: string) {
  return apiGet<AdminUserDetail>(`/api/admin/users/${userId}`)
}

export function updateAdminUserActive(userId: string, isActive: boolean) {
  return apiPatch(`/api/admin/users/${userId}/active`, { isActive })
}

export function updateAdminUserLimits(userId: string, input: { canCreateTeam: boolean; maxTeams: number }) {
  return apiPatch(`/api/admin/users/${userId}/limits`, input)
}

export async function getAdminInvites() {
  const response = await apiGet<PaginatedResponse<AdminInviteRecord>>('/api/admin/invites?page=1&limit=100')
  return response.data
}

export function createAdminInvite(email: string) {
  return apiPost<{ invite: AdminInviteRecord }>('/api/admin/invites', { email })
}

export function cancelAdminInvite(inviteId: string) {
  return apiDelete(`/api/admin/invites/${inviteId}`)
}

export async function getAdminTeams(searchQuery: string) {
  const response = await apiGet<PaginatedResponse<AdminTeamListItem>>(
    `/api/admin/teams?page=1&limit=100${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`,
  )
  return response.data
}

export function getAdminTeam(teamId: string) {
  return apiGet<AdminTeamDetail>(`/api/admin/teams/${teamId}`)
}

export function updateAdminTeamLimits(teamId: string, input: AdminTeamDetail['limits']) {
  return apiPatch(`/api/admin/teams/${teamId}/limits`, input)
}

export async function getAdmins() {
  const response = await apiGet<PaginatedResponse<AdminRecord>>('/api/admin/admins?page=1&limit=100')
  return response.data
}

export function createAdmin(input: { nickname: string; password: string }) {
  return apiPost<{ admin: AdminRecord }>('/api/admin/admins', input)
}

export function deleteAdmin(adminId: string) {
  return apiDelete(`/api/admin/admins/${adminId}`)
}
