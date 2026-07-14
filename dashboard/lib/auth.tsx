'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; organizationName?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetch('https://atheer-agent-api.onrender.com/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user);
          } else {
            localStorage.removeItem('accessToken');
          }
        })
        .catch(() => localStorage.removeItem('accessToken'))
        .finally(() => setIsLoading(false));
    } else {
      // Avoid synchronous setState to prevent cascade
      Promise.resolve().then(() => setIsLoading(false));
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch('https://atheer-agent-api.onrender.com/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Login failed');
    localStorage.setItem('accessToken', data.token);
    setUser(data.user);
  };

  const register = async (data: { name: string; email: string; password: string; organizationName?: string }) => {
    const response = await fetch('https://atheer-agent-api.onrender.com/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password,
        organizationName: data.organizationName || `${data.name}'s Organization`,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Registration failed');
    localStorage.setItem('accessToken', result.token);
    setUser(result.user);
  };

  const logout = async () => {
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useSession = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useSession must be used within AuthProvider');
  return context;
};

export const useAuth = useSession;
