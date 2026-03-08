// ══════════════════════════════════════════════════════════════════════
//  useTeamSources — реактивный список источников текущей команды.
//  Заменяет useState(mockSources.filter(...)), который не обновлялся
//  при смене команды и не реагировал на мутации.
// ══════════════════════════════════════════════════════════════════════

import { useTeam } from '../context/TeamContext';
import { useAsync } from '../lib/asyncState';
import { getTeamSources } from '../services/sourceService';
import type { Source } from '../data/mock-data';
import type { AsyncState } from '../lib/asyncState';

export interface UseTeamSourcesReturn {
  state: AsyncState<Source[]>;
  /** Вызови после любой мутации, чтобы перечитать данные */
  invalidate: () => void;
}

/**
 * Возвращает список источников для текущей команды.
 * Автоматически перезапрашивает данные при смене `currentTeamId`.
 * После мутаций вызывай `invalidate()`.
 *
 * @example
 * const { state, invalidate } = useTeamSources();
 * if (state.status === 'success') {
 *   const sources = state.data;
 * }
 */
export function useTeamSources(): UseTeamSourcesReturn {
  const { currentTeamId } = useTeam();

  const { state, invalidate } = useAsync<Source[]>(
    () =>
      currentTeamId
        ? getTeamSources(currentTeamId)
        : Promise.resolve(null),
    [currentTeamId],
  );

  return { state, invalidate };
}
