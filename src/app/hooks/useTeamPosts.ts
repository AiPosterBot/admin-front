import { useCallback } from 'react'

import type { AsyncState } from '../lib/asyncState'
import { useAsync } from '../lib/asyncState'
import { useTeam } from '../context/TeamContext'
import { listTeamPosts, type ListTeamPostsOptions, type TeamPostsListResult } from '../services/postService'

export interface UseTeamPostsReturn {
  state: AsyncState<TeamPostsListResult>
  invalidate: () => void
}

export function useTeamPosts(options: ListTeamPostsOptions = {}): UseTeamPostsReturn {
  const { currentTeamId } = useTeam()

  const fetchPosts = useCallback(() => {
    if (!currentTeamId) {
      return Promise.resolve(null)
    }

    return listTeamPosts(currentTeamId, options)
  }, [
    currentTeamId,
    options.page,
    options.limit,
    options.channelId,
    options.sourceId,
    options.status,
    options.q,
    options.from,
    options.to,
    options.channelTagIds?.join(','),
    options.sourceTagIds?.join(','),
  ])

  const { state, invalidate } = useAsync<TeamPostsListResult>(fetchPosts, [fetchPosts], { keepPreviousData: true })

  return { state, invalidate }
}
