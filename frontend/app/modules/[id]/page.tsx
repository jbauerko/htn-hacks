import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { theme } from "@/lib/colors";
import { GAMES } from "@/lib/games";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function ModulePage({ params }: Params) {
  const { id } = await params;

  let detail: Awaited<ReturnType<typeof api.getModule>>;
  try {
    detail = await api.getModule(id);
  } catch (e) {
    if (e instanceof Error && e.message.includes("404")) {
      notFound();
    }
    throw e;
  }

  const t = theme(detail.color);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
      >
        ← All roles
      </Link>

      <header
        className={`relative mt-6 overflow-hidden rounded-3xl ${t.bgAccent} ${t.textStrong} px-8 py-8 shadow-md sm:px-10 sm:py-10`}
      >
        <div className="absolute -right-4 -top-4 text-[10rem] opacity-40 leading-none select-none">
          {detail.icon}
        </div>
        <div className="relative">
          <div className={`text-xs font-bold uppercase tracking-wider ${t.textMuted}`}>
            Volunteer role
          </div>
          <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{detail.name}</h1>
          <p className={`mt-2 max-w-2xl text-sm sm:text-base ${t.textStrong} opacity-90`}>
            {detail.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Chip color={t.bgSoft} text={t.textStrong}>{detail.knowledge_item_count} topics</Chip>
            <Chip color={t.bgSoft} text={t.textStrong}>{detail.rule_count} non-negotiable rules</Chip>
            <Chip color={t.bgSoft} text={t.textStrong}>{detail.glossary.length} glossary terms</Chip>
          </div>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="mb-3 px-1 text-sm font-bold uppercase tracking-wider text-slate-500">
          Mini-games
        </h2>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {GAMES.map((g) => (
            <li key={g.id}>
              <Link
                href={`/modules/${id}/play/${g.id}`}
                className={`group flex h-full items-center gap-4 rounded-2xl border-2 ${t.border} bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-lg`}
              >
                <div
                  className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${t.bgChip} text-3xl group-hover:rotate-6 transition`}
                >
                  {g.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-slate-900">{g.title}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider ${t.bgChip} ${t.textStrong}`}
                    >
                      {g.badge}
                    </span>
                  </div>
                  <div className="mt-0.5 text-sm text-slate-600">
                    {g.tagline}
                  </div>
                </div>
                <div className={`${t.textStrong} text-lg group-hover:translate-x-1 transition`}>
                  →
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 px-1 text-sm font-bold uppercase tracking-wider text-slate-500">
          Briefing
        </h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 text-sm text-slate-600">
            The games are generated from this knowledge. Skim it before you play
            for a much higher score.
          </div>

          <details className="group">
            <summary className="cursor-pointer text-sm font-bold text-slate-800">
              Knowledge topics ({detail.knowledge.length})
            </summary>
            <ul className="mt-3 space-y-3">
              {detail.knowledge.map((k, i) => (
                <li key={i} className={`rounded-xl ${t.bgSoft} p-3`}>
                  <div className={`text-sm font-bold ${t.textStrong}`}>{k.title}</div>
                  <div className="mt-1 text-sm text-slate-800">
                    {k.content}
                  </div>
                </li>
              ))}
            </ul>
          </details>

          {detail.rules.length > 0 && (
            <details className="mt-4 group">
              <summary className="cursor-pointer text-sm font-bold text-slate-800">
                Non-negotiable rules ({detail.rules.length})
              </summary>
              <ul className="mt-3 space-y-2 text-sm text-slate-800">
                {detail.rules.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span>•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {detail.glossary.length > 0 && (
            <details className="mt-4 group">
              <summary className="cursor-pointer text-sm font-bold text-slate-800">
                Glossary ({detail.glossary.length})
              </summary>
              <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {detail.glossary.map((g, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 p-3">
                    <dt className="text-sm font-bold text-slate-900">{g.term}</dt>
                    <dd className="mt-1 text-sm text-slate-600">
                      {g.definition}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
        </div>
      </section>
    </main>
  );
}

function Chip({
  children, color, text,
}: { children: React.ReactNode; color: string; text: string }) {
  return (
    <span className={`rounded-full ${color} ${text} px-3 py-1 font-semibold ring-1 ring-white/60`}>
      {children}
    </span>
  );
}
