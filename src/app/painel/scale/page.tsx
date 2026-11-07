import Link from "next/link";
import { ChevronRight, Database, Layers } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/painel-ui";
import { listAccounts } from "@/lib/accounts/store";
import { requireUserId } from "@/lib/auth";
import { canUseLocalFiles } from "@/lib/clips/local-files";
import { listRenderedClips } from "@/lib/clips/repo";
import { isDbConfigured } from "@/lib/db";
import { listScaleJobs } from "@/lib/scale/repo";
import { isTemplateId, templateName } from "@/lib/scale/templates";
import { ScaleForm } from "./scale-form";
import { scaleStatus } from "./status";

export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;
const one = (p: Params, k: string, max: number) => (Array.isArray(p[k]) ? p[k][0] : (p[k] ?? "")).slice(0, max);

export default async function ScalePage({ searchParams }: { searchParams: Promise<Params> }) {
  if (!isDbConfigured()) {
    return (
      <>
        <PageHeader title="Scale" subtitle="Um vídeo vira dezenas de versões prontas para postar." />
        <EmptyState icon={Database} title="Falta conectar o banco de dados" text="Coloque DATABASE_URL no .env.local (e na Vercel)." />
      </>
    );
  }

  const params = await searchParams;
  const userId = await requireUserId();
  const [clips, accounts, jobs] = await Promise.all([listRenderedClips(userId), listAccounts(userId), listScaleJobs(userId)]);
  const template = one(params, "template", 20);
  const count = Math.min(30, Math.max(1, Number(one(params, "versoes", 2)) || (template ? 1 : 10)));

  return (
    <>
      <PageHeader title="Scale" subtitle="Um vídeo vira dezenas de versões com templates e manchetes diferentes, prontas para a Agenda." />

      {one(params, "criado", 2) && (
        <p className="mb-6 rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm text-cyan">
          Na fila! Deixe o worker rodando no PC (<code>npm run worker</code>) e acompanhe abaixo.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <ScaleForm
            clips={clips.map((c) => ({ id: c.id, label: `${c.hook || c.source_title}`.slice(0, 70), score: c.score }))}
            accounts={accounts.map((a) => ({
              id: a.id,
              name: a.name,
              label: `${a.name} (${a.platform})`,
              handle: a.handle ? `@${a.handle.replace(/^@/, "")}` : "",
              avatarUrl: a.avatarUrl ?? null,
            }))}
            localFiles={canUseLocalFiles()}
            initial={{ clipId: one(params, "corte", 40), template: isTemplateId(template) ? template : "", count }}
          />
        </div>
        <aside className="glass h-fit rounded-2xl p-5 text-sm text-muted xl:col-span-2">
          <h2 className="font-semibold text-ink">Para que serve</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Testar várias manchetes no mesmo vídeo e descobrir qual gancho viraliza.</li>
            <li>Ter volume: um clipe de GTA 6, um corte de podcast ou uma aula vira uma semana de posts.</li>
            <li>Cada versão sai com template, manchete e pequenas diferenças de edição (zoom, ritmo e início).</li>
            <li>Aprove uma a uma ou todas de uma vez: elas entram na Agenda.</li>
          </ul>
          <p className="mt-4 text-xs">Use só vídeos seus ou com permissão. Conteúdo de terceiros sem autorização gera strike.</p>
          <Link href="/painel/templates" className="mt-4 inline-block text-pink hover:underline">
            Ver a galeria de templates →
          </Link>
        </aside>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold">Seus lotes</h2>
        {jobs.length === 0 ? (
          <EmptyState icon={Layers} title="Nenhum lote ainda" text="Os lotes de versões que você gerar aparecem aqui." />
        ) : (
          <ul className="glass divide-y divide-line rounded-2xl">
            {jobs.map((j) => {
              const st = scaleStatus[j.status];
              return (
                <li key={j.id}>
                  <Link href={`/painel/scale/${j.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5">
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${st.cls}`}>{st.label}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {j.count} {j.count === 1 ? "versão" : "versões"} · {j.topic || j.base_name || "vídeo"}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {j.progress ?? j.error ?? j.templates.map(templateName).join(", ")}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
