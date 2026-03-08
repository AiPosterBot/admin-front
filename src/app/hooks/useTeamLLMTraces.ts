// ══════════════════════════════════════════════════════════════════════
//  useTeamLLMTraces — реактивный список LLM-трейсов текущей команды.
// ══════════════════════════════════════════════════════════════════════

import { useTeam } from '../context/TeamContext';
import { useAsync } from '../lib/asyncState';
import { getTeamTraces } from '../services/llmTraceService';
import type { LLMTrace } from '../data/mock-data';
import type { AsyncState } from '../lib/asyncState';

export interface UseTeamLLMTracesReturn {
  state: AsyncState<LLMTrace[]>;
  invalidate: () => void;
}

export function useTeamLLMTraces(): UseTeamLLMTracesReturn {
  const { currentTeamId } = useTeam();

  const { state, invalidate } = useAsync<LLMTrace[]>(
    () =>
      currentTeamId
        ? getTeamTraces(currentTeamId)
        : Promise.resolve(null),
    [currentTeamId],
  );

  return { state, invalidate };
}
