// ══════════════════════════════════════════════════════════════════════
//  useTeamMembers — реактивный список участников текущей команды.
// ══════════════════════════════════════════════════════════════════════

import { useTeam } from '../context/TeamContext';
import { useAsync } from '../lib/asyncState';
import { getTeamMembers, getTeamInvitationsList } from '../services/memberService';
import type { TeamMember, Invitation } from '../data/mock-data';
import type { AsyncState } from '../lib/asyncState';

export interface TeamMembersData {
  members: TeamMember[];
  invitations: Invitation[];
}

export interface UseTeamMembersReturn {
  state: AsyncState<TeamMembersData>;
  invalidate: () => void;
}

/**
 * Возвращает участников и приглашения для текущей команды.
 * Автоматически перезапрашивает данные при смене `currentTeamId`.
 */
export function useTeamMembers(): UseTeamMembersReturn {
  const { currentTeamId } = useTeam();

  const { state, invalidate } = useAsync<TeamMembersData>(
    async () => {
      if (!currentTeamId) return null;
      const [members, invitations] = await Promise.all([
        getTeamMembers(currentTeamId),
        getTeamInvitationsList(currentTeamId),
      ]);
      return { members, invitations };
    },
    [currentTeamId],
  );

  return { state, invalidate };
}
