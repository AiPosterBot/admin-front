import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiGet, apiPost } from "../lib/api";
import {
  clearTeamSnapshot,
  readCurrentTeamId,
  readTeamSnapshot,
  writeCurrentTeamId,
  writeTeamSnapshot,
  type TeamSnapshotItem,
} from "../lib/session";
import { useAuth } from "./AuthContext";

interface TeamContextType {
  currentTeamId: string | null;
  currentTeam: TeamSnapshotItem | null;
  teams: TeamSnapshotItem[];
  hasTeams: boolean;
  isLoading: boolean;
  setCurrentTeamId: (teamId: string) => void;
  refreshTeams: () => Promise<void>;
  createTeam: (name: string) => Promise<TeamSnapshotItem>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

interface GetMyTeamsResponse {
  data: Array<{
    id: string;
    name: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    myRole: string;
  }>;
}

interface TeamDetailsResponse {
  team: {
    id: string;
    name: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  limits: NonNullable<TeamSnapshotItem["limits"]>;
  myRole: string;
}

interface CreateTeamResponse {
  team: {
    id: string;
    name: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

function normalizeTeams(items: GetMyTeamsResponse["data"], previousTeams: TeamSnapshotItem[] = []): TeamSnapshotItem[] {
  const previousById = new Map(previousTeams.map((team) => [team.id, team]));

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    isActive: item.isActive,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    myRole: item.myRole,
    limits: previousById.get(item.id)?.limits,
  }));
}

export function TeamProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn, currentUser, isReady } = useAuth();
  const [teams, setTeams] = useState<TeamSnapshotItem[]>(() => readTeamSnapshot());
  const [currentTeamId, setCurrentTeamIdState] = useState<string | null>(() => readCurrentTeamId());
  const [isLoading, setIsLoading] = useState(true);

  const applyTeams = useCallback((nextTeams: TeamSnapshotItem[]) => {
    setTeams(nextTeams);
    writeTeamSnapshot(nextTeams);

    if (nextTeams.length === 0) {
      setCurrentTeamIdState(null);
      writeCurrentTeamId(null);
      return;
    }

    const savedTeamId = readCurrentTeamId();
    const validCurrentTeamId = savedTeamId && nextTeams.some((team) => team.id === savedTeamId)
      ? savedTeamId
      : nextTeams[0].id;

    setCurrentTeamIdState(validCurrentTeamId);
    writeCurrentTeamId(validCurrentTeamId);
  }, []);

  const applyTeamDetails = useCallback((teamId: string, details: TeamDetailsResponse) => {
    setTeams((currentTeams) => {
      const nextTeams = currentTeams.map((team) => (
        team.id === teamId
          ? {
              ...team,
              name: details.team.name,
              isActive: details.team.isActive,
              createdAt: details.team.createdAt,
              updatedAt: details.team.updatedAt,
              myRole: details.myRole,
              limits: details.limits,
            }
          : team
      ));

      writeTeamSnapshot(nextTeams);
      return nextTeams;
    });
  }, []);

  const refreshTeams = useCallback(async () => {
    if (!isLoggedIn || !currentUser) {
      clearTeamSnapshot();
      setTeams([]);
      setCurrentTeamIdState(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiGet<GetMyTeamsResponse>("/api/teams/my?page=1&limit=100");
      applyTeams(normalizeTeams(response.data, readTeamSnapshot()));
    } finally {
      setIsLoading(false);
    }
  }, [applyTeams, currentUser, isLoggedIn]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isLoggedIn || !currentUser) {
      clearTeamSnapshot();
      setTeams([]);
      setCurrentTeamIdState(null);
      setIsLoading(false);
      return;
    }

    void refreshTeams();
  }, [currentUser, isLoggedIn, isReady, refreshTeams]);

  useEffect(() => {
    if (!isReady || !isLoggedIn || !currentUser || !currentTeamId) {
      return;
    }

    let isMounted = true;

    void apiGet<TeamDetailsResponse>(`/api/teams/${currentTeamId}`)
      .then((response) => {
        if (isMounted) {
          applyTeamDetails(currentTeamId, response);
        }
      })
      .catch(() => {
        // Keep working with the lightweight snapshot if the detail request fails.
      });

    return () => {
      isMounted = false;
    };
  }, [applyTeamDetails, currentTeamId, currentUser, isLoggedIn, isReady]);

  const setCurrentTeamId = useCallback((teamId: string) => {
    setCurrentTeamIdState(teamId);
    writeCurrentTeamId(teamId);
  }, []);

  const createTeam = useCallback(async (name: string) => {
    const response = await apiPost<CreateTeamResponse>("/api/teams", { name });

    const createdTeam: TeamSnapshotItem = {
      id: response.team.id,
      name: response.team.name,
      isActive: response.team.isActive,
      createdAt: response.team.createdAt,
      updatedAt: response.team.updatedAt,
      myRole: "owner",
    };

    const nextTeams = [createdTeam, ...teams.filter((team) => team.id !== createdTeam.id)];
    applyTeams(nextTeams);
    setCurrentTeamId(createdTeam.id);
    return createdTeam;
  }, [applyTeams, setCurrentTeamId, teams]);

  const value = useMemo<TeamContextType>(() => ({
    currentTeamId,
    currentTeam: teams.find((team) => team.id === currentTeamId) ?? null,
    teams,
    hasTeams: teams.length > 0,
    isLoading,
    setCurrentTeamId,
    refreshTeams,
    createTeam,
  }), [currentTeamId, teams, isLoading, setCurrentTeamId, refreshTeams, createTeam]);

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error("useTeam must be used within a TeamProvider");
  }
  return context;
}

