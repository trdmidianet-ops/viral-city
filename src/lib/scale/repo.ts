import { insertRow, query, queryOne, updateRows } from "@/lib/db";
import type { TemplateId, VariationParams } from "./templates";

export type ScaleStatus = "queued" | "writing" | "rendering" | "ready" | "failed";
export type VariationStatus = "pending" | "rendering" | "rendered" | "approved" | "failed";

export type ScaleJob = {
  id: string;
  user_id: string;
  account_id: string | null;
  base_kind: "clip" | "file";
  clip_id: string | null;
  base_path: string | null;
  base_name: string | null;
  topic: string;
  templates: TemplateId[];
  headlines: string[];
  use_ai: boolean;
  count: number;
  handle: string;
  status: ScaleStatus;
  progress: string | null;
  error: string | null;
  ai_used: boolean | null;
  charged_coins: number | null;
  created_at: string;
  updated_at: string;
};

export type Variation = {
  id: string;
  job_id: string;
  position: number;
  template: TemplateId;
  headline: string;
  params: VariationParams;
  status: VariationStatus;
  error: string | null;
  local_path: string | null;
  duration_seconds: number | null;
  video_id: string | null;
  created_at: string;
  updated_at: string;
};

export type NewScaleJob = Pick<
  ScaleJob,
  "account_id" | "base_kind" | "clip_id" | "base_path" | "base_name" | "topic" | "templates" | "headlines" | "use_ai" | "count" | "handle"
>;

export async function createScaleJob(userId: string, input: NewScaleJob): Promise<ScaleJob> {
  return insertRow<ScaleJob>("vc_scale_jobs", { ...input, user_id: userId });
}

export async function listScaleJobs(userId: string, limit = 30): Promise<ScaleJob[]> {
  return query<ScaleJob>("select * from vc_scale_jobs where user_id = $1 order by created_at desc limit $2", [userId, limit]);
}

export async function getOwnedScaleJob(userId: string, id: string): Promise<ScaleJob | null> {
  return queryOne<ScaleJob>("select * from vc_scale_jobs where id = $1 and user_id = $2", [id, userId]);
}

export async function getScaleJob(id: string): Promise<ScaleJob | null> {
  return queryOne<ScaleJob>("select * from vc_scale_jobs where id = $1", [id]);
}

export async function updateScaleJob(id: string, patch: Partial<ScaleJob>) {
  await updateRows("vc_scale_jobs", { ...patch, updated_at: new Date().toISOString() }, "id = $1", [id]);
}

export async function deleteScaleJob(userId: string, id: string) {
  await query("delete from vc_scale_jobs where id = $1 and user_id = $2", [id, userId]);
}

/** Próximo job da fila, de forma atômica (dois workers nunca pegam o mesmo). */
export async function claimNextScaleJob(): Promise<ScaleJob | null> {
  return queryOne<ScaleJob>(
    `update vc_scale_jobs set status = 'writing', error = null, updated_at = now()
     where id = (select id from vc_scale_jobs where status = 'queued' order by created_at limit 1 for update skip locked)
     returning *`,
  );
}

// ---------- versões ----------

export async function insertVariations(
  jobId: string,
  items: { position: number; template: TemplateId; headline: string; params: VariationParams }[],
) {
  await query("delete from vc_variations where job_id = $1 and status <> 'approved'", [jobId]);
  for (const v of items) {
    await query("insert into vc_variations (job_id, position, template, headline, params) values ($1, $2, $3, $4, $5)", [
      jobId,
      v.position,
      v.template,
      v.headline,
      JSON.stringify(v.params),
    ]);
  }
}

export async function listVariations(jobId: string): Promise<Variation[]> {
  return query<Variation>("select * from vc_variations where job_id = $1 order by position", [jobId]);
}

/** Versão com o job dela, só se o job pertencer ao usuário. */
export async function getOwnedVariation(userId: string, id: string): Promise<{ variation: Variation; job: ScaleJob } | null> {
  const variation = await queryOne<Variation>("select * from vc_variations where id = $1", [id]);
  const job = variation ? await getOwnedScaleJob(userId, variation.job_id) : null;
  return variation && job ? { variation, job } : null;
}

export async function updateVariation(id: string, patch: Partial<Variation>) {
  await updateRows("vc_variations", { ...patch, updated_at: new Date().toISOString() }, "id = $1", [id]);
}

export async function claimNextVariation(): Promise<Variation | null> {
  return queryOne<Variation>(
    `update vc_variations set status = 'rendering', error = null, updated_at = now()
     where id = (select id from vc_variations where status = 'pending' order by updated_at limit 1 for update skip locked)
     returning *`,
  );
}

/**
 * Fecha o job quando nenhuma versão está mais na fila: passa para "ready" uma única vez
 * (atômico) e devolve quantas falharam, para o worker estornar. null = ainda não acabou.
 */
export async function finishScaleJobIfDone(jobId: string): Promise<{ failed: number } | null> {
  const open = await queryOne<{ n: number }>(
    "select count(*)::int as n from vc_variations where job_id = $1 and status in ('pending','rendering')",
    [jobId],
  );
  if (!open || open.n > 0) return null;
  const done = await queryOne<{ id: string }>(
    "update vc_scale_jobs set status = 'ready', progress = null, updated_at = now() where id = $1 and status = 'rendering' returning id",
    [jobId],
  );
  if (!done) return null;
  const failed = await queryOne<{ n: number }>(
    "select count(*)::int as n from vc_variations where job_id = $1 and status = 'failed'",
    [jobId],
  );
  return { failed: failed?.n ?? 0 };
}

/** Versões/jobs travados (PC desligou no meio) voltam para a fila. */
export async function recoverStuckScale(olderThanMinutes = 30) {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000).toISOString();
  await query("update vc_variations set status = 'pending' where status = 'rendering' and updated_at < $1", [cutoff]);
  await query("update vc_scale_jobs set status = 'queued' where status = 'writing' and updated_at < $1", [cutoff]);
}

// ---------- CityCoins ----------

export type ScaleCharge = { ok: true; balance: number | null } | { ok: false; reason: "insufficient" };

export async function chargeScaleJob(jobId: string, coins: number, description: string): Promise<ScaleCharge> {
  try {
    const row = await queryOne<{ v: number | null }>("select vc_charge_scale($1, $2, $3) as v", [jobId, coins, description]);
    return { ok: true, balance: row?.v ?? null };
  } catch (err) {
    if (err instanceof Error && err.message.includes("saldo_insuficiente")) return { ok: false, reason: "insufficient" };
    throw err;
  }
}

/** Devolve CityCoins de um job (tudo, se `coins` for null). Nunca devolve mais do que foi cobrado. */
export async function refundScaleJob(jobId: string, coins: number | null, description: string): Promise<number | null> {
  return (await queryOne<{ v: number | null }>("select vc_refund_scale($1, $2, $3) as v", [jobId, coins, description]))?.v ?? null;
}
