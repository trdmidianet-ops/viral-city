import { db, must } from "@/lib/db";

export type VideoStatus = "queued" | "rendering" | "ready" | "publishing" | "published" | "failed";

export type Reference = { videoId?: string; title?: string; channel?: string; url?: string; niche?: string };

export type Video = {
  id: string;
  account_id: string | null;
  reference: Reference | null;
  title: string;
  description: string;
  script: string;
  voice: string;
  status: VideoStatus;
  error: string | null;
  local_path: string | null;
  duration_seconds: number | null;
  external_post_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const T = "vc_videos";

export async function createVideo(input: {
  accountId: string | null;
  reference: Reference | null;
  title: string;
  description: string;
  script: string;
  voice: string;
}): Promise<Video> {
  return must<Video>(
    await db()
      .from(T)
      .insert({
        account_id: input.accountId,
        reference: input.reference,
        title: input.title,
        description: input.description,
        script: input.script,
        voice: input.voice,
      })
      .select("*")
      .single(),
    "Criar vídeo",
  );
}

export async function listVideos(limit = 50): Promise<Video[]> {
  return must<Video[]>(
    await db().from(T).select("*").order("created_at", { ascending: false }).limit(limit),
    "Listar vídeos",
  );
}

async function update(id: string, patch: Partial<Video>, onlyIfStatus?: VideoStatus[]) {
  let q = db()
    .from(T)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (onlyIfStatus) q = q.in("status", onlyIfStatus);
  return must<Video[]>(await q.select("*"), "Atualizar vídeo");
}

/** Pega o próximo vídeo da fila de forma atômica (só um worker processa cada vídeo). */
export async function claimNextQueued(): Promise<Video | null> {
  const next = must<Pick<Video, "id">[]>(
    await db().from(T).select("id").eq("status", "queued").order("created_at").limit(1),
    "Fila",
  )[0];
  if (!next) return null;
  const [claimed] = await update(next.id, { status: "rendering", error: null }, ["queued"]);
  return claimed ?? null;
}

export const markReady = (id: string, localPath: string, duration: number) =>
  update(id, { status: "ready", local_path: localPath, duration_seconds: duration });

export const markFailed = (id: string, error: string) => update(id, { status: "failed", error: error.slice(0, 1000) });

/** Próximo vídeo pronto para a conta (os sem conta definida também servem). */
export async function nextReadyFor(accountId: string): Promise<Video | null> {
  const rows = must<Video[]>(
    await db()
      .from(T)
      .select("*")
      .eq("status", "ready")
      .or(`account_id.eq.${accountId},account_id.is.null`)
      .order("created_at")
      .limit(1),
    "Próximo vídeo pronto",
  );
  return rows[0] ?? null;
}

export async function claimForPublishing(id: string, accountId: string): Promise<Video | null> {
  const [v] = await update(id, { status: "publishing", account_id: accountId, error: null }, ["ready"]);
  return v ?? null;
}

export const markPublished = (id: string, externalId: string) =>
  update(id, { status: "published", external_post_id: externalId, published_at: new Date().toISOString() });

/** Volta um vídeo com erro para a etapa certa: renderizar de novo ou só tentar postar de novo. */
export async function retryVideo(id: string) {
  const [v] = must<Video[]>(await db().from(T).select("*").eq("id", id), "Buscar vídeo");
  if (!v || v.status !== "failed") return;
  await update(id, { status: v.local_path ? "ready" : "queued", error: null }, ["failed"]);
}

export async function deleteVideo(id: string) {
  must(await db().from(T).delete().eq("id", id).in("status", ["queued", "ready", "failed", "published"]), "Apagar vídeo");
}

/** Vídeos que travaram em "renderizando"/"publicando" (ex.: PC desligou no meio) voltam para a fila. */
export async function recoverStuck(olderThanMinutes = 30) {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000).toISOString();
  must(await db().from(T).update({ status: "queued" }).eq("status", "rendering").lt("updated_at", cutoff), "Recuperar fila");
  must(
    await db().from(T).update({ status: "failed", error: "Publicação interrompida. Verifique no canal antes de tentar de novo." }).eq("status", "publishing").lt("updated_at", cutoff),
    "Recuperar publicações",
  );
}
