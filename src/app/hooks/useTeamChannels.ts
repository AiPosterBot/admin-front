import { useCallback } from 'react'

import { useTeam } from '../context/TeamContext'
import { useAsync } from '../lib/asyncState'
import { listTeamChannels, type ListTeamChannelsOptions, type TeamChannelsListResult } from '../services/channelService'
import type { AsyncState } from '../lib/asyncState'

export interface UseTeamChannelsReturn {
  state: AsyncState<TeamChannelsListResult>
  invalidate: () => void
}

export function useTeamChannels(options: ListTeamChannelsOptions = {}): UseTeamChannelsReturn {
  const { currentTeamId } = useTeam()

  const fetchChannels = useCallback(() => {
    if (!currentTeamId) {
      return Promise.resolve(null)
    }

    return listTeamChannels(currentTeamId, options)
  }, [currentTeamId, options.page, options.limit, options.status, options.q, options.tagIds?.join(',')])

  const { state, invalidate } = useAsync<TeamChannelsListResult>(fetchChannels, [fetchChannels], { keepPreviousData: true })

  return { state, invalidate }
}
