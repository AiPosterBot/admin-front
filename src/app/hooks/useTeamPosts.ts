// ══════════════════════════════════════════════════════════════════════
//  useTeamPosts — реактивный список публикаций текущей команды.
// ══════════════════════════════════════════════════════════════════════

import { useTeam } from '../context/TeamContext';
import { useAsync } from '../lib/asyncState';
import { getTeamPosts } from '../services/postService';
import type { PostedItem } from '../data/mock-data';
import type { AsyncState } from '../lib/asyncState';

export interface UseTeamPostsReturn {
  state: AsyncState<PostedItem[]>;
  invalidate: () => void;
}

export function useTeamPosts(): UseTeamPostsReturn {
  const { currentTeamId } = useTeam();

  const { state, invalidate } = useAsync<PostedItem[]>(
    () =>
      currentTeamId
        ? getTeamPosts(currentTeamId)
        : Promise.resolve(null),
    [currentTeamId],
  );

  return { state, invalidate };
}
