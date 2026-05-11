import type { Role } from "@pro-monitor/shared";

const STORAGE_KEY = "pro-monitor-auth";

export type StoredAuth = {
  accessToken: string | null;
  refreshToken: string | null;
  role: Role | null;
};

const emptyAuth: StoredAuth = {
  accessToken: null,
  refreshToken: null,
  role: null
};

export const readStoredAuth = (): StoredAuth => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyAuth;
    }

    const parsed = JSON.parse(raw) as StoredAuth;
    return {
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
      role: parsed.role ?? null
    };
  } catch {
    return emptyAuth;
  }
};

export const writeStoredAuth = (state: StoredAuth): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const clearStoredAuth = (): void => {
  writeStoredAuth(emptyAuth);
};
