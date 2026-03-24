import { useCallback } from 'react'

import type { AsyncState } from '../lib/asyncState'
import { useAsync } from '../lib/asyncState'
import { useTeam } from '../context/TeamContext'
import { listTeamItems, type ListTeamItemsOptions, type TeamItemsListResult } from '../services/itemService'

export interface UseTeamItemsReturn {
  state: AsyncState<TeamItemsListResult>
  invalidate: () => void
}

export function useTeamItems(options: ListTeamItemsOptions = {}): UseTeamItemsReturn {
  const { currentTeamId } = useTeam()

  const fetchItems = useCallback(() => {
    if (!currentTeamId) {
      return Promise.resolve(null)
    }

    return listTeamItems(currentTeamId, options)
  }, [
    currentTeamId,
    options.page,
    options.limit,
    options.sourceId,
    options.sourceIds?.join(','),
    options.published,
    options.q,
    options.from,
    options.to,
    options.sourceTagIds?.join(','),
  ])

  const { state, invalidate } = useAsync<TeamItemsListResult>(fetchItems, [fetchItems], { keepPreviousData: true })

  return { state, invalidate }
}
