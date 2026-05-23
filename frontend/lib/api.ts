const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface ModuleSummary {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  knowledge_item_count: number;
  rule_count: number;
}

export interface Choice {
  id: string;
  text: string;
  outcome: string;
  points: number;
  is_correct: boolean;
}

export interface Scenario {
  id: string;
  title: string;
  situation: string;
  hint?: string;
  choices: Choice[];
}

export interface ScenariosResponse {
  module_id: string;
  module_name: string;
  scenarios: Scenario[];
}

export interface LeaderboardEntry {
  id: number;
  player_name: string;
  module_id: string;
  score: number;
  scenarios_completed: number;
  accuracy: number;
  rank?: number;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  modules: {
    list: () => apiFetch<ModuleSummary[]>("/modules"),
  },
  scenarios: {
    generate: (moduleId: string, count = 6) =>
      apiFetch<ScenariosResponse>(`/modules/${moduleId}/scenarios?count=${count}`, {
        method: "POST",
      }),
  },
  leaderboard: {
    submit: (payload: {
      player_name: string;
      module_id: string;
      score: number;
      scenarios_completed: number;
      correct_answers: number;
    }) =>
      apiFetch<LeaderboardEntry>("/leaderboard", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    get: (moduleId?: string, limit = 20) => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (moduleId) params.set("module_id", moduleId);
      return apiFetch<LeaderboardEntry[]>(`/leaderboard?${params}`);
    },
  },
};
