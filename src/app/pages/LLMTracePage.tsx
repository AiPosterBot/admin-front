import { Link, useLocation, useParams } from 'react-router'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Activity, ArrowLeft, BrainCircuit, Braces, ChevronDown, DollarSign, FileJson, Link2, Timer, Wrench, Zap } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible'
import { useAuth } from '../context/AuthContext'
import { useTeam } from '../context/TeamContext'
import { getAdminLlmTrace, type AdminLlmTraceDetail } from '../services/adminService'
import { getLlmOperationLabel, getLlmTraceStageLabel, getTraceById, type LlmTraceWithRelations } from '../services/llmTraceService'

type TraceView =
  | (LlmTraceWithRelations & { mode: 'team' })
  | (AdminLlmTraceDetail & { mode: 'admin' })

interface ParsedToolCall {
  name: string
  argumentsJson: string
  argumentsObject: Record<string, unknown> | null
}

interface PromptViewModel {
  systemPrompt: string | null
  userMessages: string[]
  candidateCount: number | null
}

export function LLMTracePage() {
  const { traceId } = useParams<{ traceId: string }>()
  const location = useLocation()
  const { currentTeamId } = useTeam()
  const { isAdminLoggedIn } = useAuth()
  const [trace, setTrace] = useState<TraceView | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAdminPage = location.pathname.startsWith('/admin/')

  useEffect(() => {
    const load = async () => {
      if (!traceId) {
        setTrace(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        if (isAdminPage) {
          if (!isAdminLoggedIn) {
            setTrace(null)
            return
          }

          const response = await getAdminLlmTrace(traceId)
          setTrace({
            ...response.llmTrace,
            job: response.job,
            mode: 'admin',
          })
          return
        }

        if (!currentTeamId) {
          setTrace(null)
          return
        }

        const response = await getTraceById(traceId, currentTeamId)
        setTrace(response ? { ...response, mode: 'team' } : null)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Не удалось загрузить LLM trace')
        setTrace(null)
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [currentTeamId, isAdminLoggedIn, isAdminPage, traceId])

  const parsedToolCalls = useMemo(() => parseToolCalls(trace?.toolCalls ?? []), [trace?.toolCalls])
  const parsedResponse = useMemo(() => parseJsonObject(trace?.responseText ?? null), [trace?.responseText])
  const promptView = useMemo(() => buildPromptView(trace?.rawRequest ?? {}, trace?.promptText ?? null), [trace?.promptText, trace?.rawRequest])

  if (isLoading) {
    return <div className="text-sm text-gray-500">Загрузка LLM trace...</div>
  }

  if (!trace) {
    return <div className="text-sm text-red-500">LLM trace не найден или недоступен</div>
  }

  const backTo = typeof location.state === 'object' && location.state && 'backTo' in location.state ? String(location.state.backTo) : null
  const backHref = isAdminPage ? backTo ?? '/admin/llm-traces' : '/llm-traces'
  const backLabel =
    isAdminPage && backHref === '/admin/llm-analytics'
      ? 'LLM аналитика'
      : isAdminPage
        ? 'LLM traces'
        : 'LLM traces'
  const jobHref = trace.job ? (isAdminPage ? `/admin/jobs/${trace.job.id}` : `/jobs/${trace.job.id}`) : null
  const jobBackLabel = isAdminPage && backHref.startsWith('/admin/jobs/') ? 'Задача' : backLabel
  const responseSummary = buildResponseSummary(parsedResponse)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to={backHref} className="inline-flex items-center gap-1 hover:text-blue-600">
          <ArrowLeft className="size-3.5" />
          {jobBackLabel}
        </Link>
        <span>/</span>
        <span className="text-gray-900">{getLlmOperationLabel(trace.operation)}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">LLM trace</h1>
            <Badge variant="outline">{trace.model}</Badge>
            <Badge variant="secondary">{getLlmOperationLabel(trace.operation)}</Badge>
            <Badge variant="outline">{getLlmTraceStageLabel(trace.stage)}</Badge>
            {trace.job ? <Badge variant="outline">{trace.job.type}</Badge> : null}
            {isAdminPage ? <Badge variant="destructive">Admin</Badge> : null}
          </div>
          <p className="text-sm text-gray-500">
            Trace ID: <code>{trace.id}</code>
          </p>
          {jobHref ? (
            <Link to={jobHref} state={isAdminPage ? { backTo: location.pathname } : undefined} className="inline-flex text-sm text-blue-600 hover:underline">
              Перейти к связанной задаче
            </Link>
          ) : null}
        </div>
        <BrainCircuit className="size-8 text-blue-500" />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Токены"
          value={(trace.totalTokens ?? 0).toLocaleString('ru-RU')}
          caption={`${(trace.promptTokens ?? 0).toLocaleString('ru-RU')} prompt / ${(trace.completionTokens ?? 0).toLocaleString('ru-RU')} output`}
          icon={<Zap className="size-5 text-blue-500" />}
        />
        <MetricCard
          title="Стоимость"
          value={trace.costUsd === null ? '—' : `$${trace.costUsd.toFixed(6)}`}
          icon={<DollarSign className="size-5 text-green-500" />}
        />
        <MetricCard title="Latency" value={`${trace.latencyMs ?? 0} ms`} icon={<Timer className="size-5 text-amber-500" />} />
        <MetricCard
          title="Создан"
          value={new Date(trace.createdAt).toLocaleString('ru-RU')}
          icon={<Activity className="size-5 text-purple-500" />}
        />
      </div>

      {responseSummary ? (
        <Card>
          <CardHeader>
            <CardTitle>Сводка ответа</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {responseSummary.action ? <SummaryStat label="Action" value={responseSummary.action} icon={<Braces className="size-4 text-blue-500" />} /> : null}
              {responseSummary.verdict ? <SummaryStat label="Verdict" value={responseSummary.verdict} icon={<Activity className="size-4 text-green-500" />} /> : null}
              {responseSummary.reason ? <SummaryStat label="Причина" value={responseSummary.reason} icon={<FileJson className="size-4 text-amber-500" />} /> : null}
              {responseSummary.toolRequests > 0 ? (
                <SummaryStat label="Tool requests" value={String(responseSummary.toolRequests)} icon={<Wrench className="size-4 text-purple-500" />} />
              ) : null}
            </div>
            {responseSummary.configPreview ? (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="mb-2 text-sm font-medium text-gray-700">Кандидат конфигурации</div>
                <pre className="overflow-x-auto text-xs text-gray-700">{JSON.stringify(responseSummary.configPreview, null, 2)}</pre>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Prompt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {promptView.systemPrompt ? (
            <div>
              <div className="mb-2 text-sm font-medium text-gray-700">System prompt</div>
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
                <pre className="whitespace-pre-wrap text-sm">{promptView.systemPrompt}</pre>
              </div>
            </div>
          ) : null}

          {promptView.userMessages.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-medium text-gray-700">User prompt</div>
                {promptView.candidateCount !== null ? <Badge variant="outline">Кандидатов: {promptView.candidateCount}</Badge> : null}
              </div>
              {promptView.userMessages.map((message, index) => (
                <div key={`prompt-message-${index}`} className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  {promptView.userMessages.length > 1 ? <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Сообщение #{index + 1}</div> : null}
                  <pre className="whitespace-pre-wrap text-sm">{message}</pre>
                </div>
              ))}
            </div>
          ) : null}

          {!promptView.systemPrompt && promptView.userMessages.length === 0 ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <pre className="whitespace-pre-wrap text-sm">{trace.promptText ?? '—'}</pre>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Response</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <pre className="whitespace-pre-wrap text-sm">{trace.responseText ?? '—'}</pre>
          </div>
        </CardContent>
      </Card>

      {parsedToolCalls.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Tool calls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {parsedToolCalls.map((toolCall, index) => (
              <div key={`${toolCall.name}-${index}`} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">#{index + 1}</Badge>
                  <Badge variant="outline">{toolCall.name}</Badge>
                </div>
                <div className="text-sm font-medium text-gray-700">Аргументы</div>
                <div className="mt-2 rounded-md bg-gray-900 p-3 text-gray-100">
                  <pre className="overflow-x-auto text-xs">{JSON.stringify(toolCall.argumentsObject ?? toolCall.argumentsJson, null, 2)}</pre>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Сырые данные</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <RawJsonBlock title="Показать raw request" payload={trace.rawRequest} />
          <RawJsonBlock title="Показать raw response" payload={trace.rawResponse} />
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  title,
  value,
  caption,
  icon,
}: {
  title: string
  value: string
  caption?: string
  icon: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {caption ? <p className="mt-1 text-xs text-gray-500">{caption}</p> : null}
      </CardContent>
    </Card>
  )
}

function SummaryStat({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-600">
        {icon}
        {label}
      </div>
      <div className="text-sm text-gray-900">{value}</div>
    </div>
  )
}

function RawJsonBlock({ title, payload }: { title: string; payload: unknown }) {
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="inline-flex items-center gap-2">
          <ChevronDown className="size-4" />
          {title}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        <div className="rounded-lg bg-gray-900 p-4 text-gray-100">
          <pre className="overflow-x-auto text-xs">{JSON.stringify(payload ?? {}, null, 2)}</pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function parseToolCalls(toolCalls: Array<Record<string, unknown>>): ParsedToolCall[] {
  return toolCalls.map((toolCall) => {
    const name = typeof toolCall.name === 'string' ? toolCall.name : 'unknown_tool'
    const argumentsJson = typeof toolCall.argumentsJson === 'string' ? toolCall.argumentsJson : JSON.stringify(toolCall.arguments ?? {}, null, 2)

    return {
      name,
      argumentsJson,
      argumentsObject: parseJsonObject(argumentsJson),
    }
  })
}

function parseJsonObject(value: string | null): Record<string, unknown> | null {
  if (!value) {
    return null
  }

  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function buildPromptView(rawRequest: Record<string, unknown>, promptText: string | null): PromptViewModel {
  const systemPrompt = extractPromptTextFromParts(rawRequest.systemInstruction)
  const contents = Array.isArray(rawRequest.contents) ? rawRequest.contents : []
  const userMessages = contents
    .map((content) => {
      if (!content || typeof content !== 'object') {
        return null
      }

      const role = typeof (content as { role?: unknown }).role === 'string' ? (content as { role: string }).role : ''
      if (role !== 'user') {
        return null
      }

      return extractPromptTextFromParts(content)
    })
    .filter((message): message is string => Boolean(message))

  const fallbackText = promptText?.trim() ?? ''
  if (!systemPrompt && userMessages.length === 0 && fallbackText) {
    return {
      systemPrompt: null,
      userMessages: [fallbackText],
      candidateCount: countPromptCandidates(fallbackText),
    }
  }

  return {
    systemPrompt,
    userMessages,
    candidateCount: countPromptCandidates(userMessages.join('\n\n')),
  }
}

function extractPromptTextFromParts(value: unknown): string | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const parts = Array.isArray((value as { parts?: unknown }).parts) ? ((value as { parts: unknown[] }).parts) : []
  const textParts = parts
    .map((part) => {
      if (!part || typeof part !== 'object') {
        return null
      }

      return typeof (part as { text?: unknown }).text === 'string' ? (part as { text: string }).text : null
    })
    .filter((text): text is string => Boolean(text && text.trim()))

  if (textParts.length === 0) {
    return null
  }

  return textParts.join('\n').trim()
}

function countPromptCandidates(value: string): number | null {
  if (!value) {
    return null
  }

  const matches = value.match(/(?:^|\n)\d+\.\s+ID=/g)
  return matches && matches.length > 0 ? matches.length : null
}

function buildResponseSummary(payload: Record<string, unknown> | null) {
  if (!payload) {
    return null
  }

  return {
    action: typeof payload.action === 'string' ? payload.action : null,
    verdict: typeof payload.verdict === 'string' ? payload.verdict : null,
    reason: typeof payload.reason === 'string' ? payload.reason : null,
    toolRequests: Array.isArray(payload.toolRequests) ? payload.toolRequests.length : 0,
    configPreview: payload.config && typeof payload.config === 'object' && !Array.isArray(payload.config) ? payload.config : null,
  }
}
