import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { DateRange } from 'react-day-picker'
import { Activity, BrainCircuit, DollarSign, Filter, Zap } from 'lucide-react'

import { Pagination } from '../components/Pagination'
import { PeriodPicker } from '../components/PeriodPicker'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { useTeam } from '../context/TeamContext'
import { useTeamLLMTraces } from '../hooks/useTeamLLMTraces'
import { getLlmOperationLabel, getLlmTraceStageLabel, sumCost, sumTokens } from '../services/llmTraceService'

const PAGE_SIZE = 15

type OperationFilter = 'all' | 'onboard_website' | 'onboard_rss_article' | 'publish_to_channel' | 'channel_testing'

const OPERATION_OPTIONS: Array<{ value: OperationFilter; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 'onboard_website', label: 'Онбординг сайта' },
  { value: 'onboard_rss_article', label: 'RSS article-agent' },
  { value: 'publish_to_channel', label: 'Публикация' },
  { value: 'channel_testing', label: 'Тест канала' },
]

function getRangeQuery(range: DateRange | undefined) {
  if (!range?.from) {
    return { from: undefined, to: undefined }
  }

  const from = new Date(range.from)
  from.setHours(0, 0, 0, 0)

  if (!range.to) {
    return {
      from: from.toISOString(),
      to: undefined,
    }
  }

  const to = new Date(range.to)
  to.setHours(23, 59, 59, 999)

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  }
}

export function TeamLLMTracesPage() {
  const { currentTeam, currentTeamId } = useTeam()
  const [operationFilter, setOperationFilter] = useState<OperationFilter>('all')
  const [dateFilter, setDateFilter] = useState<DateRange | undefined>(undefined)
  const [page, setPage] = useState(1)

  const rangeQuery = useMemo(() => getRangeQuery(dateFilter), [dateFilter])
  const { state } = useTeamLLMTraces({
    page,
    limit: PAGE_SIZE,
    operation: operationFilter !== 'all' ? operationFilter : undefined,
    from: rangeQuery.from,
    to: rangeQuery.to,
  })

  const tracesResult = state.status === 'success' ? state.data : null
  const traces = tracesResult?.traces ?? []
  const totalItems = tracesResult?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const totalCost = tracesResult?.summary?.totalCostUsd ?? sumCost(traces)
  const totalTokens = tracesResult?.summary?.totalTokens ?? sumTokens(traces)
  const operationCounts = tracesResult?.facets?.operationCounts ?? {
    all: totalItems,
    onboard_website: 0,
    onboard_rss_article: 0,
    publish_to_channel: 0,
    channel_testing: 0,
  }

  if (!currentTeamId || !currentTeam) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-2xl font-bold text-foreground">Команда не выбрана</h1>
        <p className="mt-2 text-sm text-muted-foreground">Выберите команду, чтобы смотреть LLM-трейсы.</p>
      </div>
    )
  }

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <div className="flex items-center justify-center py-24">
        <Activity className="size-6 animate-pulse text-muted-foreground" />
      </div>
    )
  }

  if (state.status === 'error') {
    return <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">{state.error}</div>
  }

  const hasActiveFilters = operationFilter !== 'all' || Boolean(dateFilter)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">LLM-трейсы</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {currentTeam.name} · {totalItems} вызовов модели
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Трейсов в выборке</CardTitle>
            <BrainCircuit className="size-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Токены в выборке</CardTitle>
            <Zap className="size-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalTokens.toLocaleString('ru-RU')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Стоимость в выборке</CardTitle>
            <DollarSign className="size-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">${totalCost.toFixed(4)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-muted-foreground" />
            <div className="flex flex-wrap items-center gap-1">
              {OPERATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setOperationFilter(option.value)
                    setPage(1)
                  }}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    operationFilter === option.value
                      ? 'bg-foreground text-background shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span>{option.label}</span>
                  <span className={`ml-1 text-xs tabular-nums ${operationFilter === option.value ? 'opacity-70' : 'text-muted-foreground'}`}>
                    {operationCounts[option.value]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="h-5 w-px bg-border" />

          <PeriodPicker
            value={dateFilter}
            onChange={(range) => {
              setDateFilter(range)
              setPage(1)
            }}
          />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setOperationFilter('all')
              setDateFilter(undefined)
              setPage(1)
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Сбросить фильтры
          </button>
        )}
      </div>

      {traces.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center text-muted-foreground">
          <BrainCircuit className="mx-auto mb-3 size-10 text-muted-foreground" />
          <p className="text-sm">{totalItems === 0 ? 'LLM-трейсов пока нет' : 'Нет трейсов под выбранные фильтры'}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <div className="divide-y">
            {traces.map((trace) => (
              <Link key={trace.id} to={`/llm-traces/${trace.id}`} className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <BrainCircuit className="size-4 text-purple-500" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{trace.model}</Badge>
                    <Badge variant="secondary" className="text-xs">
                      {getLlmOperationLabel(trace.operation)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {getLlmTraceStageLabel(trace.stage)}
                    </Badge>
                    {trace.jobId && (
                      <Badge variant="outline" className="text-xs">
                        Job
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">{new Date(trace.createdAt).toLocaleString('ru-RU')}</div>
                </div>

                <div className="hidden shrink-0 items-center gap-6 text-right md:flex">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{(trace.totalTokens ?? 0).toLocaleString('ru-RU')}</div>
                    <div className="text-xs text-muted-foreground">токенов</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">${(trace.costUsd ?? 0).toFixed(4)}</div>
                    <div className="text-xs text-muted-foreground">стоимость</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={totalItems} pageSize={PAGE_SIZE} />
    </div>
  )
}
