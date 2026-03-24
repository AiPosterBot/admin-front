import { useAuth } from '../context/AuthContext'
import { useTeam } from '../context/TeamContext'

export type TeamMemberRole = 'owner' | 'member'

export type Permission =
  | 'source:create'
  | 'source:delete'
  | 'source:pause'
  | 'source:resume'
  | 'source:scan'
  | 'source:configure'
  | 'source:reonboard'
  | 'channel:create'
  | 'channel:delete'
  | 'channel:configure'
  | 'channel:publish'
  | 'member:invite'
  | 'member:remove'
  | 'member:view'
  | 'team:settings'
  | 'team:delete'
  | 'job:view'
  | 'llm:view'
  | 'tag:manage'
  | 'ads:create'
  | 'ads:delete'

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
])

const OWNER_EXTRA_PERMISSIONS: ReadonlySet<Permission> = new Set<Permission>([
  'source:delete',
  'source:reonboard',
  'channel:delete',
  'member:invite',
  'member:remove',
  'team:settings',
  'team:delete',
  'ads:delete',
])

export function can(role: TeamMemberRole | null | undefined, permission: Permission): boolean {
  if (!role) return false
  if (role === 'owner') return true
  return MEMBER_PERMISSIONS.has(permission)
}

export interface TeamPermissions {
  role: TeamMemberRole | null
  can: (permission: Permission) => boolean
  isOwner: boolean
  isMember: boolean
}

export function useTeamPermissions(): TeamPermissions {
  const { currentTeam } = useTeam()
  const { currentUser } = useAuth()
  const role = currentUser && currentTeam ? (currentTeam.myRole as TeamMemberRole) : null

  return {
    role,
    can: (permission: Permission) => can(role, permission),
    isOwner: role === 'owner',
    isMember: role !== null,
  }
}

export interface AdminPermissions {
  isRoot: boolean
  canManageAdmins: boolean
  canViewUsers: boolean
  canManageTeams: boolean
}

export function useAdminPermissions(): AdminPermissions {
  const { currentAdmin } = useAuth()
  const isRoot = currentAdmin?.isRoot ?? false

  return {
    isRoot,
    canManageAdmins: isRoot,
    canViewUsers: true,
    canManageTeams: true,
  }
}

export function permissionsForRole(role: TeamMemberRole): Permission[] {
  if (role === 'owner') {
    return [...Array.from(MEMBER_PERMISSIONS), ...Array.from(OWNER_EXTRA_PERMISSIONS)] as Permission[]
  }

  return Array.from(MEMBER_PERMISSIONS) as Permission[]
}
