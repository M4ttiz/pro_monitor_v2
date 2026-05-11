import type { Role } from "@pro-monitor/shared";
import { create } from "zustand";
import { apiClient } from "../lib/apiClient";
import { clearStoredAuth, readStoredAuth, writeStoredAuth } from "../lib/authSession";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  role: Role | null;
  login: (username: string, password: string) => Promise<void>;
  updateAccessToken: (accessToken: string | null) => void;
  logout: () => void;
}

const stored = readStoredAuth();

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: stored.accessToken,
  refreshToken: stored.refreshToken,
  role: stored.role,
  login: async (username, password) => {
    const result = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
      role: Role;
    }>("/api/v1/auth/login", { username, password });
    const next = {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      role: result.role
    };
    writeStoredAuth(next);
    set(next);
  },
  updateAccessToken: (accessToken) =>
    set((state) => {
      const next = {
        accessToken,
        refreshToken: state.refreshToken,
        role: state.role
      };
      writeStoredAuth(next);
      return next;
    }),
  logout: () => {
    clearStoredAuth();
    set({ accessToken: null, refreshToken: null, role: null });
  }
}));
