// ══════════════════════════════════════════════════════════════════════
//  Централизованная RBAC-модель.
//  Единственное место, где определено: «кто что может делать».
//  При расширении ролей или прав меняй только этот файл.
// ══════════════════════════════════════════════════════════════════════

import { useTeam } from '../context/TeamContext';
import { useAuth } from '../context/AuthContext';
import {
  getCurrentUser,
  isTeamOwner,
  mockTeamMembers,
} from '../data/mock-data';
import type { TeamMemberRole } from '../data/mock-data';

// ── Определение прав ─────────────────────────────────────────────────

export type Permission =
  // Источники
  | 'source:create'
  | 'source:delete'
  | 'source:pause'
  | 'source:resume'
  | 'source:scan'
  | 'source:configure'
  | 'source:reonboard'
  // Каналы
  | 'channel:create'
  | 'channel:delete'
  | 'channel:configure'
  | 'channel:publish'
  // Участники
  | 'member:invite'
  | 'member:remove'
  | 'member:view'
  // Команда
  | 'team:settings'
  | 'team:delete'
  // LLM / джобы (только чтение у member)
  | 'job:view'
  | 'llm:view'
  // Теги
  | 'tag:manage'
  // Рекламные кампании
  | 'ads:create'
  | 'ads:delete';

// ── Матрица прав ─────────────────────────────────────────────────────

/** Права, доступные участнику (не owner) команды */
const MEMBER_PERMISSIONS: ReadonlySet<Permission> = new Set<Permission>([
  'source:create',
  'source:pause',
  'source:resume',
  'source:scan',
  'source:configure',
  'channel:create',
  'channel:configure',
  'channel:publish',
  'member:view',
  'job:view',
  'llm:view',
  'tag:manage',
  'ads:create',
]);

/** Права, доступные owner сверх member */
const OWNER_EXTRA_PERMISSIONS: ReadonlySet<Permission> = new Set<Permission>([
  'source:delete',
  'source:reonboard',
  'channel:delete',
  'member:invite',
  'member:remove',
  'team:settings',
  'team:delete',
  'ads:delete',
]);

// ── Основная функция проверки ─────────────────────────────────────────

/**
 * Проверяет право `permission` для роли в команде.
 * Null-safe: если роль неизвестна — возвращает false.
 */
export function can(
  role: TeamMemberRole | null | undefined,
  permission: Permission,
): boolean {
  if (!role) return false;
  if (role === 'owner') return true; // owner всесилен
  return MEMBER_PERMISSIONS.has(permission);
}

// ── Хук для использования в компонентах ──────────────────────────────

export interface TeamPermissions {
  /** Текущая роль в команде */
  role: TeamMemberRole | null;
  /** Проверить право */
  can: (permission: Permission) => boolean;
  isOwner: boolean;
  isMember: boolean;
}

/**
 * Возвращает объект с ролью и функцией can() для текущего пользователя
 * в текущей команде.
 *
 * @example
 * const { can } = useTeamPermissions();
 * if (can('source:delete')) { ... }
 */
export function useTeamPermissions(): TeamPermissions {
  const { currentTeamId } = useTeam();
  const { currentUser } = useAuth();

  let role: TeamMemberRole | null = null;

  if (currentUser && currentTeamId) {
    if (isTeamOwner(currentUser.id, currentTeamId)) {
      role = 'owner';
    } else {
      const membership = mockTeamMembers.find(
        (m) => m.userId === currentUser.id && m.teamId === currentTeamId && m.isActive,
      );
      role = membership?.role ?? null;
    }
  }

  return {
    role,
    can: (permission: Permission) => can(role, permission),
    isOwner: role === 'owner',
    isMember: role !== null,
  };
}

// ── Хук для Admin-уровня ─────────────────────────────────────────────

export interface AdminPermissions {
  isRoot: boolean;
  /** root может всё в admin-панели; обычный admin — ограниченно */
  canManageAdmins: boolean;
  canViewUsers: boolean;
  canManageTeams: boolean;
}

export function useAdminPermissions(): AdminPermissions {
  const { currentAdmin } = useAuth();
  const isRoot = currentAdmin?.isRoot ?? false;

  return {
    isRoot,
    canManageAdmins: isRoot,
    canViewUsers: true,        // любой admin может смотреть
    canManageTeams: true,      // любой admin может управлять
  };
}

// ── Утилиты ──────────────────────────────────────────────────────────

/** Возвращает массив прав конкретной роли (для документации/тестов) */
export function permissionsForRole(role: TeamMemberRole): Permission[] {
  if (role === 'owner') {
    return [
      ...Array.from(MEMBER_PERMISSIONS),
      ...Array.from(OWNER_EXTRA_PERMISSIONS),
    ] as Permission[];
  }
  return Array.from(MEMBER_PERMISSIONS) as Permission[];
}
