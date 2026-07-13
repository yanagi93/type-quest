// backend/（Node.js/Express、backend/DESIGN.md参照）への薄いfetchラッパー。
// cookie（httpOnly JWT）でログイン状態を管理するので、すべてのリクエストに
// credentials: "include" を必ず付ける（付け忘れるとログインしていない扱いになる）。
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? `リクエストに失敗しました（${res.status}）`);
  }

  return data as T;
}

export type AuthUser = { id: number; userName: string; email: string };

export const api = {
  register: (userName: string, email: string, password: string) =>
    request<AuthUser>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ userName, email, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthUser>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request<void>("/api/auth/logout", { method: "POST" }),

  me: () => request<AuthUser>("/api/auth/me"),

  getProgress: <T>(chapterId: number) =>
    request<{ chapterId: number; state: T }>(`/api/progress?chapterId=${chapterId}`),

  putProgress: <T>(chapterId: number, state: T) =>
    request<void>("/api/progress", {
      method: "PUT",
      body: JSON.stringify({ chapterId, state }),
    }),

  postScore: (mode: "practice" | "story", level: string | null, score: number, floor: number) =>
    request<void>("/api/scores", {
      method: "POST",
      body: JSON.stringify({ mode, level, score, floor }),
    }),

  getLeaderboard: (params?: { mode?: string; level?: string; limit?: number }) => {
    const query = new URLSearchParams();

    if (params?.mode) query.set("mode", params.mode);
    if (params?.level) query.set("level", params.level);
    if (params?.limit) query.set("limit", String(params.limit));

    const qs = query.toString();

    return request<{
      entries: { userName: string; score: number; floor: number; mode: string; level: string | null }[];
    }>(`/api/scores/leaderboard${qs ? `?${qs}` : ""}`);
  },
};
