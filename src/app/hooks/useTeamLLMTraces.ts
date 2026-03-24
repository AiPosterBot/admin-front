import { useCallback, useEffect } from 'react'

import { useTeam } from '../context/TeamContext'
import { useAsync } from '../lib/asyncState'
import { getTeamTraces, type GetTeamTracesOptions, type TeamLlmTracesResult } from '../services/llmTraceService'
import type { AsyncState } from '../lib/asyncState'

export interface UseTeamLlmTracesReturn {
  state: AsyncState<TeamLlmTracesResult>
  invalidate: () => void
}

export function useTeamLLMTraces(options: GetTeamTracesOptions = {}): UseTeamLlmTracesReturn {
  const { currentTeamId } = useTeam()

  const fetchTraces = useCallback(() => {
    if (!currentTeamId) {
      return Promise.resolve(null)
    }

    return getTeamTraces(currentTeamId, options)
  }, [currentTeamId, options.page, options.limit, options.operation, options.from, options.to])

  const { state, invalidate } = useAsync<TeamLlmTracesResult>(fetchTraces, [fetchTraces], { keepPreviousData: true })

  useEffect(() => {
    if (!currentTeamId) {
      return
    }

    const timer = window.setInterval(() => {
      invalidate()
    }, 10000)

    return () => {
      window.clearInterval(timer)
    }
  }, [currentTeamId, invalidate])

  return { state, invalidate }
}
