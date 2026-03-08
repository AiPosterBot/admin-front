// ══════════════════════════════════════════════════════════════════════
//  useTeamItems — реактивный список материалов текущей команды.
// ══════════════════════════════════════════════════════════════════════

import { useTeam } from '../context/TeamContext';
import { useAsync } from '../lib/asyncState';
import { getTeamItems } from '../services/itemService';
import type { Item } from '../data/mock-data';
import type { AsyncState } from '../lib/asyncState';

export interface UseTeamItemsReturn {
  state: AsyncState<Item[]>;
  invalidate: () => void;
}

export function useTeamItems(): UseTeamItemsReturn {
  const { currentTeamId } = useTeam();

  const { state, invalidate } = useAsync<Item[]>(
    () =>
      currentTeamId
        ? getTeamItems(currentTeamId)
        : Promise.resolve(null),
    [currentTeamId],
  );

  return { state, invalidate };
}
