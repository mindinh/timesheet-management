import { create } from 'zustand';
import type { UserRole } from '@/shared/types';
import { setCredentials, clearCredentials, getStoredCredentials } from '@/shared/lib/credentials';

interface AuthUser {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
}

interface AuthState {
  user: AuthUser | null;
  isLoggingIn: boolean;
  isRestoring: boolean; // true while auto-restoring session on reload
  loginError: string | null;

  login: (username: string, password: string) => Promise<void>;
  restoreSession: () => Promise<void>;
  logout: () => void;
}

async function fetchUserInfo(username: string, password: string): Promise<AuthUser | null> {
  try {
    const response = await fetch('/api/timesheet/userInfo()', {
      method: 'GET',
      headers: {
        Authorization: `Basic ${btoa(`${username}:${password}`)}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const u = data?.value ?? data;
    return {
      id: u.id,
      name: `${u.firstName} ${u.lastName}`.trim(),
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role as UserRole,
    };
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggingIn: false,
  isRestoring: true, // start as true until restoreSession() finishes
  loginError: null,

  login: async (username, password) => {
    set({ isLoggingIn: true, loginError: null });
    setCredentials(username, password);
    const user = await fetchUserInfo(username, password);
    if (user) {
      set({ user, isLoggingIn: false, loginError: null });
    } else {
      clearCredentials();
      set({
        user: null,
        isLoggingIn: false,
        loginError: 'Tên đăng nhập hoặc mật khẩu không đúng',
      });
    }
  },

  restoreSession: async () => {
    const stored = getStoredCredentials();
    if (!stored) {
      set({ isRestoring: false });
      return;
    }
    // Re-validate stored credentials against BE
    setCredentials(stored.username, stored.password);
    const user = await fetchUserInfo(stored.username, stored.password);
    if (user) {
      set({ user, isRestoring: false });
    } else {
      clearCredentials();
      set({ user: null, isRestoring: false });
    }
  },

  logout: () => {
    clearCredentials();
    set({ user: null, loginError: null });
  },
}));
