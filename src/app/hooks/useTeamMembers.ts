import { useTeam } from '../context/TeamContext'
import { useAsync } from '../lib/asyncState'
import type { AsyncState } from '../lib/asyncState'
import { getTeamInvitationsList, getTeamMembers } from '../services/memberService'
import type { TeamInvitationRecord, TeamMemberRecord } from '../services/memberService'

export interface TeamMembersData {
  members: TeamMemberRecord[]
  invitations: TeamInvitationRecord[]
}

export interface UseTeamMembersReturn {
  state: AsyncState<TeamMembersData>
  invalidate: () => void
}

// Реактивно загружает участников и приглашения текущей команды.
export function useTeamMembers(): UseTeamMembersReturn {
  const { currentTeamId } = useTeam()

  const { state, invalidate } = useAsync<TeamMembersData>(
    async () => {
      if (!currentTeamId) return null

      const [members, invitations] = await Promise.all([
        getTeamMembers(currentTeamId),
        getTeamInvitationsList(currentTeamId),
      ])

      return { members, invitations }
    },
    [currentTeamId],
  )

  return { state, invalidate }
}
