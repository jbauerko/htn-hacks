"use client";

import Link from "next/link";
import { theme } from "@/lib/colors";
import type { GameMeta } from "@/lib/games";

/**
 * Header bar shown on every game page. Shows the back arrow, role icon,
 * game title, and a live score readout. White background, light hairline
 * border below.
 */
export function GameTopBar({
  moduleId,
  moduleName,
  moduleColor,
  moduleIcon,
  game,
  score,
  total,
  best,
}: {
  moduleId: string;
  moduleName: string;
  moduleColor: string;
  moduleIcon: string;
  game: GameMeta;
  score: number;
  total?: string | number;
  best?: number;
}) {
  const t = theme(moduleColor);
  return (
    <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <Link
          href={`/modules/${moduleId}`}
          className="grid h-10 w-10 place-items-center rounded-full text-slate-700 hover:bg-slate-100"
          aria-label="Back to games"
        >
          ←
        </Link>

        <div className={`grid h-10 w-10 place-items-center rounded-xl text-xl ${t.bgChip}`}>
          {moduleIcon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-slate-500">
            {moduleName}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-slate-900">{game.emoji} {game.title}</span>
            <span className={`hidden sm:inline rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider ${t.bgChip} ${t.textStrong}`}>
              {game.badge}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-right">
          {typeof best === "number" && best > 0 && (
            <div className="hidden md:block">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Best</div>
              <div className="text-sm font-bold text-slate-700">{best}</div>
            </div>
          )}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Score</div>
            <div className={`text-xl font-extrabold ${t.textStrong} tabular-nums`}>
              {score}
            </div>
          </div>
          {total !== undefined && (
            <div className="hidden sm:block">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Pos</div>
              <div className="text-sm font-bold text-slate-700 tabular-nums">{total}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Final score screen shown when a game is done.
 */
export function ScoreSummary({
  moduleId,
  moduleColor,
  game,
  score,
  best,
  isNewBest,
  correct,
  total,
  onPlayAgain,
}: {
  moduleId: string;
  moduleColor: string;
  game: GameMeta;
  score: number;
  best: number;
  isNewBest: boolean;
  correct: number;
  total: number;
  onPlayAgain: () => void;
}) {
  const t = theme(moduleColor);
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  let title = "Nice work!";
  let blurb = "You're getting the hang of it.";
  if (accuracy >= 90) {
    title = "Outstanding!";
    blurb = "You're shift-ready. Go pick another game.";
  } else if (accuracy >= 70) {
    title = "Solid run.";
    blurb = "A few more reps and you'll have this locked in.";
  } else if (accuracy < 40) {
    title = "Tough round.";
    blurb = "Read the briefing again, then come back swinging.";
  }

  return (
    <div className="mx-auto mt-10 max-w-xl px-4 anim-pop">
      <div className={`rounded-3xl border-2 ${t.borderStrong} bg-white p-8 text-center shadow-xl`}>
        <div className={`mx-auto grid h-20 w-20 place-items-center rounded-2xl text-4xl ${t.bgGradient} shadow-md`}>
          {game.emoji}
        </div>
        <div className="mt-5 text-2xl font-extrabold text-slate-900">{title}</div>
        <div className="text-sm text-slate-600">{blurb}</div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Score" value={String(score)} accent={t.textStrong} />
          <Stat label="Accuracy" value={`${accuracy}%`} accent={t.textStrong} />
          <Stat label="Best" value={String(best)} accent={isNewBest ? "text-[#F59E0B]" : "text-slate-700"} />
        </div>

        {isNewBest && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#FEF3C7] px-3 py-1 text-sm font-bold text-[#7C4E04] anim-pop">
            ⭐ New personal best!
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={onPlayAgain}
            className={`rounded-full ${t.bgSolid} ${t.bgSolidHover} px-6 py-3 font-bold text-white shadow-md transition`}
          >
            Play again
          </button>
          <Link
            href={`/modules/${moduleId}`}
            className="rounded-full border-2 border-slate-200 px-6 py-3 font-bold text-slate-700 hover:bg-slate-50"
          >
            Pick another game
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-xl font-extrabold tabular-nums ${accent}`}>{value}</div>
    </div>
  );
}

/**
 * Small popping +N / -N badge that floats up from a position.
 * Use as a list of recent deltas you append to.
 */
export function ScoreFloat({ value }: { value: number }) {
  const positive = value > 0;
  return (
    <span
      className={`anim-float pointer-events-none absolute text-2xl font-extrabold ${
        positive ? "text-[#54C152]" : "text-[#F43F5E]"
      }`}
    >
      {positive ? "+" : ""}{value}
    </span>
  );
}
