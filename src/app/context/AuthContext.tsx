import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthType, getAuthType, getCurrentUser, getCurrentAdmin, User, Admin } from '../data/mock-data';

interface AuthContextType {
  authType: AuthType;
  currentUser: User | null;
  currentAdmin: Admin | null;
  isLoggedIn: boolean;
  isAdminLoggedIn: boolean;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => ({
    authType: getAuthType(),
    currentUser: getCurrentUser(),
    currentAdmin: getCurrentAdmin(),
    isLoggedIn: !!localStorage.getItem('isLoggedIn'),
    isAdminLoggedIn: !!localStorage.getItem('isAdminLoggedIn'),
  }));

  const refresh = () => {
    setState({
      authType: getAuthType(),
      currentUser: getCurrentUser(),
      currentAdmin: getCurrentAdmin(),
      isLoggedIn: !!localStorage.getItem('isLoggedIn'),
      isAdminLoggedIn: !!localStorage.getItem('isAdminLoggedIn'),
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
