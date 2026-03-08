// ══════════════════════════════════════════════════════════════════════
//  Member Service — участники команды и приглашения.
// ══════════════════════════════════════════════════════════════════════

import {
  mockTeamMembers,
  sendInvitation,
  cancelInvitation as _cancelInvitation,
  removeMember as _removeMember,
  getTeamInvitations,
  getTeamUsage,
  type TeamMember,
  type Invitation,
} from '../data/mock-data';
import { ok, err, type ServiceResult } from '../types/dto';
// ── Zod email валидация ───────────────────────────────────────────────
import { safeParse, inviteSchema } from '../lib/validators';

// ── Queries ───────────────────────────────────────────────────────────

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  return mockTeamMembers.filter((m) => m.teamId === teamId && m.isActive);
}

/**
 * Синхронный список участников команды (для дашборда и пр.)
 */
export function getTeamMembersList(teamId: string): TeamMember[] {
  return mockTeamMembers.filter((m) => m.teamId === teamId && m.isActive);
}

export async function getTeamInvitationsList(
  teamId: string,
): Promise<Invitation[]> {
  return getTeamInvitations(teamId);
}

export function getUsage(teamId: string) {
  return getTeamUsage(teamId);
}

// ── Мутации ──────────────────────────────────────────────────────────

export async function inviteMember(
  teamId: string,
  email: string,
): Promise<ServiceResult<Invitation>> {
  if (!teamId) return err('Не выбрана команда');

  // Строгая валидация через централизованную Zod-схему
  const emailValidation = safeParse(inviteSchema, { email });
  if (!emailValidation.ok) {
    return err(
      (emailValidation.errors.issues ?? (emailValidation.errors as any).errors)?.[0]?.message
        ?? 'Некорректный email',
    );
  }

  const existing = mockTeamMembers.find(
    (m) => m.userEmail === email && m.teamId === teamId && m.isActive,
  );
  if (existing) return err('Пользователь уже является участником команды', 'ALREADY_MEMBER');

  const pending = getTeamInvitations(teamId).find(
    (i) => i.email === email && i.status === 'pending',
  );
  if (pending) return err('Приглашение для этого email уже отправлено', 'ALREADY_INVITED');

  const inv = sendInvitation(teamId, email);
  return ok(inv);
}

export async function cancelInvitation(
  inviteId: string,
): Promise<ServiceResult<void>> {
  _cancelInvitation(inviteId);
  return ok(undefined);
}

export async function removeMember(
  memberId: string,
  teamId: string,
): Promise<ServiceResult<void>> {
  const member = mockTeamMembers.find(
    (m) => m.id === memberId && m.teamId === teamId,
  );
  if (!member) return err('Участник не найден');
  if (member.role === 'owner') return err('Нельзя удалить владельца команды', 'OWNER_PROTECTED');
  _removeMember(memberId);
  return ok(undefined);
}