import { apiGet, apiPost, apiStream } from '../lib/api'
import type { AdsCampaign, Job } from '../types/domain'

const teamJobsCache = new Map<string, JobView[]>()
const jobByIdCache = new Map<string, JobView>()

export interface JobLogRecord {
  id: number
  jobId: string
  ts: string
  level: string
  scope: string
  message: string
  meta?: Record<string, unknown> | null
}

export interface JobTraceSummary {
  id: string
  operation: string
  stage: string
  model: string
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
  costUsd: number | string | null
  latencyMs: number | null
  createdAt: string
}

export interface JobDeliveryView {
  postedItemId: string
  postedItemStatus: string
  outboxId: string | null
  outboxStatus: string | null
  telegramMessageId: string | number | null
  deliveryMethod: string | null
  mediaSkippedReason: string | null
  deliveryError: string | null
}

export interface JobLastErrorDiagnosticsView {
  ts: string | null
  message: string
  code: string | null
  details: Record<string, unknown> | null
  providerStatus: number | null
  providerMessage: string | null
  retryAfterSec: number | null
}

export interface JobRetryDiagnosticsView {
  willRetry: boolean
  waitingForRetry: boolean
  willResume: boolean
  nextRunAt: string | null
  delayMs: number | null
  attempts: number
  maxAttempts: number
  phase: string | null
  iteration: number | null
  progress: number | null
}

export interface JobDiagnosticsView {
  lastError: JobLastErrorDiagnosticsView | null
  retry: JobRetryDiagnosticsView | null
}

export interface JobView extends Job {
  startedAt?: string
  sourceId?: string | null
  channelId?: string | null
  campaignId?: string | null
  attempts?: number
  maxAttempts?: number
  runAt?: string | null
  diagnostics?: JobDiagnosticsView | null
  related?: {
    source?: { id: string; name: string; type: string } | null
  channel?: { id: string; name: string; telegramTarget?: string | null; telegramChatId?: string; telegramUsername?: string } | null
    campaign?: { id: string; name: string; status: string } | null
  }
  logEntries: JobLogRecord[]
  llmTraces: JobTraceSummary[]
  delivery?: JobDeliveryView | null
}

export interface JobRecord {
  id: string
  teamId: string
  sourceId?: string | null
  channelId?: string | null
  campaignId?: string | null
  type: Job['type']
  status: JobView['status']
  attempts?: number
  maxAttempts?: number
  runAt?: string | null
  progress: number
  payload: Record<string, unknown>
  result?: Record<string, unknown> | null
  errorText?: string | null
  createdAt: string
  startedAt?: string | null
  completedAt?: string | null
  delivery?: JobDeliveryView | null
}

export interface JobDetailResponse {
  job: JobRecord
  diagnostics?: JobDiagnosticsView | null
  related: JobView['related']
  llmTraces: JobTraceSummary[]
}

interface JobsListResponse {
  data: JobRecord[]
  page: number
  limit: number
  total: number
  hasNext: boolean
}

export interface ListTeamJobsOptions {
  page?: number
  limit?: number
  type?: Job['type']
  status?: JobView['status']
  sourceId?: string
  channelId?: string
  campaignId?: string
  from?: string
  to?: string
}

export interface TeamJobsListResult {
  data: JobView[]
  page: number
  limit: number
  total: number
  hasNext: boolean
  facets?: {
    typeCounts: Record<
      | 'all'
      | 'refresh_channel_metadata'
      | 'publish_to_channel'
      | 'fetch_rss'
      | 'fetch_rss_hybrid'
      | 'fetch_telegram'
      | 'fetch_website'
      | 'onboard_website'
      | 'onboard_rss_article'
      | 'ads_campaign',
      number
    >
    statusCounts: Record<'all' | 'pending' | 'running' | 'success' | 'failed' | 'canceled' | 'timed_out', number>
  }
}

interface JobLogsResponse {
  data: JobLogRecord[]
  page: number
  limit: number
  total: number
  hasNext: boolean
}

function formatLogLine(log: JobLogRecord) {
  const ts = new Date(log.ts).toLocaleTimeString('ru-RU')
  return `[${ts}] [${log.level}] ${log.message}`
}

export function toJobView(record: JobRecord, logs: JobLogRecord[] = [], llmTraces: JobTraceSummary[] = [], related?: JobView['related']): JobView {
  return {
    id: record.id,
    teamId: record.teamId,
    type: record.type,
    status: record.status,
    attempts: record.attempts,
    maxAttempts: record.maxAttempts,
    runAt: record.runAt ?? undefined,
    progress: record.progress,
    params: record.payload ?? {},
    result: record.result ?? undefined,
    error: record.errorText ?? undefined,
    diagnostics: null,
    logs: logs.map((log) => formatLogLine(log)),
    createdAt: record.createdAt,
    completedAt: record.completedAt ?? undefined,
    llmTraceIds: llmTraces.map((trace) => trace.id),
    startedAt: record.startedAt ?? undefined,
    sourceId: record.sourceId ?? undefined,
    channelId: record.channelId ?? undefined,
    campaignId: record.campaignId ?? undefined,
    related,
    logEntries: logs,
    llmTraces,
    delivery: record.delivery ?? null,
  }
}

export async function getTeamJobs(teamId: string): Promise<JobView[]> {
  const response = await listTeamJobs(teamId, { page: 1, limit: 100 })
  teamJobsCache.set(teamId, response.data)
  return response.data
}

export async function listTeamJobs(teamId: string, options: ListTeamJobsOptions = {}): Promise<TeamJobsListResult> {
  const params = new URLSearchParams({
    teamId,
    page: String(options.page ?? 1),
    limit: String(options.limit ?? 20),
  })

  if (options.type) {
    params.set('type', options.type)
  }
  if (options.status) {
    params.set('status', options.status)
  }
  if (options.sourceId) {
    params.set('sourceId', options.sourceId)
  }
  if (options.channelId) {
    params.set('channelId', options.channelId)
  }
  if (options.campaignId) {
    params.set('campaignId', options.campaignId)
  }
  if (options.from) {
    params.set('from', options.from)
  }
  if (options.to) {
    params.set('to', options.to)
  }

  const response = await apiGet<JobsListResponse & TeamJobsListResult>(`/api/jobs?${params.toString()}`)
  const jobs = response.data.map((job) => toJobView(job))

  teamJobsCache.set(teamId, jobs)

  for (const job of jobs) {
    jobByIdCache.set(job.id, job)
  }

  return {
    data: jobs,
    page: response.page,
    limit: response.limit,
    total: response.total,
    hasNext: response.hasNext,
    facets: response.facets,
  }
}

export async function getJobById(jobId: string, teamId: string): Promise<JobView | null> {
  const [detail, logs] = await Promise.all([
    apiGet<JobDetailResponse>(`/api/jobs/${jobId}`),
    apiGet<JobLogsResponse>(`/api/jobs/${jobId}/logs?page=1&limit=100`),
  ])

  if (detail.job.teamId !== teamId) {
    return null
  }

  const job = {
    ...toJobView(detail.job, logs.data, detail.llmTraces, detail.related),
    diagnostics: detail.diagnostics ?? null,
  }
  jobByIdCache.set(job.id, job)
  const current = teamJobsCache.get(teamId) ?? []
  const existingIndex = current.findIndex((entry) => entry.id === job.id)
  const next = [...current]
  if (existingIndex >= 0) {
    next[existingIndex] = job
  } else {
    next.unshift(job)
  }
  teamJobsCache.set(teamId, next)
  return job
}

export async function cancelJob(jobId: string) {
  const response = await apiPost<{ job: JobRecord }>(`/api/jobs/${jobId}/cancel`)
  return toJobView(response.job)
}

export async function subscribeToJob(jobId: string, options: {
  signal?: AbortSignal
  onSnapshot?: (job: JobView) => void
  onProgress?: (payload: { status: JobView['status']; progress: number }) => void
  onLog?: (log: JobLogRecord) => void
  onDone?: (payload: { status: JobView['status']; progress: number }) => void
  onError?: (error: unknown) => void
}) {
  await apiStream(`/api/stream/jobs/${jobId}`, {
    signal: options.signal,
    onMessage: (message) => {
      if (!message.event || !message.data) {
        return
      }

      const payload = JSON.parse(message.data) as Record<string, unknown>

      if (message.event === 'job.snapshot') {
        const detail = payload as unknown as JobDetailResponse
        options.onSnapshot?.({
          ...toJobView(detail.job, [], detail.llmTraces, detail.related),
          diagnostics: detail.diagnostics ?? null,
        })
        return
      }

      if (message.event === 'job.progress') {
        options.onProgress?.({
          status: String(payload.status) as JobView['status'],
          progress: Number(payload.progress ?? 0),
        })
        return
      }

      if (message.event === 'job.log') {
        options.onLog?.({
          id: Number(payload.logId),
          jobId: String(payload.jobId),
          ts: String(payload.ts),
          level: String(payload.level),
          scope: String(payload.scope),
          message: String(payload.message),
          meta: (payload.meta as Record<string, unknown> | null | undefined) ?? null,
        })
        return
      }

      if (message.event === 'job.done') {
        options.onDone?.({
          status: String(payload.status) as JobView['status'],
          progress: Number(payload.progress ?? 100),
        })
      }
    },
    onError: options.onError,
  })
}


export function getSourceId(job: Job) {
  return (job.params as Record<string, unknown>)?.sourceId as string | undefined
}

export function getChannelId(job: Job) {
  return (job.params as Record<string, unknown>)?.channelId as string | undefined
}

export function countByType(jobs: Job[]) {
  const counts: Record<string, number> = { all: jobs.length }
  for (const job of jobs) {
    counts[job.type] = (counts[job.type] ?? 0) + 1
  }
  return counts
}

export function getRelatedCampaign(job: Job): AdsCampaign | null {
  const campaignId = (job.params as Record<string, unknown>)?.campaignId as string | undefined
  if (!campaignId) {
    return null
  }

  return null
}
