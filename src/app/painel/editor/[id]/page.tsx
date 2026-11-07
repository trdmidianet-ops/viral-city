import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers } from "lucide-react";
import { PageHeader } from "@/components/painel-ui";
import { requireUserId } from "@/lib/auth";
import { canUseLocalFiles } from "@/lib/clips/local-files";
import { getClip, getOwnedSourceWithTranscript } from "@/lib/clips/repo";
import { isDbConfigured } from "@/lib/db";
import { AutoRefresh } from "../../cortes/[id]/auto-refresh";
import { clipStatus } from "../../cortes/status";
import { ClipEditor } from "./clip-editor";

export const dynamic = "force-dynamic";

/** Quanto texto mostrar antes e depois do corte para ajustar o trecho. */
const WINDOW = 90;

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isDbConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const userId = await requireUserId();
  const clip = await getClip(id);
  const source = clip ? await getOwnedSourceWithTranscript(userId, clip.source_id) : null;
  if (!clip || !source) notFound();

  const start = Number(clip.start_seconds);
  const end = Number(clip.end_seconds);
  const words = (source.transcript ?? []).filter((w) => w.end >= start - WINDOW && w.start <= end + WINDOW);
  const local = canUseLocalFiles();
  const st = clipStatus[clip.status];
  const working = clip.status === "pending" || clip.status === "rendering";

  return (
    <>
      <AutoRefresh active={working} />
      <Link href={`/painel/cortes/${source.id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={14} /> Voltar aos cortes
      </Link>
      <PageHeader title="Editor" subtitle={`Ajuste o corte sem timeline · ${source.title || source.upload_name || "vídeo"}`} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <ClipEditor
          key={clip.updated_at}
          clip={{
            id: clip.id,
            start,
            end,
            hook: clip.hook,
            hookPosition: clip.hook_position,
            framing: clip.framing ?? source.framing,
            captions: clip.captions ?? source.captions,
            captionColor: clip.caption_color,
            speed: Number(clip.speed) || 1,
            locked: clip.status === "approved",
          }}
          source={{ id: source.id, duration: Number(source.duration_seconds ?? 0), playable: local && Boolean(source.local_path) }}
          words={words}
        />

        <aside className="space-y-3">
          <div className="glass overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-semibold">Resultado</span>
              <span className={`rounded-full border px-2 py-0.5 text-xs ${st.cls}`}>{st.label}</span>
            </div>
            <div className="aspect-[9/16] bg-night-3">
              {local && clip.local_path && !working ? (
                <video src={`/api/clips/${clip.id}/video?v=${encodeURIComponent(clip.updated_at)}`} controls preload="metadata" playsInline className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted">
                  {clip.status === "failed" ? clip.error : working ? "Renderizando com os ajustes… (o worker precisa estar ligado)" : "A prévia aparece no painel aberto no seu PC."}
                </div>
              )}
            </div>
          </div>
          {clip.status === "approved" && (
            <p className="rounded-xl border border-line p-3 text-xs text-muted">Esse corte já está na Agenda, então não pode mais ser editado.</p>
          )}
          {(clip.status === "rendered" || clip.status === "approved") && (
            <Link href={`/painel/scale?corte=${clip.id}`} className="flex items-center justify-center gap-2 rounded-full border border-pink/40 py-2.5 text-sm hover:bg-pink/10">
              <Layers size={15} /> Multiplicar em várias versões
            </Link>
          )}
        </aside>
      </div>
    </>
  );
}
