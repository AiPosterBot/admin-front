// ══════════════════════════════════════════════════════════════════════
//  useTeamJobs — реактивный список задач текущей команды.
// ══════════════════════════════════════════════════════════════════════

import { useTeam } from '../context/TeamContext';
import { useAsync } from '../lib/asyncState';
import { getTeamJobs } from '../services/jobService';
import type { Job } from '../data/mock-data';
import type { AsyncState } from '../lib/asyncState';

export interface UseTeamJobsReturn {
  state: AsyncState<Job[]>;
  invalidate: () => void;
}

export function useTeamJobs(): UseTeamJobsReturn {
  const { currentTeamId } = useTeam();

  const { state, invalidate } = useAsync<Job[]>(
    () =>
      currentTeamId
        ? getTeamJobs(currentTeamId)
        : Promise.resolve(null),
    [currentTeamId],
  );

  return { state, invalidate };
}
