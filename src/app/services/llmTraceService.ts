import { apiGet } from '../lib/api'

export interface LlmTraceSummary {
  id: string
  teamId: string
  jobId?: string | null
  operation: string
  stage: string
  model: string
  totalTokens: number | null
  costUsd: number | null
  createdAt: string
}

export interface LlmTraceDetail extends LlmTraceSummary {
  promptTokens: number | null
  completionTokens: number | null
  latencyMs: number | null
  promptText: string | null
  responseText: string | null
  toolCalls: Array<Record<string, unknown>>
  rawRequest: Record<string, unknown>
  rawResponse: Record<string, unknown>
}

export interface LlmTraceJobSummary {
  id: string
  type: string
  status: string
}

interface ListLlmTracesResponse {
  data: Array<{
    id: string
    teamId: string
    jobId?: string | null
    operation: string
    stage: string
    model: string
    totalTokens: number | null
    costUsd: number | null
    createdAt: string
  }>
  page: number
  limit: number
  total: number
  hasNext: boolean
}

interface GetLlmTraceDetailResponse {
  llmTrace: {
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
    promptText: string | null
    responseText: string | null
    toolCalls: Array<Record<string, unknown>>
    rawRequest: Record<string, unknown>
    rawResponse: Record<string, unknown>
    createdAt: string
  }
  job: LlmTraceJobSummary | null
}

export interface TeamLlmTracesResult {
  traces: LlmTraceSummary[]
  total: number
  hasNext: boolean
  facets?: {
    operationCounts: Record<'all' | 'onboard_website' | 'onboard_rss_article' | 'publish_to_channel' | 'channel_testing' | 'ads_campaign', number>
  }
  summary?: {
    totalTokens: number
    totalCostUsd: number
  }
}

export interface LlmTraceWithRelations extends LlmTraceDetail {
  job: LlmTraceJobSummary | null
}

export interface GetTeamTracesOptions {
  page?: number
  limit?: number
  operation?: string
  from?: string
  to?: string
}

export function getLlmOperationLabel(operation: string) {
  switch (operation) {
    case 'onboard_website':
      return 'Онбординг web-источника'
    case 'onboard_rss_article':
      return 'Онбординг RSS article-agent'
    case 'publish_to_channel':
      return 'Публикация в канал'
    case 'channel_testing':
      return 'Тестовая генерация канала'
    case 'ads_campaign':
      return 'Рекламная кампания'
    default:
      return operation.replace(/_/g, ' ')
    }
}

export async function getTeamTraces(teamId: string, options: GetTeamTracesOptions = {}): Promise<TeamLlmTracesResult> {
  const params = new URLSearchParams({
    teamId,
    page: String(options.page ?? 1),
    limit: String(options.limit ?? 100),
  })

  if (options.operation) {
    params.set('operation', options.operation)
  }
  if (options.from) {
    params.set('from', options.from)
  }
  if (options.to) {
    params.set('to', options.to)
  }

  const response = await apiGet<ListLlmTracesResponse & TeamLlmTracesResult>(`/api/llm/traces?${params.toString()}`)

  return {
    traces: response.data.map((trace) => ({
      id: trace.id,
      teamId: trace.teamId,
      jobId: trace.jobId ?? null,
      operation: trace.operation,
      stage: trace.stage,
      model: trace.model,
      totalTokens: trace.totalTokens ?? null,
      costUsd: trace.costUsd === null ? null : Number(trace.costUsd),
      createdAt: trace.createdAt,
    })),
    total: response.total,
    hasNext: response.hasNext,
    facets: response.facets,
    summary: response.summary,
  }
}

export function getLlmTraceStageLabel(stage: string) {
  switch (stage) {
    case 'candidate_selection':
      return 'Выбор материала'
    case 'post_generation':
      return 'Генерация поста'
    default:
      return 'Основной вызов'
  }
}

export async function getTraceById(traceId: string, teamId: string): Promise<LlmTraceWithRelations | null> {
  const response = await apiGet<GetLlmTraceDetailResponse>(`/api/llm/traces/${traceId}`)
  if (response.llmTrace.teamId !== teamId) {
    return null
  }

  return {
    id: response.llmTrace.id,
    teamId: response.llmTrace.teamId,
    jobId: response.llmTrace.jobId ?? null,
    operation: response.llmTrace.operation,
    stage: response.llmTrace.stage,
    model: response.llmTrace.model,
    promptTokens: response.llmTrace.promptTokens ?? null,
    completionTokens: response.llmTrace.completionTokens ?? null,
    totalTokens: response.llmTrace.totalTokens ?? null,
    costUsd: response.llmTrace.costUsd === null ? null : Number(response.llmTrace.costUsd),
    latencyMs: response.llmTrace.latencyMs ?? null,
    promptText: response.llmTrace.promptText ?? null,
    responseText: response.llmTrace.responseText ?? null,
    toolCalls: response.llmTrace.toolCalls ?? [],
    rawRequest: response.llmTrace.rawRequest ?? {},
    rawResponse: response.llmTrace.rawResponse ?? {},
    createdAt: response.llmTrace.createdAt,
    job: response.job,
  }
}

export function sumCost(traces: LlmTraceSummary[]) {
  return traces.reduce((acc, trace) => acc + (trace.costUsd ?? 0), 0)
}

export function sumTokens(traces: LlmTraceSummary[]) {
  return traces.reduce((acc, trace) => acc + (trace.totalTokens ?? 0), 0)
}
