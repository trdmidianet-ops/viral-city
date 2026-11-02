import { insertRow, query, queryOne, updateRows } from "@/lib/db";

export type VideoStatus = "queued" | "rendering" | "ready" | "publishing" | "published" | "failed";

export type Reference = { videoId?: string; title?: string; channel?: string; url?: string; niche?: string };

export type Video = {
  id: string;
  user_id: string;
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

/** Corte aprovado vira um vídeo pronto para a agenda postar. */
export async function createReadyVideo(userId: string, input: {
  accountId: string | null;
  reference: Reference | null;
  title: string;
  description: string;
  localPath: string;
  duration: number;
}): Promise<Video> {
  return insertRow<Video>("vc_videos", {
    user_id: userId,
    account_id: input.accountId,
    reference: input.reference,
    title: input.title,
    description: input.description,
    status: "ready",
    local_path: input.localPath,
    duration_seconds: input.duration,
  });
}

export async function listVideos(userId: string, limit = 50): Promise<Video[]> {
  return query<Video>("select * from vc_videos where user_id = $1 order by created_at desc limit $2", [userId, limit]);
}

async function update(id: string, patch: Partial<Video>, onlyIfStatus?: VideoStatus[]) {
  const where = onlyIfStatus ? "id = $1 and status = any($2)" : "id = $1";
  return updateRows<Video>("vc_videos", { ...patch, updated_at: new Date().toISOString() }, where, onlyIfStatus ? [id, onlyIfStatus] : [id]);
}

export const markFailed = (id: string, error: string) => update(id, { status: "failed", error: error.slice(0, 1000) });

/** Próximo vídeo pronto para a conta (os do mesmo dono sem conta definida também servem). */
export async function nextReadyFor(accountId: string, userId: string): Promise<Video | null> {
  return queryOne<Video>(
    `select * from vc_videos where user_id = $1 and status = 'ready' and (account_id = $2 or account_id is null)
     order by created_at limit 1`,
    [userId, accountId],
  );
}

export async function claimForPublishing(id: string, accountId: string): Promise<Video | null> {
  const [v] = await update(id, { status: "publishing", account_id: accountId, error: null }, ["ready"]);
  return v ?? null;
}

export const markPublished = (id: string, externalId: string) =>
  update(id, { status: "published", external_post_id: externalId, published_at: new Date().toISOString() });

/** Volta um vídeo com erro para a etapa certa: renderizar de novo ou só tentar postar de novo. */
export async function retryVideo(userId: string, id: string) {
  const v = await queryOne<Video>("select * from vc_videos where id = $1 and user_id = $2", [id, userId]);
  if (!v || v.status !== "failed") return;
  await update(id, { status: v.local_path ? "ready" : "queued", error: null }, ["failed"]);
}

export async function deleteVideo(userId: string, id: string) {
  await query("delete from vc_videos where id = $1 and user_id = $2 and status = any($3)", [
    id,
    userId,
    ["queued", "ready", "failed", "published"],
  ]);
}

/** Vídeos que travaram em "renderizando"/"publicando" (ex.: PC desligou no meio) voltam para a fila. */
export async function recoverStuck(olderThanMinutes = 30) {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000).toISOString();
  await query("update vc_videos set status = 'queued' where status = 'rendering' and updated_at < $1", [cutoff]);
  await query("update vc_videos set status = 'failed', error = $2 where status = 'publishing' and updated_at < $1", [
    cutoff,
    "Publicação interrompida. Verifique no canal antes de tentar de novo.",
  ]);
}
