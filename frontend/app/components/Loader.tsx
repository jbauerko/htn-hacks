"use client";

import { theme } from "@/lib/colors";

/**
 * Generic loading splash for game pages. Shows while Claude is generating
 * (first request can take 5-10s).
 */
export function Loader({
  color = "indigo",
  label = "Loading…",
  hint,
}: {
  color?: string;
  label?: string;
  hint?: string;
}) {
  const t = theme(color);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-20 text-center">
      <div
        className={`${t.bgGradient} grid h-24 w-24 place-items-center rounded-3xl text-5xl shadow-lg anim-pulse`}
      >
        <span className="anim-pop">⏳</span>
      </div>
      <div>
        <div className={`${t.textStrong} text-xl font-bold`}>{label}</div>
        {hint ? (
          <div className="mt-2 text-sm text-slate-600">{hint}</div>
        ) : null}
      </div>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mx-auto mt-12 max-w-lg rounded-2xl border-2 border-rose-200 bg-rose-50 p-6 text-rose-800 anim-pop">
      <div className="mb-2 text-lg font-bold">Something went wrong</div>
      <pre className="whitespace-pre-wrap text-sm">{message}</pre>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-full bg-rose-500 px-5 py-2 text-white font-semibold hover:bg-rose-600"
        >
          Try again
        </button>
      )}
    </div>
  );
}
