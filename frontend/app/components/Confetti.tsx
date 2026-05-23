"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Lightweight CSS-only confetti burst. Renders ~80 colored squares that
 * tumble down the screen for ~3 seconds, then unmounts itself.
 *
 * Trigger with the `fire` prop changing to a new truthy value.
 */
export function Confetti({ fire }: { fire: unknown }) {
  const [pieces, setPieces] = useState<ReactNode[] | null>(null);

  useEffect(() => {
    if (!fire) return;
    const colors = [
      "#f87171", "#fb923c", "#facc15", "#4ade80",
      "#22d3ee", "#60a5fa", "#a78bfa", "#f472b6",
    ];
    const next = Array.from({ length: 80 }).map((_, i) => {
      const left = Math.random() * 100;
      const drift = (Math.random() - 0.5) * 200;
      const delay = Math.random() * 200;
      const dur = 1800 + Math.random() * 1400;
      const size = 6 + Math.round(Math.random() * 8);
      const color = colors[i % colors.length];
      const rotate = Math.random() * 360;
      const style: React.CSSProperties & Record<string, string> = {
        left: `${left}%`,
        width: `${size}px`,
        height: `${size * 0.6}px`,
        background: color,
        animationDelay: `${delay}ms`,
        animationDuration: `${dur}ms`,
        transform: `rotate(${rotate}deg)`,
        ["--drift"]: `${drift}px`,
      };
      return (
        <span
          key={`${i}-${String(fire)}`}
          className="absolute top-0 rounded-sm"
          style={{ ...style, animation: `confetti-fall ${dur}ms ease-in forwards`, animationDelay: `${delay}ms` }}
        />
      );
    });
    setPieces(next);
    const t = setTimeout(() => setPieces(null), 3400);
    return () => clearTimeout(t);
  }, [fire]);

  if (!pieces) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces}
    </div>
  );
}
