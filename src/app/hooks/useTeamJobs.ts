import { useCallback, useEffect } from 'react'

import { useTeam } from '../context/TeamContext'
import { useAsync } from '../lib/asyncState'
import { listTeamJobs, type ListTeamJobsOptions, type TeamJobsListResult } from '../services/jobService'
import type { AsyncState } from '../lib/asyncState'

export interface UseTeamJobsReturn {
  state: AsyncState<TeamJobsListResult>
  invalidate: () => void
}

export function useTeamJobs(options: ListTeamJobsOptions = {}): UseTeamJobsReturn {
  const { currentTeamId } = useTeam()

  const fetchJobs = useCallback(() => {
    if (!currentTeamId) {
      return Promise.resolve(null)
    }

    return listTeamJobs(currentTeamId, options)
  }, [
    currentTeamId,
    options.page,
    options.limit,
    options.type,
    options.status,
    options.sourceId,
    options.channelId,
    options.campaignId,
    options.from,
    options.to,
  ])

  const { state, invalidate } = useAsync<TeamJobsListResult>(fetchJobs, [fetchJobs], { keepPreviousData: true })

  useEffect(() => {
    if (!currentTeamId) {
      return
    }

    const timer = window.setInterval(() => {
      invalidate()
    }, 5000)

    return () => {
      window.clearInterval(timer)
    }
  }, [currentTeamId, invalidate])

  return { state, invalidate }
}
