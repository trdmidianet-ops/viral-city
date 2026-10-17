import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, RotateCcw, Sparkles, Star, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/painel-ui";
import { getAccount } from "@/lib/accounts/store";
import { canUseLocalFiles } from "@/lib/clips/local-files";
import { getSource, listClips, type Clip } from "@/lib/clips/repo";
import { isDbConfigured } from "@/lib/db";
import { approveClipAction, deleteSourceAction, retrySourceAction, updateHookAction, updateStyleAction } from "../actions";
import { clipStatus, sourceStatus } from "../status";
import { AutoRefresh } from "./auto-refresh";

export const dynamic = "force-dynamic";

const time = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const field = "rounded-lg border border-line bg-night/60 px-3 py-2 text-sm outline-none focus:border-pink";

export default async function SourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isDbConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const source = await getSource(id);
  if (!source) notFound();
  const [clips, account] = await Promise.all([listClips(id), source.account_id ? getAccount(source.account_id) : null]);

  const working =
    !["ready", "failed"].includes(source.status) || clips.some((c) => c.status === "pending" || c.status === "rendering");
  const st = sourceStatus[source.status];
  const local = canUseLocalFiles();

  return (
    <>
      <AutoRefresh active={working} />
      <Link href="/painel/cortes" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={14} /> Voltar
      </Link>
      <PageHeader
        title="Cortes"
        subtitle={source.title || source.upload_name || source.source_url || "Vídeo longo"}
      />

      <div className="glass mb-6 flex flex-wrap items-center gap-3 rounded-2xl p-4 text-sm">
        <span className={`rounded-full border px-2.5 py-0.5 text-xs ${st.cls}`}>{st.label}</span>
        <span className="text-muted">
          {source.progress ?? (source.duration_seconds ? `Vídeo de ${time(Number(source.duration_seconds))}` : "")}
          {source.ai_used === false && " · escolhidos sem IA (Claude indisponível)"}
          {source.ai_used && " · escolhidos pela IA"}
          {account && ` · destino: ${account.name}`}
        </span>
        {source.error && <p className="w-full text-pink">{source.error}</p>}
        <div className="ml-auto flex gap-2">
          {source.status === "failed" && (
            <form action={retrySourceAction}>
              <input type="hidden" name="id" value={source.id} />
              <button className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-white/5 hover:text-ink">
                <RotateCcw size={14} /> Tentar de novo
              </button>
            </form>
          )}
          <form action={deleteSourceAction}>
            <input type="hidden" name="id" value={source.id} />
            <button className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-white/5 hover:text-pink">
              <Trash2 size={14} /> Apagar
            </button>
          </form>
        </div>
      </div>

      {clips.length > 0 && (
        <form action={updateStyleAction} className="glass mb-6 flex flex-wrap items-end gap-4 rounded-2xl p-4 text-sm">
          <input type="hidden" name="id" value={source.id} />
          <label className="text-xs text-muted">
            Enquadramento
            <select name="framing" defaultValue={source.framing} className={`${field} mt-1 block`}>
              <option value="blur">Fundo desfocado</option>
              <option value="center">Cortar no centro</option>
              <option value="split">Dividido</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="captions" defaultChecked={source.captions} className="accent-pink" /> Legendas
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="use_logo" defaultChecked={source.use_logo} className="accent-pink" /> Logo
          </label>
          <button className="rounded-full border border-pink/50 px-4 py-2 text-xs hover:bg-pink/10">Aplicar e renderizar de novo</button>
          {source.use_logo && account && (
            <span className="text-xs text-muted">
              A logo vem de <Link href="/painel/contas" className="text-pink hover:underline">Contas</Link>.
            </span>
          )}
        </form>
      )}

      {clips.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-muted">
          {source.status === "failed" ? "Não foi possível gerar os cortes." : "Os cortes aparecem aqui assim que o worker terminar."}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {clips.map((c) => (
            <ClipCard key={c.id} clip={c} local={local} />
          ))}
        </div>
      )}
    </>
  );
}

function ClipCard({ clip, local }: { clip: Clip; local: boolean }) {
  const st = clipStatus[clip.status];
  const canPreview = local && (clip.status === "rendered" || clip.status === "approved") && clip.local_path;
  return (
    <article className={`glass flex flex-col overflow-hidden rounded-2xl ${clip.is_best ? "ring-2 ring-orange" : ""}`}>
      <div className="relative aspect-[9/16] max-h-[520px] bg-night-3">
        {canPreview ? (
          <video
            src={`/api/clips/${clip.id}/video?v=${encodeURIComponent(clip.updated_at)}`}
            controls
            preload="metadata"
            playsInline
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted">
            {clip.status === "failed"
              ? clip.error
              : local
                ? "Renderizando a prévia…"
                : "A prévia aparece no painel aberto no seu PC."}
          </div>
        )}
        {clip.is_best && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-gradient-to-r from-pink to-orange px-2.5 py-1 text-xs font-semibold text-white">
            <Star size={12} fill="currentColor" /> Mais viral
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-xs ${st.cls}`}>{st.label}</span>
          <span className="text-xs text-muted">
            {time(Number(clip.start_seconds))}–{time(Number(clip.end_seconds))} ·{" "}
            {Math.round(Number(clip.end_seconds) - Number(clip.start_seconds))}s
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted"><Sparkles size={12} /> Potencial viral</span>
            <span className="font-display text-base text-orange">{clip.score}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10" role="meter" aria-valuenow={clip.score} aria-valuemin={0} aria-valuemax={100} aria-label="Potencial viral">
            <div className="h-full bg-gradient-to-r from-pink to-orange" style={{ width: `${clip.score}%` }} />
          </div>
          {clip.reason && <p className="mt-2 text-xs text-muted">{clip.reason}</p>}
        </div>

        {clip.status !== "approved" ? (
          <form action={updateHookAction} className="flex gap-2">
            <input type="hidden" name="id" value={clip.id} />
            <input
              name="hook"
              defaultValue={clip.hook}
              maxLength={80}
              aria-label="Texto no topo do vídeo"
              placeholder="Texto no topo (vazio = sem texto)"
              className={`${field} min-w-0 flex-1`}
            />
            <button className="shrink-0 rounded-lg border border-line px-3 text-xs text-muted hover:text-ink">Salvar</button>
          </form>
        ) : (
          <p className="text-sm font-medium">{clip.hook}</p>
        )}

        {clip.status === "rendered" && (
          <form action={approveClipAction} className="mt-auto">
            <input type="hidden" name="id" value={clip.id} />
            <button className="btn-sunset flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-white">
              <Check size={16} /> Aprovar para a Agenda
            </button>
          </form>
        )}
      </div>
    </article>
  );
}
