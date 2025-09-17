import { createContext, useContext, useMemo, useState } from 'react';
import { API_BASE } from '../lib/urls';

type AuthState = {
  token: string | null;
  roles: string[];
  email?: string;
};

type AuthContextType = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseJwt(token: string): any | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function extractRolesFromPayload(payload: any): string[] {
  if (!payload) return [];
  // ASP.NET may emit roles under the standard role claim URI
  const dotnetRoleClaim = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
  const claim = payload.role ?? payload.roles ?? payload[dotnetRoleClaim] ?? [];
  return Array.isArray(claim) ? claim : claim ? [claim] : [];
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem('auth:token');
    if (!token) return { token: null, roles: [] };
  const payload = parseJwt(token);
  const roles = extractRolesFromPayload(payload);
    const email = payload?.email as string | undefined;
    return { token, roles, email };
  });

  const login = async (email: string, password: string) => {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      // Try to extract a helpful message from the server response.
      try {
        const data = await res.json();
        const serverMsg = data?.error ?? data?.message ?? (Array.isArray(data) && data[0]?.description) ?? null;
        if (typeof serverMsg === 'string' && serverMsg.length > 0) {
          if (serverMsg.toLowerCase().includes('confirm')) {
            throw new Error('Please confirm your email before signing in.');
          }
          throw new Error(serverMsg);
        }
      } catch (parseErr) {
        // ignore parse errors and fall through to generic message
      }
      // Fallback: include HTTP status for diagnosability
      throw new Error(`Login failed (${res.status} ${res.statusText})`);
    }
    const data = await res.json();
    const token = data?.token as string;
    if (!token) throw new Error('No token');
    localStorage.setItem('auth:token', token);
  const payload = parseJwt(token);
  const roles = extractRolesFromPayload(payload);
    const emailClaim = payload?.email as string | undefined;
    setState({ token, roles, email: emailClaim });
  };

  const register = async (email: string, password: string) => {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      let msg = 'Registration failed';
      try {
        const data = await res.json();
        if (Array.isArray(data)) {
          const first = data[0]?.description || data[0]?.code || '';
          if (first) msg = first;
        } else if (typeof data?.error === 'string') {
          msg = data.error;
        }
      } catch {}
      throw new Error(msg);
    }
  // Registration succeeded. Do not attempt automatic sign-in here because
  // email confirmation is required; surface success to the UI so it can
  // instruct the user to check their email.
  return;
  };

  const resendConfirmation = async (email: string) => {
  await fetch(`${API_BASE}/api/auth/resend-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
  };

  const logout = () => {
    localStorage.removeItem('auth:token');
    setState({ token: null, roles: [] });
  };

  const value = useMemo(() => ({ ...state, login, logout, register, resendConfirmation }), [state.token, state.roles, state.email]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function authHeaders(token?: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
