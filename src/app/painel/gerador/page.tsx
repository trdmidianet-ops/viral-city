import { Clapperboard, Database, RotateCcw, Trash2 } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/painel-ui";
import { listAccounts } from "@/lib/accounts/store";
import { isDbConfigured } from "@/lib/db";
import { scriptTemplate, topicFrom } from "@/lib/video/script";
import { listVideos, type VideoStatus } from "@/lib/videos/repo";
import { deleteVideoAction, retryVideoAction } from "./actions";
import { GeneratorForm } from "./generator-form";

export const dynamic = "force-dynamic";

const statusInfo: Record<VideoStatus, { label: string; cls: string }> = {
  queued: { label: "Na fila", cls: "border-line text-muted" },
  rendering: { label: "Gerando…", cls: "border-sun/40 text-sun" },
  ready: { label: "Pronto p/ postar", cls: "border-cyan/40 text-cyan" },
  publishing: { label: "Postando…", cls: "border-sun/40 text-sun" },
  published: { label: "Publicado", cls: "border-pink/40 text-pink" },
  failed: { label: "Erro", cls: "border-pink/60 bg-pink/10 text-pink" },
};

type Params = Record<string, string | string[] | undefined>;
const one = (p: Params, k: string, max: number) => (Array.isArray(p[k]) ? p[k][0] : (p[k] ?? "")).slice(0, max);

export default async function GeradorPage({ searchParams }: { searchParams: Promise<Params> }) {
  if (!isDbConfigured()) {
    return (
      <>
        <PageHeader title="Gerador" subtitle="Transforme um viral em um vídeo original." />
        <EmptyState
          icon={Database}
          title="Falta conectar o banco de dados"
          text="O gerador usa o banco da Viral City para a fila de vídeos. Coloque SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local (e na Vercel)."
        />
      </>
    );
  }

  const params = await searchParams;
  const refId = one(params, "ref", 20);
  const refTitle = one(params, "titulo", 200);
  const reference = /^[\w-]{11}$/.test(refId)
    ? { id: refId, title: refTitle, channel: one(params, "canal", 100), niche: one(params, "nicho", 40) }
    : null;
  const topic = topicFrom(refTitle);

  const [accounts, videos] = await Promise.all([listAccounts("youtube"), listVideos()]);
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));

  return (
    <>
      <PageHeader title="Gerador" subtitle="Use um viral como referência e crie um vídeo 100% original." />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <GeneratorForm
            reference={reference}
            accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
            defaults={{
              title: topic ? topic.slice(0, 60) : "",
              script: scriptTemplate(topic),
              description: topic ? `${topic}\n\n#shorts` : "#shorts",
            }}
          />
        </div>

        <aside className="glass h-fit rounded-2xl p-5 text-sm text-muted lg:col-span-2">
          <h2 className="font-semibold text-ink">Como funciona</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>Escolha um viral em Tendências e clique em “Usar como referência”.</li>
            <li>Escreva o roteiro com suas palavras: o formato inspira, o conteúdo é seu.</li>
            <li>
              O worker no seu PC (<code className="text-ink">npm run worker</code>) gera narração, fundo neon e
              legendas animadas em um Short 9:16.
            </li>
            <li>O vídeo pronto entra na Agenda e é postado no próximo horário da conta.</li>
          </ol>
        </aside>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold">Seus vídeos</h2>
        {videos.length === 0 ? (
          <EmptyState icon={Clapperboard} title="Nenhum vídeo ainda" text="Os vídeos que você mandar gerar aparecem aqui." />
        ) : (
          <ul className="glass divide-y divide-line rounded-2xl">
            {videos.map((v) => {
              const s = statusInfo[v.status];
              return (
                <li key={v.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs ${s.cls}`}>{s.label}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{v.title}</p>
                    <p className="truncate text-xs text-muted">
                      {v.account_id ? accountName.get(v.account_id) ?? "Conta removida" : "Qualquer canal"} ·{" "}
                      {new Date(v.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      {v.duration_seconds ? ` · ${Math.round(v.duration_seconds)}s` : ""}
                      {v.external_post_id && (
                        <>
                          {" · "}
                          <a
                            href={`https://youtube.com/shorts/${v.external_post_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-pink hover:underline"
                          >
                            ver no YouTube
                          </a>
                        </>
                      )}
                    </p>
                    {v.error && <p className="mt-1 text-xs text-pink">{v.error}</p>}
                  </div>
                  {v.status === "failed" && (
                    <form action={retryVideoAction}>
                      <input type="hidden" name="id" value={v.id} />
                      <button className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted hover:bg-white/5 hover:text-ink">
                        <RotateCcw size={14} /> Tentar de novo
                      </button>
                    </form>
                  )}
                  {v.status !== "rendering" && v.status !== "publishing" && (
                    <form action={deleteVideoAction}>
                      <input type="hidden" name="id" value={v.id} />
                      <button
                        aria-label="Apagar vídeo"
                        className="rounded-lg p-1.5 text-muted hover:bg-white/5 hover:text-pink"
                      >
                        <Trash2 size={14} />
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
