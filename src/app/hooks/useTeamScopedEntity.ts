import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import { useTeam } from '../context/TeamContext'
import { type AsyncState, useAsync } from '../lib/asyncState'

interface TeamOwned {
  teamId: string
  id: string
}

export interface UseTeamScopedEntityReturn<T extends TeamOwned> {
  state: AsyncState<T>
  isLoading: boolean
  isFound: boolean
  invalidate: () => void
  setData: (data: T) => void
}

export function useTeamScopedEntity<T extends TeamOwned>(
  fetcher: () => Promise<T | null>,
  deps: unknown[],
  fallbackPath = '/',
): UseTeamScopedEntityReturn<T> {
  const { currentTeamId } = useTeam()
  const navigate = useNavigate()

  const { state, invalidate, setData } = useAsync<T>(
    async () => {
      if (!currentTeamId) {
        return null
      }

      const entity = await fetcher()
      if (!entity || entity.teamId !== currentTeamId) {
        return null
      }

      return entity
    },
    deps,
  )

  useEffect(() => {
    if (state.status === 'empty' || state.status === 'error') {
      navigate(fallbackPath, { replace: true })
    }
  }, [fallbackPath, navigate, state.status])

  return {
    state,
    isLoading: state.status === 'loading',
    isFound: state.status === 'success',
    invalidate,
    setData,
  }
}
