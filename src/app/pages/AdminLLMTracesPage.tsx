import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { DateRange } from 'react-day-picker'
import { Activity, BrainCircuit, DollarSign, Filter, Search, Zap } from 'lucide-react'
import { toast } from 'sonner'

import { Pagination } from '../components/Pagination'
import { PeriodPicker } from '../components/PeriodPicker'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { getAdminLlmTraces, getAdminTeams, type AdminTeamListItem, type AdminLlmTraceSummary, type AdminLlmTracesListResult } from '../services/adminService'
import { getLlmOperationLabel, getLlmTraceStageLabel } from '../services/llmTraceService'

const PAGE_SIZE = 20

type OperationFilter = 'all' | 'onboard_website' | 'onboard_rss_article' | 'publish_to_channel' | 'channel_testing'

const OPERATION_OPTIONS: Array<{ value: OperationFilter; label: string }> = [
  { value: 'all', label: 'Все операции' },
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

export function AdminLLMTracesPage() {
  const [teams, setTeams] = useState<AdminTeamListItem[]>([])
  const [teamFilter, setTeamFilter] = useState('all')
  const [operationFilter, setOperationFilter] = useState<OperationFilter>('all')
  const [query, setQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<DateRange | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [traces, setTraces] = useState<AdminLlmTraceSummary[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [summary, setSummary] = useState<AdminLlmTracesListResult['summary'] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void getAdminTeams('')
      .then((items) => setTeams(items))
      .catch(() => setTeams([]))
  }, [])

  const rangeQuery = useMemo(() => getRangeQuery(dateFilter), [dateFilter])

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setIsLoading(true)
      setError('')

      try {
        const result = await getAdminLlmTraces({
          page,
          limit: PAGE_SIZE,
          teamId: teamFilter !== 'all' ? teamFilter : undefined,
          operation: operationFilter !== 'all' ? operationFilter : undefined,
          from: rangeQuery.from,
          to: rangeQuery.to,
          q: query.trim() || undefined,
        })

        if (!isMounted) {
          return
        }

        setTraces(result.data)
        setTotalItems(result.total)
        setSummary(result.summary)
      } catch (loadError) {
        if (!isMounted) {
          return
        }

        const message = loadError instanceof Error ? loadError.message : 'Не удалось загрузить LLM traces'
        setError(message)
        setTraces([])
        setTotalItems(0)
        setSummary(null)
        toast.error(message)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [operationFilter, page, query, rangeQuery.from, rangeQuery.to, teamFilter])

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const totalCost = summary?.totalCostUsd ?? 0
  const totalTokens = summary?.totalTokens ?? 0
  const hasActiveFilters = teamFilter !== 'all' || operationFilter !== 'all' || Boolean(dateFilter) || query.trim().length > 0

  const resetFilters = () => {
    setTeamFilter('all')
    setOperationFilter('all')
    setQuery('')
    setDateFilter(undefined)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">LLM traces</h1>
          <p className="mt-1 text-sm text-gray-500">Полный список вызовов модели по всем командам и операциям.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Трейсов в выборке</CardTitle>
            <BrainCircuit className="size-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Токены в выборке</CardTitle>
            <Zap className="size-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalTokens.toLocaleString('ru-RU')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Стоимость в выборке</CardTitle>
            <DollarSign className="size-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">${totalCost.toFixed(4)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
              placeholder="Поиск по модели..."
              className="pl-9"
            />
          </div>

          <Select
            value={teamFilter}
            onValueChange={(value) => {
              setTeamFilter(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full lg:w-[240px]">
              <SelectValue placeholder="Все команды" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все команды</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <PeriodPicker
            value={dateFilter}
            onChange={(range) => {
              setDateFilter(range)
              setPage(1)
            }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-gray-400" />
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
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {hasActiveFilters ? (
            <button type="button" onClick={resetFilters} className="text-xs text-muted-foreground hover:text-foreground">
              Сбросить фильтры
            </button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Activity className="size-6 animate-pulse text-gray-400" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-300">{error}</div>
      ) : traces.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center text-muted-foreground">
          <BrainCircuit className="mx-auto mb-3 size-10 text-muted-foreground" />
          <p className="text-sm">{hasActiveFilters ? 'Нет трейсов под выбранные фильтры' : 'LLM traces пока нет'}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <div className="divide-y">
            {traces.map((trace) => (
              <Link
                key={trace.id}
                to={`/admin/llm-traces/${trace.id}`}
                state={{ backTo: '/admin/llm-traces' }}
                className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40"
              >
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
                    <Badge variant="outline" className="text-xs">
                      Team {trace.teamId.slice(0, 8)}
                    </Badge>
                    {trace.jobId ? (
                      <Badge variant="outline" className="text-xs">
                        Job
                      </Badge>
                    ) : null}
                  </div>
                  <div className="text-sm text-gray-500">{new Date(trace.createdAt).toLocaleString('ru-RU')}</div>
                </div>

                <div className="hidden shrink-0 items-center gap-6 text-right md:flex">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{(trace.totalTokens ?? 0).toLocaleString('ru-RU')}</div>
                    <div className="text-xs text-gray-400">токенов</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">${(trace.costUsd ?? 0).toFixed(4)}</div>
                    <div className="text-xs text-gray-400">стоимость</div>
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
