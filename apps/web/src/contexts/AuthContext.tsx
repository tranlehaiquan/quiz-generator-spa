import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  allowSignup: boolean;
  needsSetup: boolean;
  setup: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const TOKEN_KEY = 'aeroquiz_token';

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch { /* noop */ }
}

function removeToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch { /* noop */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [isLoading, setIsLoading] = useState(true);
  const [allowSignup, setAllowSignup] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  const fetchMe = useCallback(async (t: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setToken(t);
      } else {
        removeToken();
        setToken(null);
        setUser(null);
      }
    } catch {
      removeToken();
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = getStoredToken();
    // Check setup status first
    fetch('/api/auth/setup-status')
      .then(r => r.json())
      .then(s => {
        if (s.needsSetup) {
          setNeedsSetup(true);
          setIsLoading(false);
          return;
        }
        if (stored) {
          fetchMe(stored);
        } else {
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (stored) fetchMe(stored);
        else setIsLoading(false);
      });
    // Fetch feature flags
    fetch('/api/auth/config')
      .then(r => r.json())
      .then(c => setAllowSignup(c.allowSignup !== false))
      .catch(() => setAllowSignup(true));
  }, [fetchMe]);

  const setup = async (name: string, email: string, password: string) => {
    const res = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Setup failed');
    }
    const data = await res.json();
    storeToken(data.token);
    setToken(data.token);
    setUser(data.user);
    setNeedsSetup(false);
  };

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Login failed');
    }
    const data = await res.json();
    storeToken(data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const signup = async (name: string, email: string, password: string) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Signup failed');
    }
    const data = await res.json();
    storeToken(data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    removeToken();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, allowSignup, needsSetup, setup, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
