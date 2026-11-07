import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, CheckCheck, RotateCcw, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/painel-ui";
import { getAccount } from "@/lib/accounts/store";
import { requireUserId } from "@/lib/auth";
import { canUseLocalFiles } from "@/lib/clips/local-files";
import { isDbConfigured } from "@/lib/db";
import { getOwnedScaleJob, listVariations, type Variation } from "@/lib/scale/repo";
import { TEMPLATES, templateName } from "@/lib/scale/templates";
import { AutoRefresh } from "../../cortes/[id]/auto-refresh";
import { approveAllAction, approveVariationAction, deleteScaleAction, retryScaleAction, updateVariationAction } from "../actions";
import { scaleStatus, variationStatus } from "../status";

export const dynamic = "force-dynamic";

const field = "rounded-lg border border-line bg-night/60 px-3 py-2 text-sm outline-none focus:border-pink";

export default async function ScaleJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isDbConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const job = await getOwnedScaleJob(await requireUserId(), id);
  if (!job) notFound();
  const [variations, account] = await Promise.all([listVariations(id), job.account_id ? getAccount(job.account_id) : null]);

  const working = !["ready", "failed"].includes(job.status) || variations.some((v) => v.status === "pending" || v.status === "rendering");
  const st = scaleStatus[job.status];
  const local = canUseLocalFiles();
  const readyCount = variations.filter((v) => v.status === "rendered").length;

  return (
    <>
      <AutoRefresh active={working} />
      <Link href="/painel/scale" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={14} /> Voltar
      </Link>
      <PageHeader title="Scale" subtitle={job.topic || job.base_name || "Versões"} />

      <div className="glass mb-6 flex flex-wrap items-center gap-3 rounded-2xl p-4 text-sm">
        <span className={`rounded-full border px-2.5 py-0.5 text-xs ${st.cls}`}>{st.label}</span>
        <span className="text-muted">
          {job.progress ?? `${job.count} ${job.count === 1 ? "versão" : "versões"} · ${job.templates.map(templateName).join(", ")}`}
          {job.ai_used === true && " · manchetes da IA"}
          {job.ai_used === false && " · manchetes automáticas (IA indisponível)"}
          {account && ` · destino: ${account.name}`}
        </span>
        {job.error && <p className="w-full text-pink">{job.error}</p>}
        <div className="ml-auto flex flex-wrap gap-2">
          {readyCount > 1 && (
            <form action={approveAllAction}>
              <input type="hidden" name="id" value={job.id} />
              <button className="flex items-center gap-1 rounded-full border border-pink/50 px-3 py-1.5 text-xs hover:bg-pink/10">
                <CheckCheck size={14} /> Aprovar as {readyCount} prontas
              </button>
            </form>
          )}
          {job.status === "failed" && (
            <form action={retryScaleAction}>
              <input type="hidden" name="id" value={job.id} />
              <button className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-white/5 hover:text-ink">
                <RotateCcw size={14} /> Tentar de novo
              </button>
            </form>
          )}
          <form action={deleteScaleAction}>
            <input type="hidden" name="id" value={job.id} />
            <button className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-white/5 hover:text-pink">
              <Trash2 size={14} /> Apagar
            </button>
          </form>
        </div>
      </div>

      {variations.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-muted">
          {job.status === "failed" ? "Não foi possível gerar as versões." : "As versões aparecem aqui assim que o worker começar."}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {variations.map((v) => (
            <VariationCard key={v.id} v={v} local={local} />
          ))}
        </div>
      )}
    </>
  );
}

function VariationCard({ v, local }: { v: Variation; local: boolean }) {
  const st = variationStatus[v.status];
  const canPreview = local && (v.status === "rendered" || v.status === "approved") && v.local_path;
  return (
    <article className="glass flex flex-col overflow-hidden rounded-2xl">
      <div className="relative aspect-[9/16] max-h-[480px] bg-night-3">
        {canPreview ? (
          <video
            src={`/api/scale/${v.id}/video?v=${encodeURIComponent(v.updated_at)}`}
            controls
            preload="metadata"
            playsInline
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted">
            {v.status === "failed" ? v.error : local ? "Renderizando a prévia…" : "A prévia aparece no painel aberto no seu PC."}
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-night/80 px-2 py-0.5 font-mono text-[10px] text-ink/80">#{v.position}</span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-xs ${st.cls}`}>{st.label}</span>
          <span className="text-xs text-muted">{templateName(v.template)}</span>
        </div>

        {v.status !== "approved" ? (
          <form action={updateVariationAction} className="space-y-2">
            <input type="hidden" name="id" value={v.id} />
            <input name="headline" defaultValue={v.headline} maxLength={90} aria-label="Manchete" placeholder="Manchete (vazio = sem texto)" className={`${field} w-full`} />
            <div className="flex gap-2">
              <select name="template" defaultValue={v.template} aria-label="Template" className={`${field} min-w-0 flex-1`}>
                {TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button disabled={v.status === "rendering"} className="shrink-0 rounded-lg border border-line px-3 text-xs text-muted hover:text-ink disabled:opacity-40">
                Renderizar
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm font-medium">{v.headline}</p>
        )}

        {v.status === "rendered" && (
          <form action={approveVariationAction} className="mt-auto">
            <input type="hidden" name="id" value={v.id} />
            <button className="btn-sunset flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-white">
              <Check size={16} /> Aprovar para a Agenda
            </button>
          </form>
        )}
      </div>
    </article>
  );
}
