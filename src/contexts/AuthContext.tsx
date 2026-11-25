import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type FC,
  type ReactNode,
} from 'react';
import { getMe, logout as apiLogout } from '../services/authApi';
import type { User } from '../types/auth';

interface AuthContextValue {
  user: User | null;
  authenticated: boolean;
  loading: boolean;
  refreshAuth: () => Promise<User | null>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async (): Promise<User | null> => {
    try {
      const data = await getMe();
      setUser(data.user);
      setAuthenticated(data.authenticated);
      return data.user;
    } catch {
      setUser(null);
      setAuthenticated(false);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
      setAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  return (
    <AuthContext.Provider value={{ user, authenticated, loading, refreshAuth, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
