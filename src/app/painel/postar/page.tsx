import Link from "next/link";
import { Database, Send } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/painel-ui";
import { requireUserId } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { canShowVideos } from "@/lib/files/respond";
import { listReadyToPost, listRecentlyPosted } from "@/lib/videos/repo";
import { markPostedAction } from "./actions";
import { PostButtons } from "./post-buttons";

export const dynamic = "force-dynamic";

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }) : "";

export default async function PostarPage() {
  const subtitle = "Seus cortes aprovados, prontos para ir ao ar no YouTube, Instagram e TikTok.";
  if (!isDbConfigured()) {
    return (
      <>
        <PageHeader title="Postar" subtitle={subtitle} />
        <EmptyState icon={Database} title="Falta conectar o banco de dados" text="A lista de cortes fica no banco da Viral City." />
      </>
    );
  }

  const userId = await requireUserId();
  const [ready, posted] = await Promise.all([listReadyToPost(userId), listRecentlyPosted(userId)]);
  const videos = canShowVideos();

  return (
    <>
      <PageHeader title="Postar" subtitle={subtitle} />

      <ol className="mb-6 grid gap-2 rounded-xl border border-line bg-night/40 px-4 py-3 text-sm text-muted sm:grid-cols-3">
        <li>
          <strong className="text-ink">1.</strong> No celular, toque em <strong className="text-ink">Postar</strong> e escolha o app.
        </li>
        <li>
          <strong className="text-ink">2.</strong> O vídeo abre no app; a legenda já vai copiada, é só colar.
        </li>
        <li>
          <strong className="text-ink">3.</strong> Depois de publicar, toque em <strong className="text-ink">Já postei</strong>.
        </li>
      </ol>

      {ready.length === 0 ? (
        <EmptyState icon={Send} title="Nenhum corte esperando" text="Aprove um corte e ele aparece aqui, pronto para postar.">
          <Link href="/painel/scale" className="btn-sunset rounded-full px-5 py-2.5 text-sm font-bold text-night">
            Criar cortes
          </Link>
        </EmptyState>
      ) : (
        <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {ready.map((v) => (
            <li key={v.id} className="glass flex flex-col overflow-hidden rounded-2xl">
              <div className="relative aspect-[9/16] max-h-[440px] bg-night-3">
                {videos ? (
                  <video
                    src={`/api/videos/${v.id}/video`}
                    controls
                    preload="metadata"
                    playsInline
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <p className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">
                    A prévia aparece quando o armazenamento de vídeos estiver configurado.
                  </p>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <h2 className="font-semibold leading-snug">{v.title}</h2>
                  <p className="mt-1 text-xs text-muted">Aprovado em {day(v.created_at)}</p>
                </div>
                <p className="line-clamp-3 whitespace-pre-line rounded-lg bg-night/50 px-3 py-2 text-xs text-ink/80">{v.description}</p>
                <div className="mt-auto">
                  <PostButtons videoId={v.id} caption={v.description} />
                  <form action={markPostedAction} className="mt-1">
                    <input type="hidden" name="id" value={v.id} />
                    <button className="min-h-11 text-sm text-cyan underline-offset-4 hover:underline">Já postei</button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {posted.length > 0 && (
        <section className="glass mt-8 rounded-2xl p-6">
          <h2 className="font-medium">Postados recentemente</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {posted.map((v) => (
              <li key={v.id} className="flex justify-between gap-4 py-2">
                <span className="truncate">{v.title}</span>
                <span className="shrink-0 text-muted">{day(v.published_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
