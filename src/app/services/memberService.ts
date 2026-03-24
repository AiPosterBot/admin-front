import { apiDelete, apiGet, apiPost } from "../lib/api";

export interface TeamMemberRecord {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  role: "owner" | "member";
  isActive: boolean;
  joinedAt: string;
}

export interface TeamInvitationRecord {
  id: string;
  teamId: string;
  email: string;
  invitedByUserId: string;
  invitedByName: string;
  status: "pending" | "accepted" | "cancelled";
  inviteToken: string;
  createdAt: string;
  acceptedAt?: string | null;
}

interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
}

export async function getTeamMembers(teamId: string) {
  const response = await apiGet<PaginatedResponse<TeamMemberRecord>>(
    `/api/teams/${teamId}/members?page=1&limit=100`,
  );
  return response.data;
}

export async function getTeamInvitationsList(teamId: string) {
  const response = await apiGet<PaginatedResponse<TeamInvitationRecord>>(
    `/api/teams/${teamId}/invitations?page=1&limit=100`,
  );
  return response.data;
}

export async function inviteMember(teamId: string, email: string) {
  const response = await apiPost<{ invitation: TeamInvitationRecord }>(
    `/api/teams/${teamId}/invitations`,
    { email },
  );
  return response.invitation;
}

export async function cancelInvitation(teamId: string, invitationId: string) {
  await apiPost(`/api/teams/${teamId}/invitations/${invitationId}/cancel`);
}

export async function removeMember(teamId: string, userId: string) {
  await apiDelete(`/api/teams/${teamId}/members/${userId}`);
}

export async function acceptInvitation(token: string) {
  return apiPost<{ success: boolean; team: { id: string; name: string } }>(
    `/api/invitations/${token}/accept`,
  );
}
