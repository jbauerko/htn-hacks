"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { api, type AdventureNode, type AdventureResponse } from "@/lib/api";
import { theme } from "@/lib/colors";
import { GAMES } from "@/lib/games";
import { getPersonalBest, recordScore } from "@/lib/storage";
import { Confetti } from "@/app/components/Confetti";
import { Loader, ErrorBox } from "@/app/components/Loader";
import { GameTopBar } from "@/app/components/GameShell";
import { useGameData } from "@/app/components/useGameData";

const GAME = GAMES.find((g) => g.id === "adventure")!;

type Params = { params: Promise<{ id: string }> };

export default function AdventureGame({ params }: Params) {
  const { id } = use(params);
  const [regenerating, setRegenerating] = useState(false);
  const { data, moduleInfo, loading, error, reload } =
    useGameData<AdventureResponse>(id, api.adventure);

  const regenerate = async () => {
    setRegenerating(true);
    try {
      await api.regenerateAdventure(id);
    } finally {
      reload();
      // small grace so the user sees the loader before re-render
      setTimeout(() => setRegenerating(false), 250);
    }
  };

  if (loading || regenerating) {
    return (
      <Loader
        color={moduleInfo?.color ?? "indigo"}
        label={
          regenerating
            ? "Forking a brand-new timeline…"
            : "Spinning up your adventure…"
        }
        hint="Claude is plotting branches. First run takes ~10s."
      />
    );
  }
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data || !moduleInfo) return null;

  return (
    <Play
      id={id}
      data={data}
      moduleColor={moduleInfo.color}
      moduleName={moduleInfo.name}
      moduleIcon={moduleInfo.icon}
      onRegenerate={regenerate}
    />
  );
}

type PathStep = {
  nodeId: string;
  sceneTitle: string;
  choiceText: string;
  outcome: string;
  points: number;
};

function Play({
  id,
  data,
  moduleColor,
  moduleName,
  moduleIcon,
  onRegenerate,
}: {
  id: string;
  data: AdventureResponse;
  moduleColor: string;
  moduleName: string;
  moduleIcon: string;
  onRegenerate: () => void;
}) {
  const t = theme(moduleColor);

  const byId = useMemo(() => {
    const map = new Map<string, AdventureNode>();
    for (const n of data.nodes) map.set(n.id, n);
    return map;
  }, [data.nodes]);

  const [currentId, setCurrentId] = useState(data.start_node_id);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [path, setPath] = useState<PathStep[]>([]);
  const [best, setBest] = useState(() => getPersonalBest(id, "adventure"));
  const [finishedRecord, setFinishedRecord] = useState<
    { best: number; isNewBest: boolean } | null
  >(null);

  const current = byId.get(currentId);
  const done = !!current?.is_ending;

  useEffect(() => {
    if (done && !finishedRecord) {
      setFinishedRecord(recordScore(id, "adventure", score));
    }
  }, [done, finishedRecord, id, score]);

  const reset = () => {
    setCurrentId(data.start_node_id);
    setPickedId(null);
    setScore(0);
    setPath([]);
    setFinishedRecord(null);
    setBest((b) => Math.max(b, score));
  };

  // Defensive: an LLM tree we couldn't navigate.
  if (!current) {
    return (
      <ErrorBox
        message={`Hit a dead-end at node '${currentId}'. The story tree is malformed.`}
        onRetry={() => {
          setCurrentId(data.start_node_id);
          setPickedId(null);
          onRegenerate();
        }}
      />
    );
  }

  if (done) {
    const record = finishedRecord ?? {
      best: Math.max(best, score),
      isNewBest: score > best,
    };
    return (
      <>
        <GameTopBar
          moduleId={id}
          moduleName={moduleName}
          moduleColor={moduleColor}
          moduleIcon={moduleIcon}
          game={GAME}
          score={score}
          best={record.best}
        />
        <Confetti
          fire={
            current.vibe === "triumph"
              ? record.isNewBest
                ? "best"
                : "win"
              : null
          }
        />
        <EndingScreen
          ending={current}
          moduleId={id}
          moduleColor={moduleColor}
          score={score}
          best={record.best}
          isNewBest={record.isNewBest}
          path={path}
          adventureTitle={data.title}
          onPlayAgain={reset}
          onRegenerate={() => {
            reset();
            onRegenerate();
          }}
        />
      </>
    );
  }

  const decisionIndex = path.length; // 0-indexed: how many choices already made
  const pickedChoice = pickedId
    ? current.choices.find((c) => c.id === pickedId)
    : null;

  const onPick = (choiceId: string) => {
    if (pickedId) return;
    const c = current.choices.find((ch) => ch.id === choiceId);
    if (!c) return;
    setPickedId(choiceId);
    setScore((s) => s + c.points);
    setPath((p) => [
      ...p,
      {
        nodeId: current.id,
        sceneTitle: current.scene_title ?? "Scene",
        choiceText: c.text,
        outcome: c.outcome,
        points: c.points,
      },
    ]);
  };

  const onNext = () => {
    if (!pickedChoice) return;
    setCurrentId(pickedChoice.next);
    setPickedId(null);
  };

  return (
    <>
      <GameTopBar
        moduleId={id}
        moduleName={moduleName}
        moduleColor={moduleColor}
        moduleIcon={moduleIcon}
        game={GAME}
        score={score}
        total={`Choice ${decisionIndex + 1} / 5`}
        best={best}
      />

      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        {decisionIndex === 0 && (
          <div
            className={`mb-5 rounded-2xl border-2 ${t.border} ${t.bgSoft} p-4`}
          >
            <div
              className={`text-[10px] font-bold uppercase tracking-wider ${t.textMuted}`}
            >
              Adventure
            </div>
            <div className={`text-lg font-extrabold ${t.textStrong}`}>
              {data.title}
            </div>
            <p className="mt-1 text-sm text-slate-700">{data.intro}</p>
          </div>
        )}

        <PathDots
          step={decisionIndex}
          total={5}
          textColor={t.textStrong}
          chipColor={t.bgChip}
        />

        <div
          key={current.id}
          className="anim-pop mt-4 rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-sm"
        >
          <div
            className={`text-[10px] font-bold uppercase tracking-wider ${t.textMuted}`}
          >
            Scene {decisionIndex + 1}
          </div>
          <h2 className="mt-0.5 text-xl font-extrabold text-slate-900">
            {current.scene_title}
          </h2>
          <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-slate-700">
            {current.narration}
          </p>

          <div className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            What do you do?
          </div>
          <ul className="mt-2 space-y-2">
            {current.choices.map((c) => {
              const isPicked = pickedId === c.id;
              const showState = !!pickedId;
              let cls =
                "border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50";
              if (showState && isPicked) {
                cls =
                  c.points >= 0
                    ? "border-[#54C152] bg-[#D2FFD1] text-[#246B22]"
                    : "border-[#F43F5E] bg-[#FFE4E6] text-[#7A1622] anim-shake";
              } else if (showState) {
                cls = "border-slate-200 bg-slate-50 text-slate-500 opacity-70";
              }
              return (
                <li key={c.id}>
                  <button
                    disabled={!!pickedId}
                    onClick={() => onPick(c.id)}
                    className={`group flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-3 text-left transition ${cls}`}
                  >
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold ${t.bgChip} ${t.textStrong}`}
                    >
                      {c.id.toUpperCase()}
                    </span>
                    <span className="flex-1 text-sm font-medium">{c.text}</span>
                    {showState && isPicked && (
                      <span
                        className={`shrink-0 text-xs font-bold ${
                          c.points >= 0
                            ? "text-[#246B22]"
                            : "text-[#7A1622]"
                        }`}
                      >
                        {c.points >= 0 ? "+" : ""}
                        {c.points}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {pickedChoice && (
            <div className="anim-pop mt-5">
              <div
                className={`rounded-2xl border-2 p-4 ${
                  pickedChoice.points >= 0
                    ? "border-[#54C152] bg-[#D2FFD1] text-[#246B22]"
                    : "border-[#F43F5E] bg-[#FFE4E6] text-[#7A1622]"
                }`}
              >
                <div className="text-xs font-bold uppercase tracking-wider">
                  {pickedChoice.points >= 10
                    ? "Solid call"
                    : pickedChoice.points >= 0
                      ? "Could be worse"
                      : "Yikes"}{" "}
                  · {pickedChoice.points >= 0 ? "+" : ""}
                  {pickedChoice.points} pts
                </div>
                <div className="mt-1 text-sm">{pickedChoice.outcome}</div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={onNext}
                  className={`rounded-full ${t.bgSolid} ${t.bgSolidHover} px-5 py-2.5 font-bold text-white shadow`}
                >
                  {decisionIndex + 1 === 5
                    ? "See your fate →"
                    : "Continue →"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function PathDots({
  step,
  total,
  textColor,
  chipColor,
}: {
  step: number;
  total: number;
  textColor: string;
  chipColor: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => {
        const done = i < step;
        const here = i === step;
        return (
          <span
            key={i}
            className={`h-2.5 rounded-full transition-all ${
              here
                ? `w-8 ${chipColor}`
                : done
                  ? `w-2.5 ${chipColor}`
                  : "w-2.5 bg-slate-200"
            }`}
          />
        );
      })}
      <span
        className={`ml-2 text-[10px] font-bold uppercase tracking-wider ${textColor}`}
      >
        {Math.min(step + 1, total)} of {total}
      </span>
    </div>
  );
}

const VIBE_META: Record<
  NonNullable<AdventureNode["vibe"]>,
  { emoji: string; surface: string; ring: string; chip: string; title: string }
> = {
  triumph: {
    emoji: "🏆",
    surface: "bg-[#D2FFD1] text-[#246B22]",
    ring: "ring-[#54C152]",
    chip: "bg-[#54C152] text-white",
    title: "TRIUMPH",
  },
  mixed: {
    emoji: "🤷",
    surface: "bg-[#FEF3C7] text-[#7C4E04]",
    ring: "ring-[#F59E0B]",
    chip: "bg-[#F59E0B] text-white",
    title: "MIXED BAG",
  },
  disaster: {
    emoji: "💥",
    surface: "bg-[#FFE4E6] text-[#7A1622]",
    ring: "ring-[#F43F5E]",
    chip: "bg-[#F43F5E] text-white",
    title: "DISASTER",
  },
  weird: {
    emoji: "👽",
    surface: "bg-[#EDE9FE] text-[#3F2099]",
    ring: "ring-[#8B5CF6]",
    chip: "bg-[#8B5CF6] text-white",
    title: "PLOT TWIST",
  },
};

function EndingScreen({
  ending,
  moduleId,
  moduleColor,
  score,
  best,
  isNewBest,
  path,
  adventureTitle,
  onPlayAgain,
  onRegenerate,
}: {
  ending: AdventureNode;
  moduleId: string;
  moduleColor: string;
  score: number;
  best: number;
  isNewBest: boolean;
  path: PathStep[];
  adventureTitle: string;
  onPlayAgain: () => void;
  onRegenerate: () => void;
}) {
  const t = theme(moduleColor);
  const vibe = ending.vibe ?? "mixed";
  const v = VIBE_META[vibe];

  return (
    <div className="mx-auto mt-8 max-w-2xl px-4 anim-pop">
      <div
        className={`rounded-3xl border-2 bg-white p-8 shadow-xl ${v.ring} ring-2`}
      >
        <div
          className={`mx-auto grid h-24 w-24 place-items-center rounded-3xl text-5xl shadow-md ${v.surface}`}
        >
          {v.emoji}
        </div>

        <div className="mt-5 text-center">
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-extrabold tracking-[0.15em] ${v.chip}`}
          >
            {v.title} ENDING
          </div>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
            {ending.label}
          </h2>
          <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">
            from “{adventureTitle}”
          </p>
        </div>

        <p className="mt-6 text-center text-base leading-relaxed text-slate-700">
          {ending.epilogue}
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Score" value={String(score)} accent={t.textStrong} />
          <Stat
            label="Best"
            value={String(best)}
            accent={isNewBest ? "text-[#F59E0B]" : "text-slate-700"}
          />
          <Stat label="Choices" value={`${path.length}`} accent={t.textStrong} />
        </div>

        {isNewBest && (
          <div className="mt-4 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#FEF3C7] px-3 py-1 text-sm font-bold text-[#7C4E04] anim-pop">
              ⭐ New personal best!
            </span>
          </div>
        )}

        <div className="mt-7">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Your path
          </div>
          <ol className="mt-2 space-y-2">
            {path.map((step, i) => (
              <li
                key={`${step.nodeId}-${i}`}
                className={`rounded-2xl border ${
                  step.points >= 0
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-rose-200 bg-rose-50/50"
                } p-3`}
              >
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span>
                    {i + 1}. {step.sceneTitle}
                  </span>
                  <span
                    className={
                      step.points >= 0
                        ? "text-emerald-700"
                        : "text-rose-700"
                    }
                  >
                    {step.points >= 0 ? "+" : ""}
                    {step.points}
                  </span>
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  → {step.choiceText}
                </div>
                <div className="mt-0.5 text-xs italic text-slate-600">
                  {step.outcome}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={onPlayAgain}
            className={`rounded-full ${t.bgSolid} ${t.bgSolidHover} px-6 py-3 font-bold text-white shadow-md transition`}
          >
            Try a different path
          </button>
          <button
            onClick={onRegenerate}
            className="rounded-full border-2 border-slate-200 px-6 py-3 font-bold text-slate-700 hover:bg-slate-50"
          >
            New adventure
          </button>
          <Link
            href={`/modules/${moduleId}`}
            className="rounded-full border-2 border-slate-200 px-6 py-3 text-center font-bold text-slate-700 hover:bg-slate-50"
          >
            Pick another game
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className={`text-xl font-extrabold tabular-nums ${accent}`}>
        {value}
      </div>
    </div>
  );
}
