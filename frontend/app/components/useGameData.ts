"use client";

import { useEffect, useState } from "react";
import { api, type ModuleSummary } from "@/lib/api";

/**
 * Load a module summary + game-specific payload in parallel.
 * Used by every /play/<game>/page.tsx to keep them DRY.
 */
export function useGameData<T>(
  moduleId: string,
  loader: (id: string) => Promise<T>,
) {
  const [data, setData] = useState<T | null>(null);
  const [moduleInfo, setModuleInfo] = useState<ModuleSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      api.listModules().then((all) => all.find((m) => m.id === moduleId) ?? null),
      loader(moduleId),
    ])
      .then(([m, d]) => {
        if (cancelled) return;
        setModuleInfo(m);
        setData(d);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // loader is intentionally NOT in the deps — callers pass a new fn ref every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);
  return { data, moduleInfo, error, loading, reload };
}
