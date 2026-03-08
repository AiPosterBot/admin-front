// ══════════════════════════════════════════════════════════════════════
//  useTeamChannels — реактивный список каналов текущей команды.
// ══════════════════════════════════════════════════════════════════════

import { useTeam } from '../context/TeamContext';
import { useAsync } from '../lib/asyncState';
import { getTeamChannels } from '../services/channelService';
import type { Channel } from '../data/mock-data';
import type { AsyncState } from '../lib/asyncState';

export interface UseTeamChannelsReturn {
  state: AsyncState<Channel[]>;
  invalidate: () => void;
}

/**
 * Возвращает список каналов для текущей команды.
 * Автоматически перезапрашивает данные при смене `currentTeamId`.
 */
export function useTeamChannels(): UseTeamChannelsReturn {
  const { currentTeamId } = useTeam();

  const { state, invalidate } = useAsync<Channel[]>(
    () =>
      currentTeamId
        ? getTeamChannels(currentTeamId)
        : Promise.resolve(null),
    [currentTeamId],
  );

  return { state, invalidate };
}
