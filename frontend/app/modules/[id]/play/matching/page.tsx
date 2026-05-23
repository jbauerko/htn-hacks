"use client";

import { use, useEffect, useMemo, useState } from "react";
import { api, type MatchingResponse } from "@/lib/api";
import { theme } from "@/lib/colors";
import { GAMES } from "@/lib/games";
import { getPersonalBest, recordScore } from "@/lib/storage";
import { Confetti } from "@/app/components/Confetti";
import { Loader, ErrorBox } from "@/app/components/Loader";
import { GameTopBar, ScoreSummary } from "@/app/components/GameShell";
import { useGameData } from "@/app/components/useGameData";

const GAME = GAMES.find((g) => g.id === "matching")!;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Side = "term" | "definition";
type Card = { pairId: string; side: Side; text: string };

type Params = { params: Promise<{ id: string }> };

export default function MatchingGame({ params }: Params) {
  const { id } = use(params);
  const { data, moduleInfo, loading, error, reload } = useGameData<MatchingResponse>(
    id,
    api.matching,
  );

  if (loading) {
    return (
      <Loader
        color={moduleInfo?.color ?? "indigo"}
        label="Shuffling cards…"
        hint="Claude is putting together a fresh deck. Hang tight."
      />
    );
  }
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data || !moduleInfo) return null;

  return <Play id={id} data={data} moduleColor={moduleInfo.color} moduleName={moduleInfo.name} moduleIcon={moduleInfo.icon} reload={reload} />;
}

function Play({
  id, data, moduleColor, moduleName, moduleIcon, reload,
}: {
  id: string; data: MatchingResponse; moduleColor: string;
  moduleName: string; moduleIcon: string; reload: () => void;
}) {
  const t = theme(moduleColor);

  // Build two columns: terms (left) and definitions (right), each shuffled separately.
  const [terms, defs] = useMemo(() => {
    const terms: Card[] = data.pairs.map((p) => ({ pairId: p.id, side: "term", text: p.term }));
    const defs: Card[] = data.pairs.map((p) => ({ pairId: p.id, side: "definition", text: p.definition }));
    return [shuffle(terms), shuffle(defs)];
  }, [data]);

  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);  // pairId of currently picked term
  const [selectedDef, setSelectedDef] = useState<string | null>(null);
  const [solved, setSolved] = useState<Record<string, true>>({});
  const [wrong, setWrong] = useState<{ term: string; def: string } | null>(null);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [best, setBest] = useState(() => getPersonalBest(id, "matching"));
  const [finishedRecord, setFinishedRecord] = useState<{ best: number; isNewBest: boolean } | null>(null);

  const total = data.pairs.length;
  const solvedCount = Object.keys(solved).length;
  const done = solvedCount === total;

  useEffect(() => {
    if (done && !finishedRecord) {
      setFinishedRecord(recordScore(id, "matching", score));
    }
  }, [done, finishedRecord, id, score]);

  // When both sides have a selection, check after a beat
  useEffect(() => {
    if (!selectedTerm || !selectedDef) return;
    if (selectedTerm === selectedDef) {
      // match!
      setSolved((s) => ({ ...s, [selectedTerm]: true }));
      setScore((s) => s + 25);
      setSelectedTerm(null);
      setSelectedDef(null);
    } else {
      setWrong({ term: selectedTerm, def: selectedDef });
      setScore((s) => Math.max(0, s - 5));
      setMisses((m) => m + 1);
      const handle = setTimeout(() => {
        setWrong(null);
        setSelectedTerm(null);
        setSelectedDef(null);
      }, 650);
      return () => clearTimeout(handle);
    }
  }, [selectedTerm, selectedDef]);

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
          correct={total} total={total + misses}
          onPlayAgain={() => {
            setScore(0); setSolved({}); setSelectedTerm(null);
            setSelectedDef(null); setMisses(0); setFinishedRecord(null);
            setBest(record.best);
            reload();
          }}
        />
      </>
    );
  }

  function cardClass(card: Card, selected: boolean) {
    const isSolved = solved[card.pairId];
    const isWrong = wrong && (
      (card.side === "term" && wrong.term === card.pairId) ||
      (card.side === "definition" && wrong.def === card.pairId)
    );
    if (isSolved) return `border-[#A8F0A4] bg-[#E8FFE7] text-[#246B22] opacity-60 cursor-default`;
    if (isWrong) return `border-[#F43F5E] bg-[#FFE4E6] text-[#7A1622] anim-shake`;
    if (selected) return `${t.borderStrong} ${t.bgSoft} ${t.textStrong} scale-[1.02]`;
    return `border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:scale-[1.02]`;
  }

  return (
    <>
      <GameTopBar
        moduleId={id} moduleName={moduleName} moduleColor={moduleColor}
        moduleIcon={moduleIcon} game={GAME} score={score}
        total={`${solvedCount} / ${total}`} best={best}
      />

      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="mb-4 text-center sm:text-left">
          <div className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${t.bgChip} ${t.textStrong}`}>
            +25 per match · −5 per miss
          </div>
          <h2 className="mt-2 text-lg font-bold text-slate-900">
            Tap a term, then tap its matching definition.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* TERMS column */}
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Terms</div>
            <ul className="grid grid-cols-2 gap-2">
              {terms.map((card) => {
                const selected = selectedTerm === card.pairId && !solved[card.pairId];
                return (
                  <li key={card.pairId}>
                    <button
                      disabled={!!solved[card.pairId]}
                      onClick={() => setSelectedTerm(card.pairId)}
                      className={`h-full w-full rounded-2xl border-2 px-3 py-3 text-sm font-bold transition ${cardClass(card, selected)}`}
                    >
                      {card.text}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* DEFINITIONS column */}
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Definitions</div>
            <ul className="space-y-2">
              {defs.map((card) => {
                const selected = selectedDef === card.pairId && !solved[card.pairId];
                return (
                  <li key={card.pairId}>
                    <button
                      disabled={!!solved[card.pairId]}
                      onClick={() => setSelectedDef(card.pairId)}
                      className={`w-full rounded-2xl border-2 px-4 py-3 text-left text-sm transition ${cardClass(card, selected)}`}
                    >
                      {card.text}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
