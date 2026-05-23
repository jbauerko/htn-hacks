"use client";

import { use, useEffect, useRef, useState } from "react";
import { api, type TriageResponse } from "@/lib/api";
import { theme } from "@/lib/colors";
import { GAMES } from "@/lib/games";
import { getPersonalBest, recordScore } from "@/lib/storage";
import { Confetti } from "@/app/components/Confetti";
import { Loader, ErrorBox } from "@/app/components/Loader";
import { GameTopBar, ScoreSummary } from "@/app/components/GameShell";
import { useGameData } from "@/app/components/useGameData";

const GAME = GAMES.find((g) => g.id === "triage")!;
const TIME_PER_TICKET = 9; // seconds

type Params = { params: Promise<{ id: string }> };

export default function TriageGame({ params }: Params) {
  const { id } = use(params);
  const { data, moduleInfo, loading, error, reload } = useGameData<TriageResponse>(
    id, api.triage,
  );

  if (loading) {
    return <Loader color={moduleInfo?.color ?? "indigo"} label="Loading tickets…" hint="Sorting hats are being fitted." />;
  }
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data || !moduleInfo) return null;

  return <Play id={id} data={data} moduleColor={moduleInfo.color} moduleName={moduleInfo.name} moduleIcon={moduleInfo.icon} reload={reload} />;
}

function Play({
  id, data, moduleColor, moduleName, moduleIcon, reload,
}: {
  id: string; data: TriageResponse; moduleColor: string;
  moduleName: string; moduleIcon: string; reload: () => void;
}) {
  const t = theme(moduleColor);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<null | {
    correct: boolean;
    pickedId: string | null;   // null = timeout
    explanation: string;
  }>(null);
  const [secondsLeft, setSecondsLeft] = useState(TIME_PER_TICKET);
  const [best, setBest] = useState(() => getPersonalBest(id, "triage"));
  const [finishedRecord, setFinishedRecord] = useState<{ best: number; isNewBest: boolean } | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tickets = data.tickets;
  const buckets = data.buckets;
  const current = tickets[idx];
  const done = idx >= tickets.length;

  // Per-ticket countdown
  useEffect(() => {
    if (done || feedback || !current) return;
    setSecondsLeft(TIME_PER_TICKET);
    const startedAt = Date.now();
    const handle = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const left = Math.max(0, TIME_PER_TICKET - elapsed);
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
      setFinishedRecord(recordScore(id, "triage", score));
    }
  }, [done, finishedRecord, id, score]);

  function onPick(bucketId: string | null) {
    if (feedback || !current) return;
    const correct = bucketId !== null && bucketId === current.correct_bucket_id;
    // Time-bonus: faster correct answers get more points
    const timeBonus = correct ? Math.round(secondsLeft) : 0;
    setScore((s) => s + (correct ? 15 + timeBonus : bucketId === null ? -5 : -8));
    if (correct) setCorrectCount((c) => c + 1);
    setFeedback({
      correct,
      pickedId: bucketId,
      explanation: bucketId === null
        ? `Time's up. The right call was "${labelOf(current.correct_bucket_id, buckets)}". ${current.explanation}`
        : current.explanation,
    });
    advanceTimer.current = setTimeout(() => {
      setFeedback(null);
      setIdx((i) => i + 1);
    }, correct ? 1200 : 1800);
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
          correct={correctCount} total={tickets.length}
          onPlayAgain={() => {
            setIdx(0); setScore(0); setCorrectCount(0); setFeedback(null);
            setFinishedRecord(null); setBest(record.best); reload();
          }}
        />
      </>
    );
  }

  const timeFrac = secondsLeft / TIME_PER_TICKET;
  const timeColor = secondsLeft < 3 ? "bg-rose-500" : secondsLeft < 6 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <>
      <GameTopBar moduleId={id} moduleName={moduleName} moduleColor={moduleColor}
        moduleIcon={moduleIcon} game={GAME} score={score}
        total={`${idx + 1} / ${tickets.length}`} best={best} />

      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="mb-3 flex items-center justify-between text-xs">
          <span className={`rounded-full px-2 py-0.5 font-bold ${t.bgChip} ${t.textStrong}`}>
            Ticket {idx + 1} / {tickets.length}
          </span>
          <span className="font-bold text-zinc-500 tabular-nums">⏱ {secondsLeft.toFixed(1)}s</span>
        </div>

        <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className={`h-full ${timeColor} transition-[width] duration-100`}
            style={{ width: `${timeFrac * 100}%` }}
          />
        </div>

        {/* Ticket card */}
        <div
          key={current.id}
          className="anim-pop relative rounded-3xl border-2 border-zinc-200 bg-white p-6 shadow-md dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Incoming
          </div>
          <div className="mt-2 text-lg leading-snug text-zinc-800 dark:text-zinc-100">
            {current.text}
          </div>

          {feedback && (
            <div
              className={`mt-4 rounded-2xl border-2 p-3 anim-pop ${feedback.correct
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border-rose-300 bg-rose-50 text-rose-900"}`}
            >
              <div className="text-xs font-bold uppercase tracking-wider">
                {feedback.correct ? "Nice triage" : "Not quite"}
              </div>
              <div className="mt-1 text-sm">{feedback.explanation}</div>
            </div>
          )}
        </div>

        {/* Buckets */}
        <div className={`mt-5 grid gap-3 ${buckets.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {buckets.map((b) => {
            const bt = theme(b.color);
            const isCorrect = feedback && b.id === current.correct_bucket_id;
            const isPicked = feedback && b.id === feedback.pickedId;
            let cls = `${bt.bgChip} ${bt.textStrong} hover:scale-[1.04] active:scale-95`;
            if (feedback) {
              if (isCorrect) cls = "bg-emerald-500 text-white";
              else if (isPicked) cls = "bg-rose-500 text-white anim-shake";
              else cls = "bg-zinc-100 text-zinc-400 dark:bg-zinc-800";
            }
            return (
              <button
                key={b.id}
                disabled={!!feedback}
                onClick={() => onPick(b.id)}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-4 font-bold transition ${cls}`}
              >
                <span className="text-3xl">{b.icon}</span>
                <span className="text-xs sm:text-sm leading-tight text-center">{b.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 text-center text-xs text-zinc-400">
          +15 base · +1 per second remaining · −8 wrong · −5 timeout
        </div>
      </div>
    </>
  );
}

function labelOf(bucketId: string, buckets: TriageResponse["buckets"]) {
  return buckets.find((b) => b.id === bucketId)?.label ?? bucketId;
}
