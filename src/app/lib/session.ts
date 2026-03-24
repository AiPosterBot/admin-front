export type AuthMode = "guest" | "user" | "admin";

export interface UserSessionProfile {
  id: string;
  email: string;
  displayName: string;
  canCreateTeam: boolean;
  maxTeams: number;
  timezone: string;
}

export interface AdminSessionProfile {
  id: string;
  nickname: string;
  isRoot: boolean;
  isActive: boolean;
}

export interface AuthSession {
  mode: AuthMode;
  accessToken: string | null;
  refreshToken: string | null;
  user: UserSessionProfile | null;
  admin: AdminSessionProfile | null;
}

export interface TeamSnapshotItem {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  myRole: string;
  limits?: {
    maxPostsPerDay: number;
    maxChannels: number;
    maxSources: number;
    maxAgentRuns: number;
    maxMembers: number;
  };
}

const AUTH_SESSION_KEY = "ai_poster_auth_session";
const TEAM_SNAPSHOT_KEY = "ai_poster_team_snapshot";
const CURRENT_TEAM_ID_KEY = "currentTeamId";

export function getEmptySession(): AuthSession {
  return {
    mode: "guest",
    accessToken: null,
    refreshToken: null,
    user: null,
    admin: null,
  };
}

export function readSession(): AuthSession {
  const raw = localStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) {
    return getEmptySession();
  }

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    return {
      ...getEmptySession(),
      ...parsed,
    };
  } catch {
    clearSession();
    return getEmptySession();
  }
}

export function writeSession(session: AuthSession) {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem(TEAM_SNAPSHOT_KEY);
  localStorage.removeItem(CURRENT_TEAM_ID_KEY);
}

export function readTeamSnapshot(): TeamSnapshotItem[] {
  const raw = localStorage.getItem(TEAM_SNAPSHOT_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as TeamSnapshotItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeTeamSnapshot(teams: TeamSnapshotItem[]) {
  localStorage.setItem(TEAM_SNAPSHOT_KEY, JSON.stringify(teams));
}

export function clearTeamSnapshot() {
  localStorage.removeItem(TEAM_SNAPSHOT_KEY);
  localStorage.removeItem(CURRENT_TEAM_ID_KEY);
}

export function readCurrentTeamId() {
  return localStorage.getItem(CURRENT_TEAM_ID_KEY);
}

export function writeCurrentTeamId(teamId: string | null) {
  if (teamId) {
    localStorage.setItem(CURRENT_TEAM_ID_KEY, teamId);
    return;
  }

  localStorage.removeItem(CURRENT_TEAM_ID_KEY);
}


