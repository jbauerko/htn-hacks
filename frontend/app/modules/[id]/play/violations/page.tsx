"use client";

import { use, useEffect, useState } from "react";
import { api, type ViolationsResponse } from "@/lib/api";
import { theme } from "@/lib/colors";
import { GAMES } from "@/lib/games";
import { getPersonalBest, recordScore } from "@/lib/storage";
import { Confetti } from "@/app/components/Confetti";
import { Loader, ErrorBox } from "@/app/components/Loader";
import { GameTopBar, ScoreSummary } from "@/app/components/GameShell";
import { useGameData } from "@/app/components/useGameData";

const GAME = GAMES.find((g) => g.id === "violations")!;

type Params = { params: Promise<{ id: string }> };

export default function ViolationsGame({ params }: Params) {
  const { id } = use(params);
  const { data, moduleInfo, loading, error, reload } = useGameData<ViolationsResponse>(
    id, api.violations,
  );

  if (loading) {
    return <Loader color={moduleInfo?.color ?? "indigo"} label="Loading shift logs…" hint="A few stories are being drafted from your role's rulebook." />;
  }
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data || !moduleInfo) return null;
  return <Play id={id} data={data} moduleColor={moduleInfo.color} moduleName={moduleInfo.name} moduleIcon={moduleInfo.icon} reload={reload} />;
}

function Play({
  id, data, moduleColor, moduleName, moduleIcon, reload,
}: {
  id: string; data: ViolationsResponse; moduleColor: string;
  moduleName: string; moduleIcon: string; reload: () => void;
}) {
  const t = theme(moduleColor);
  const stories = data.stories;
  const [storyIdx, setStoryIdx] = useState(0);
  // Per-story state: which span ids the player has tapped
  const [tapped, setTapped] = useState<Record<string, boolean>>({});
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [correctSlips, setCorrectSlips] = useState(0);
  const [totalSlips, setTotalSlips] = useState(0);
  const [best, setBest] = useState(() => getPersonalBest(id, "violations"));
  const [finishedRecord, setFinishedRecord] = useState<{ best: number; isNewBest: boolean } | null>(null);

  const story = stories[storyIdx];
  const done = storyIdx >= stories.length;

  useEffect(() => {
    if (done && !finishedRecord) {
      setFinishedRecord(recordScore(id, "violations", score));
    }
  }, [done, finishedRecord, id, score]);

  function reveal() {
    if (revealed || !story) return;
    let storyScore = 0;
    let caught = 0;
    let totalViolations = 0;
    for (const span of story.spans) {
      const isTapped = !!tapped[span.id];
      if (span.is_violation) {
        totalViolations += 1;
        if (isTapped) { storyScore += 15; caught += 1; }
        else { storyScore -= 8; }
      } else if (isTapped) {
        storyScore -= 6;
      }
    }
    // Perfect-story bonus
    const allCorrect = story.spans.every(
      (s) => !!tapped[s.id] === s.is_violation,
    );
    if (allCorrect) storyScore += 10;

    setScore((s) => Math.max(0, s + storyScore));
    setCorrectSlips((c) => c + caught);
    setTotalSlips((t) => t + totalViolations);
    setRevealed(true);
  }

  function nextStory() {
    setStoryIdx((i) => i + 1);
    setTapped({});
    setRevealed(false);
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
          correct={correctSlips} total={Math.max(1, totalSlips)}
          onPlayAgain={() => {
            setStoryIdx(0); setTapped({}); setRevealed(false);
            setScore(0); setCorrectSlips(0); setTotalSlips(0);
            setFinishedRecord(null); setBest(record.best); reload();
          }}
        />
      </>
    );
  }

  const tappedCount = Object.values(tapped).filter(Boolean).length;

  return (
    <>
      <GameTopBar moduleId={id} moduleName={moduleName} moduleColor={moduleColor}
        moduleIcon={moduleIcon} game={GAME} score={score}
        total={`${storyIdx + 1} / ${stories.length}`} best={best} />

      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${t.bgChip} ${t.textStrong}`}>
          Story {storyIdx + 1} / {stories.length} · tap every rule slip
        </div>

        <article key={story.id} className="mt-3 anim-pop rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-extrabold text-slate-900">{story.title}</h2>
          <p className="mt-2 text-sm italic text-slate-500">{story.intro}</p>

          <div className="mt-4 space-y-2">
            {story.spans.map((span) => {
              const isTapped = !!tapped[span.id];
              let cls = "border-slate-200 bg-white text-slate-800 hover:bg-slate-50";
              if (!revealed && isTapped) cls = `${t.borderStrong} ${t.bgSoft} ${t.textStrong}`;
              if (revealed) {
                if (span.is_violation && isTapped) cls = "border-[#54C152] bg-[#D2FFD1] text-[#246B22]";
                else if (span.is_violation && !isTapped) cls = "border-[#F43F5E] bg-[#FFE4E6] text-[#7A1622]";
                else if (!span.is_violation && isTapped) cls = "border-[#F59E0B] bg-[#FEF3C7] text-[#7C4E04]";
                else cls = "border-slate-200 bg-slate-50 text-slate-500";
              }
              return (
                <div key={span.id}>
                  <button
                    disabled={revealed}
                    onClick={() => setTapped((m) => ({ ...m, [span.id]: !m[span.id] }))}
                    className={`group block w-full rounded-xl border-2 px-4 py-3 text-left text-sm transition ${cls}`}
                  >
                    <span className="leading-relaxed">{span.text}</span>
                    {revealed && span.is_violation && (
                      <div className="mt-2 text-xs font-bold uppercase tracking-wider">
                        ⚠ {span.violated_rule}
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {!revealed ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                Tapped <span className="font-bold tabular-nums text-slate-900">{tappedCount}</span> / {story.spans.length}
              </div>
              <button
                onClick={reveal}
                className={`rounded-full ${t.bgSolid} ${t.bgSolidHover} px-6 py-2.5 font-bold text-white shadow`}
              >
                Submit
              </button>
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <Legend />
              <button
                onClick={nextStory}
                className={`rounded-full ${t.bgSolid} ${t.bgSolidHover} px-6 py-2.5 font-bold text-white shadow`}
              >
                {storyIdx + 1 === stories.length ? "See results →" : "Next story →"}
              </button>
            </div>
          )}
        </article>

        <div className="mt-3 text-center text-xs text-slate-500">
          +15 per slip you catch · −8 per slip you miss · −6 false alarm · +10 perfect story
        </div>
      </div>
    </>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
      <li>🟢 caught</li>
      <li>🔴 missed</li>
      <li>🟡 false alarm</li>
    </ul>
  );
}
