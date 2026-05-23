// Tiny localStorage helper for per-module/per-game personal bests.
// Keys look like:  pb:registration:matching → number

const KEY = (moduleId: string, gameId: string) => `pb:${moduleId}:${gameId}`;

export function getPersonalBest(moduleId: string, gameId: string): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(KEY(moduleId, gameId));
  return raw ? Number(raw) || 0 : 0;
}

export function recordScore(moduleId: string, gameId: string, score: number): {
  best: number;
  isNewBest: boolean;
} {
  if (typeof window === "undefined") return { best: score, isNewBest: false };
  const prev = getPersonalBest(moduleId, gameId);
  if (score > prev) {
    window.localStorage.setItem(KEY(moduleId, gameId), String(score));
    return { best: score, isNewBest: true };
  }
  return { best: prev, isNewBest: false };
}
