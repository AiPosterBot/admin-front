import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUserTeams } from '../data/mock-data';

interface TeamContextType {
  currentTeamId: string | null;
  setCurrentTeamId: (teamId: string) => void;
  hasTeams: boolean;
  refreshTeams: () => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const [currentTeamId, setCurrentTeamIdState] = useState<string | null>(null);
  const [hasTeams, setHasTeams] = useState(false);

  const loadTeams = () => {
    const teams = getUserTeams();
    setHasTeams(teams.length > 0);

    if (teams.length > 0) {
      const savedTeamId = localStorage.getItem('currentTeamId');

      if (savedTeamId && teams.find(t => t.id === savedTeamId)) {
        setCurrentTeamIdState(savedTeamId);
      } else {
        setCurrentTeamIdState(teams[0].id);
        localStorage.setItem('currentTeamId', teams[0].id);
      }
    } else {
      setCurrentTeamIdState(null);
      localStorage.removeItem('currentTeamId');
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const setCurrentTeamId = (teamId: string) => {
    setCurrentTeamIdState(teamId);
    localStorage.setItem('currentTeamId', teamId);
  };

  const refreshTeams = () => {
    loadTeams();
  };

  return (
    <TeamContext.Provider value={{ currentTeamId, setCurrentTeamId, hasTeams, refreshTeams }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}
