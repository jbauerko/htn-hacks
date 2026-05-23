import Link from "next/link";
import { api } from "@/lib/api";
import { theme } from "@/lib/colors";

export const dynamic = "force-dynamic";

export default async function Home() {
  let modules: Awaited<ReturnType<typeof api.listModules>> = [];
  let error: string | null = null;
  try {
    modules = await api.listModules();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <main className="flex w-full flex-1 flex-col">
      <header className="w-full border-b border-slate-200 bg-[rgb(246,248,250)]">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Volunteer Bootcamp
          </h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Study up for HTN &apos;26!
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:py-12">

      {error ? (
        <div className="mx-auto max-w-lg rounded-2xl border-2 border-rose-200 bg-rose-50 p-6 text-rose-800">
          <div className="mb-2 font-bold">Couldn't load roles</div>
          <pre className="whitespace-pre-wrap text-xs">{error}</pre>
          <p className="mt-3 text-sm">
            Make sure the FastAPI server is running on{" "}
            <code className="rounded bg-rose-100 px-1">http://localhost:8000</code>{" "}
            (or set <code>NEXT_PUBLIC_API_URL</code>).
          </p>
        </div>
      ) : modules.length === 0 ? (
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-slate-700">
          No volunteer modules found. Drop a YAML file into{" "}
          <code className="rounded bg-slate-100 px-1 text-slate-800">
            backend/data/modules/
          </code>{" "}
          and refresh.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => {
            const t = theme(m.color);
            return (
              <li key={m.id}>
                <Link
                  href={`/modules/${m.id}`}
                  className={`group block h-full overflow-hidden rounded-3xl border-2 ${t.border} bg-white transition hover:-translate-y-1 hover:shadow-xl hover:${t.borderStrong}`}
                >
                  <div className={`${t.bgAccent} relative h-28 px-5 py-4`}>
                    <div className="absolute -bottom-3 right-4 text-6xl drop-shadow-sm">
                      {m.icon}
                    </div>
                    <div className={`text-xs font-bold uppercase tracking-wider ${t.textMuted}`}>
                      Role
                    </div>
                    <div className={`mt-1 max-w-[75%] text-xl font-extrabold leading-tight ${t.textStrong}`}>
                      {m.name}
                    </div>
                  </div>
                  <div className="px-5 py-4">
                    <p className="line-clamp-3 text-sm text-slate-700">
                      {m.description}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {m.knowledge_item_count} topics · {m.rule_count} rules
                      </span>
                      <span className={`font-bold ${t.textStrong} group-hover:translate-x-1 transition`}>
                        Play →
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      </div>
    </main>
  );
}
