const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";
import { readStoredAuth, writeStoredAuth } from "./authSession";

type UnauthorizedHandler = () => void;
type AccessTokenRefreshHandler = (accessToken: string) => void;

let onUnauthorized: UnauthorizedHandler | null = null;
let onAccessTokenRefreshed: AccessTokenRefreshHandler | null = null;
let refreshInFlight: Promise<string | null> | null = null;

const parseBody = async <T>(response: Response): Promise<T> => {
  return response.json() as Promise<T>;
};

const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const auth = readStoredAuth();
    if (!auth.refreshToken) {
      return null;
    }

    const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: auth.refreshToken })
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as { accessToken?: string };
    return body.accessToken ?? null;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
};

const request = async <T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  token?: string,
  allowRefresh = false
): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  if (response.status === 401 && allowRefresh) {
    const newAccessToken = await refreshAccessToken();
    if (!newAccessToken) {
      onUnauthorized?.();
      throw new Error("API error: 401");
    }

    const auth = readStoredAuth();
    auth.accessToken = newAccessToken;
    writeStoredAuth(auth);
    onAccessTokenRefreshed?.(newAccessToken);

    return request<T>(method, path, body, newAccessToken, false);
  }

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return parseBody<T>(response);
};

export const apiClient = {
  setUnauthorizedHandler: (handler: UnauthorizedHandler): void => {
    onUnauthorized = handler;
  },
  setAccessTokenRefreshHandler: (handler: AccessTokenRefreshHandler): void => {
    onAccessTokenRefreshed = handler;
  },
  post: async <T>(path: string, body: unknown, token?: string): Promise<T> => {
    return request<T>("POST", path, body, token, false);
  },
  get: async <T>(path: string, token?: string): Promise<T> => {
    return request<T>("GET", path, undefined, token, false);
  },
  getAuthed: async <T>(path: string): Promise<T> => {
    const auth = readStoredAuth();
    return request<T>("GET", path, undefined, auth.accessToken ?? undefined, true);
  }
};

export const apiBaseUrl = API_BASE;
