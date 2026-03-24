import { useCallback } from 'react'

import { useTeam } from '../context/TeamContext'
import { useAsync } from '../lib/asyncState'
import { listTeamSources, type ListTeamSourcesOptions, type TeamSourcesListResult } from '../services/sourceService'
import type { AsyncState } from '../lib/asyncState'

export interface UseTeamSourcesReturn {
  state: AsyncState<TeamSourcesListResult>
  invalidate: () => void
}

export function useTeamSources(options: ListTeamSourcesOptions = {}): UseTeamSourcesReturn {
  const { currentTeamId } = useTeam()

  const fetchSources = useCallback(() => {
    if (!currentTeamId) {
      return Promise.resolve(null)
    }

    return listTeamSources(currentTeamId, options)
  }, [currentTeamId, options.page, options.limit, options.status, options.type, options.isActive, options.q, options.tagIds?.join(',')])

  const { state, invalidate } = useAsync<TeamSourcesListResult>(fetchSources, [fetchSources], { keepPreviousData: true })

  return { state, invalidate }
}
