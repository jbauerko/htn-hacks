"use client";

import { use, useEffect, useRef, useState } from "react";
import { api, type RadioResponse } from "@/lib/api";
import { theme } from "@/lib/colors";
import { GAMES } from "@/lib/games";
import { getPersonalBest, recordScore } from "@/lib/storage";
import { Confetti } from "@/app/components/Confetti";
import { Loader, ErrorBox } from "@/app/components/Loader";
import { GameTopBar, ScoreSummary } from "@/app/components/GameShell";
import { useGameData } from "@/app/components/useGameData";

const GAME = GAMES.find((g) => g.id === "radio")!;

type Params = { params: Promise<{ id: string }> };

export default function RadioGame({ params }: Params) {
  const { id } = use(params);
  const { data, moduleInfo, loading, error, reload } = useGameData<RadioResponse>(
    id, api.radio,
  );

  if (loading) {
    return <Loader color={moduleInfo?.color ?? "indigo"} label="Tuning in…" hint="Setting the channel and warming up the speaker." />;
  }
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data || !moduleInfo) return null;
  return <Play id={id} data={data} moduleColor={moduleInfo.color} moduleName={moduleInfo.name} moduleIcon={moduleInfo.icon} reload={reload} />;
}

function Play({
  id, data, moduleColor, moduleName, moduleIcon, reload,
}: {
  id: string; data: RadioResponse; moduleColor: string;
  moduleName: string; moduleIcon: string; reload: () => void;
}) {
  const t = theme(moduleColor);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState<null | {
    correct: boolean;
    pickedId: string | null;
    text: string;
    bonus: number;
  }>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [best, setBest] = useState(() => getPersonalBest(id, "radio"));
  const [finishedRecord, setFinishedRecord] = useState<{ best: number; isNewBest: boolean } | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tx = data.transmissions;
  const current = tx[idx];
  const done = idx >= tx.length;

  useEffect(() => {
    if (done || feedback || !current) return;
    const limit = current.time_limit_seconds;
    setSecondsLeft(limit);
    const startedAt = Date.now();
    const handle = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const left = Math.max(0, limit - elapsed);
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(handle);
        onPick(null);
      }
    }, 100);
    return () => clearInterval(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, feedback, done]);

  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  useEffect(() => {
    if (done && !finishedRecord) {
      setFinishedRecord(recordScore(id, "radio", score));
    }
  }, [done, finishedRecord, id, score]);

  function onPick(choiceId: string | null) {
    if (feedback || !current) return;
    const choice = choiceId ? current.choices.find((c) => c.id === choiceId) : null;
    const correct = !!choice?.is_correct;
    const timeBonus = correct ? Math.round(secondsLeft * 2) : 0;
    const comboBonus = correct ? combo * 3 : 0;
    const base = correct ? 20 : choiceId === null ? -10 : -10;
    const delta = base + timeBonus + comboBonus;
    setScore((s) => Math.max(0, s + delta));
    setCombo((c) => (correct ? c + 1 : 0));
    if (correct) setCorrectCount((n) => n + 1);
    setFeedback({
      correct,
      pickedId: choiceId,
      text: choice?.feedback ?? (choiceId === null
        ? "You froze on the radio. " + (current.choices.find((c) => c.is_correct)?.feedback ?? "")
        : ""),
      bonus: timeBonus + comboBonus,
    });
    advanceTimer.current = setTimeout(() => {
      setFeedback(null);
      setIdx((i) => i + 1);
    }, correct ? 1100 : 1700);
  }

  if (done) {
    const record = finishedRecord ?? { best: Math.max(best, score), isNewBest: score > best };
    return (
      <>
        <GameTopBar moduleId={id} moduleName={moduleName} moduleColor={moduleColor}
          moduleIcon={moduleIcon} game={GAME} score={score} best={record.best} />
        <Confetti fire={record.isNewBest ? "best" : "done"} />
        <ScoreSummary
          moduleId={id} moduleColor={moduleColor} game={GAME}
          score={score} best={record.best} isNewBest={record.isNewBest}
          correct={correctCount} total={tx.length}
          onPlayAgain={() => {
            setIdx(0); setScore(0); setCombo(0); setCorrectCount(0);
            setFeedback(null); setFinishedRecord(null); setBest(record.best); reload();
          }}
        />
      </>
    );
  }

  const limit = current.time_limit_seconds;
  const frac = secondsLeft / limit;

  return (
    <>
      <GameTopBar moduleId={id} moduleName={moduleName} moduleColor={moduleColor}
        moduleIcon={moduleIcon} game={GAME} score={score}
        total={`${idx + 1} / ${tx.length}`} best={best} />

      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="mb-3 flex items-center justify-between text-xs">
          <span className={`rounded-full px-2 py-0.5 font-bold ${t.bgChip} ${t.textStrong}`}>
            📻 Channel 2 · live
          </span>
          {combo >= 2 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-700 anim-pop">
              ⚡ {combo}× combo
            </span>
          )}
        </div>

        {/* Walkie-talkie body */}
        <div key={current.id} className="anim-pop rounded-3xl bg-zinc-900 p-4 text-white shadow-xl ring-2 ring-zinc-700">
          <div className="flex items-center gap-2">
            <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${frac > 0 ? "bg-emerald-500 animate-pulse" : "bg-zinc-700"}`}>
              {frac > 0 ? "●" : "○"}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              {current.callsign}
            </span>
            <span className="ml-auto text-xs tabular-nums text-zinc-400">
              ⏱ {secondsLeft.toFixed(1)}s
            </span>
          </div>

          <div className="mt-3 rounded-2xl bg-zinc-800 p-4 font-mono text-sm leading-relaxed">
            <span className="text-emerald-400">»</span> {current.message}
          </div>

          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-emerald-400 transition-[width] duration-100"
              style={{ width: `${frac * 100}%` }}
            />
          </div>
        </div>

        {/* Quick-response actions */}
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {current.choices.map((c) => {
            const isPicked = feedback?.pickedId === c.id;
            const isCorrect = feedback && c.is_correct;
            let cls = `border-zinc-200 bg-white hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900`;
            if (feedback) {
              if (isCorrect) cls = "border-emerald-400 bg-emerald-50 text-emerald-800";
              else if (isPicked) cls = "border-rose-400 bg-rose-50 text-rose-800 anim-shake";
              else cls = "border-zinc-200 bg-zinc-50 text-zinc-400 opacity-70";
            }
            return (
              <button
                key={c.id}
                disabled={!!feedback}
                onClick={() => onPick(c.id)}
                className={`rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold transition ${cls}`}
              >
                {c.text}
              </button>
            );
          })}
        </div>

        {feedback && (
          <div className={`mt-4 rounded-2xl border-2 p-4 anim-pop ${feedback.correct
            ? "border-emerald-300 bg-emerald-50 text-emerald-900"
            : "border-rose-300 bg-rose-50 text-rose-900"}`}>
            <div className="text-xs font-bold uppercase tracking-wider">
              {feedback.correct ? `Copy that · +${20 + feedback.bonus}` : feedback.pickedId === null ? "Frozen on the air" : "Bad call"}
            </div>
            <div className="mt-1 text-sm">{feedback.text}</div>
          </div>
        )}

        <div className="mt-3 text-center text-xs text-zinc-400">
          +20 base · +2 per second remaining · +3× combo bonus · −10 miss
        </div>
      </div>
    </>
  );
}
