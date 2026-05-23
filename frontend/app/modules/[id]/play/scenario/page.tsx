"use client";

import { use, useEffect, useState } from "react";
import { api, type ScenariosResponse } from "@/lib/api";
import { theme } from "@/lib/colors";
import { GAMES } from "@/lib/games";
import { getPersonalBest, recordScore } from "@/lib/storage";
import { Confetti } from "@/app/components/Confetti";
import { Loader, ErrorBox } from "@/app/components/Loader";
import { GameTopBar, ScoreSummary } from "@/app/components/GameShell";
import { useGameData } from "@/app/components/useGameData";

const GAME = GAMES.find((g) => g.id === "scenario")!;

type Params = { params: Promise<{ id: string }> };

export default function ScenarioGame({ params }: Params) {
  const { id } = use(params);
  const { data, moduleInfo, loading, error, reload } = useGameData<ScenariosResponse>(
    id,
    api.scenarios,
  );

  if (loading) {
    return (
      <Loader
        color={moduleInfo?.color ?? "indigo"}
        label="Loading scenarios…"
        hint="Claude is writing fresh shift situations. This takes a few seconds the first time."
      />
    );
  }
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data || !moduleInfo) return null;

  return <Play id={id} data={data} moduleColor={moduleInfo.color} moduleName={moduleInfo.name} moduleIcon={moduleInfo.icon} reload={reload} />;
}

function Play({
  id,
  data,
  moduleColor,
  moduleName,
  moduleIcon,
  reload,
}: {
  id: string;
  data: ScenariosResponse;
  moduleColor: string;
  moduleName: string;
  moduleIcon: string;
  reload: () => void;
}) {
  const t = theme(moduleColor);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [best, setBest] = useState(() => getPersonalBest(id, "scenario"));
  const [finishedRecord, setFinishedRecord] = useState<{ best: number; isNewBest: boolean } | null>(null);

  const scenarios = data.scenarios;
  const current = scenarios[idx];
  const done = idx >= scenarios.length;

  useEffect(() => {
    if (done && !finishedRecord) {
      setFinishedRecord(recordScore(id, "scenario", score));
    }
  }, [done, finishedRecord, id, score]);

  if (done) {
    const record = finishedRecord ?? { best: Math.max(best, score), isNewBest: score > best };
    return (
      <>
        <GameTopBar
          moduleId={id} moduleName={moduleName} moduleColor={moduleColor}
          moduleIcon={moduleIcon} game={GAME} score={score} best={record.best}
        />
        <Confetti fire={record.isNewBest ? "best" : "done"} />
        <ScoreSummary
          moduleId={id} moduleColor={moduleColor} game={GAME}
          score={score} best={record.best} isNewBest={record.isNewBest}
          correct={correctCount} total={scenarios.length}
          onPlayAgain={() => {
            setIdx(0); setScore(0); setStreak(0); setCorrectCount(0);
            setPicked(null); setFinishedRecord(null);
            setBest(record.best);
            reload();
          }}
        />
      </>
    );
  }

  const pickedChoice = picked ? current.choices.find((c) => c.id === picked) : null;

  const onPick = (choiceId: string) => {
    if (picked) return;
    const c = current.choices.find((ch) => ch.id === choiceId)!;
    setPicked(choiceId);
    // Streak bonus: +5 for each consecutive correct after the first
    const bonus = c.is_correct && streak >= 1 ? 5 : 0;
    setScore((s) => s + c.points + bonus);
    setStreak((s) => (c.is_correct ? s + 1 : 0));
    if (c.is_correct) setCorrectCount((n) => n + 1);
  };

  const onNext = () => {
    setIdx((i) => i + 1);
    setPicked(null);
    setShowHint(false);
  };

  return (
    <>
      <GameTopBar
        moduleId={id} moduleName={moduleName} moduleColor={moduleColor}
        moduleIcon={moduleIcon} game={GAME} score={score}
        total={`${idx + 1} / ${scenarios.length}`} best={best}
      />

      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="mb-3 flex items-center gap-2 text-xs">
          <span className={`rounded-full px-2 py-0.5 font-bold ${t.bgChip} ${t.textStrong}`}>
            Scenario {idx + 1} / {scenarios.length}
          </span>
          {streak >= 2 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-700 anim-pop">
              🔥 {streak} streak
            </span>
          )}
        </div>

        <div key={current.id} className="anim-pop rounded-3xl border-2 border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-xl font-extrabold">{current.title}</h2>
          <p className="mt-3 text-base leading-relaxed text-zinc-700 dark:text-zinc-200">
            {current.situation}
          </p>

          {current.hint && !picked && (
            <div className="mt-4">
              {showHint ? (
                <div className={`rounded-xl ${t.bgSoft} p-3 text-sm italic ${t.textStrong}`}>
                  💡 {current.hint}
                </div>
              ) : (
                <button
                  onClick={() => setShowHint(true)}
                  className="text-sm font-medium text-zinc-500 underline hover:text-zinc-800"
                >
                  Show hint (worth a tiny score hit if you're stuck)
                </button>
              )}
            </div>
          )}

          <ul className="mt-5 space-y-2">
            {current.choices.map((c) => {
              const isPicked = picked === c.id;
              const showState = !!picked;
              let cls = "border-zinc-200 bg-white hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900";
              if (showState && c.is_correct) cls = "border-emerald-400 bg-emerald-50 text-emerald-900";
              else if (showState && isPicked && !c.is_correct) cls = "border-rose-400 bg-rose-50 text-rose-900 anim-shake";
              else if (showState) cls = "border-zinc-200 bg-zinc-50 text-zinc-400 opacity-70";
              return (
                <li key={c.id}>
                  <button
                    disabled={!!picked}
                    onClick={() => onPick(c.id)}
                    className={`group flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-3 text-left transition ${cls}`}
                  >
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold ${t.bgChip} ${t.textStrong}`}>
                      {c.id.toUpperCase()}
                    </span>
                    <span className="flex-1 text-sm font-medium">{c.text}</span>
                    {showState && c.is_correct && <span className="text-emerald-600 font-bold">✓</span>}
                    {showState && isPicked && !c.is_correct && <span className="text-rose-600 font-bold">✗</span>}
                  </button>
                </li>
              );
            })}
          </ul>

          {pickedChoice && (
            <div className="mt-5 anim-pop">
              <div className={`rounded-2xl border-2 p-4 ${pickedChoice.is_correct
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border-rose-300 bg-rose-50 text-rose-900"}`}>
                <div className="text-xs font-bold uppercase tracking-wider">
                  {pickedChoice.is_correct ? "Best move" : "Not quite"} · {pickedChoice.points >= 0 ? "+" : ""}{pickedChoice.points} pts
                </div>
                <div className="mt-1 text-sm">{pickedChoice.outcome}</div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={onNext}
                  className={`rounded-full ${t.bgSolid} ${t.bgSolidHover} px-5 py-2.5 font-bold text-white shadow`}
                >
                  {idx + 1 === scenarios.length ? "See results →" : "Next scenario →"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
