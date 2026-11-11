import Link from "next/link";
import { ChevronRight, Database, Scissors } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/painel-ui";
import { listAccounts } from "@/lib/accounts/store";
import { canUseLocalFiles } from "@/lib/clips/local-files";
import { listSources } from "@/lib/clips/repo";
import { requireUserId } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { listChannelUploads } from "@/lib/youtube/channel";
import { niches } from "@/lib/youtube/niches";
import { SourceForm } from "./source-form";
import { sourceStatus } from "./status";

export const dynamic = "force-dynamic";


type Params = Record<string, string | string[] | undefined>;
const one = (p: Params, k: string, max: number) => (Array.isArray(p[k]) ? p[k][0] : (p[k] ?? "")).slice(0, max);

export default async function CortesPage({ searchParams }: { searchParams: Promise<Params> }) {
  if (!isDbConfigured()) {
    return (
      <>
        <PageHeader title="Cortes" subtitle="Transforme um vídeo longo em 5 Shorts." />
        <EmptyState
          icon={Database}
          title="Falta conectar o banco de dados"
          text="Coloque DATABASE_URL no .env.local (e na Vercel)."
        />
      </>
    );
  }

  const params = await searchParams;
  const nicheParam = one(params, "nicho", 30);
  const userId = await requireUserId();
  const accounts = await listAccounts(userId, "youtube");
  const [sources, uploadLists] = await Promise.all([
    listSources(userId),
    Promise.all(accounts.map(async (a) => [a.id, await listChannelUploads(a.externalId)] as const)),
  ]);

  return (
    <>
      <PageHeader title="Cortes" subtitle="Um vídeo longo vira 5 cortes; a IA mostra o que tem mais chance de viralizar." />

      {one(params, "criado", 2) && (
        <p className="mb-6 rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm text-cyan">
          Vídeo na fila! Deixe o worker rodando no PC (<code>npm run worker</code>) e acompanhe abaixo.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SourceForm
            accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
            uploads={Object.fromEntries(uploadLists.map(([id, list]) => [id, list.map((v) => ({ id: v.id, title: v.title, thumbnail: v.thumbnail }))]))}
            niches={niches.filter((n) => n.id !== "geral").map((n) => ({ id: n.id, label: n.label }))}
            defaults={{ niche: niches.some((n) => n.id === nicheParam) ? nicheParam : "", referenceTitle: one(params, "titulo", 200) }}
            localFiles={canUseLocalFiles()}
          />
        </div>
        <aside className="glass h-fit rounded-2xl p-5 text-sm text-muted lg:col-span-2">
          <h2 className="font-semibold text-ink">Como funciona</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>Escolha um vídeo seu, um arquivo do PC ou o link de uma campanha de clipping.</li>
            <li>O worker no seu PC transcreve a fala e a IA escolhe os 5 melhores trechos, com nota de 0 a 100.</li>
            <li>Cada corte sai em 9:16 com texto no topo, logo do canal e legendas animadas.</li>
            <li>Assista, ajuste o texto e aprove: o corte entra na Agenda e é postado no próximo horário.</li>
          </ol>
                  </aside>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold">Seus vídeos longos</h2>
        {sources.length === 0 ? (
          <EmptyState icon={Scissors} title="Nenhum vídeo ainda" text="Os vídeos que você mandar cortar aparecem aqui." />
        ) : (
          <ul className="glass divide-y divide-line rounded-2xl">
            {sources.map((s) => {
              const st = sourceStatus[s.status];
              return (
                <li key={s.id}>
                  <Link href={`/painel/cortes/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5">
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${st.cls}`}>{st.label}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.title || s.upload_name || s.source_url}</p>
                      <p className="truncate text-xs text-muted">
                        {s.progress ?? s.error ?? new Date(s.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
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
