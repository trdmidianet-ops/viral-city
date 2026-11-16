import { query, queryOne } from "@/lib/db";
import { INACTIVITY_DAYS, INACTIVITY_MAX_DAYS, approvalsSpinKey, type SpinReason } from "./rules";
import { grantSpin, type GrantResult } from "./store";

/**
 * Quando a conta ganha giros: por uso (a cada 5 cortes aprovados) e por inatividade
 * (rotina do worker). Nada aqui pode derrubar quem chama: a roleta é um extra.
 */

/**
 * Chame depois de aprovar um corte ou uma versão do Scale. Cada aprovação cria um vídeo em
 * vc_videos, então o total de vídeos da conta é o total de aprovações.
 * Devolve o resultado da concessão, ou null se ainda não chegou a um múltiplo ou se algo falhou.
 */
export async function grantSpinForApprovals(userId: string): Promise<GrantResult | null> {
  try {
    const row = await queryOne<{ n: number }>("select count(*)::int as n from vc_videos where user_id = $1", [userId]);
    const key = approvalsSpinKey(row?.n ?? 0);
    return key ? await grantSpin(userId, "cuts", key) : null;
  } catch (err) {
    console.warn("[roleta] giro por aprovação não concedido:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Contas verificadas cuja última atividade (enviar um vídeo ou criar um lote do Scale) foi há
 * pelo menos $1 dias e há menos de $3; a partir de $2 dias o motivo vira 'inactive_21'.
 * A chave do giro leva a data da última atividade: cada período parado rende no máximo um giro
 * de 7 dias e um de 21. Quem já recebeu o giro daquela chave não volta na lista.
 */
export const INACTIVE_CANDIDATES_SQL = `
with last as (
  select user_id, max(at) as last_at from (
    select user_id, created_at as at from vc_sources
    union all
    select user_id, created_at as at from vc_scale_jobs
  ) activity group by user_id
), cand as (
  select user_id, last_at,
         case when last_at <= now() - make_interval(days => $2::int) then 'inactive_21' else 'inactive_7' end as reason
    from last
   where last_at <= now() - make_interval(days => $1::int)
     and last_at > now() - make_interval(days => $3::int)
), keyed as (
  select c.*, c.reason || ':' || to_char(c.last_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS') as grant_key from cand c
)
select k.user_id, k.reason, k.grant_key, u."email" as email, u."name" as name
  from keyed k join "user" u on u."id" = k.user_id
 where u."emailVerified"
   and not exists (select 1 from vc_roulette_spins s where s.user_id = k.user_id and s.grant_key = k.grant_key)
 order by k.last_at
 limit $4::int`;

export type InactiveCandidate = { user_id: string; reason: SpinReason; grant_key: string; email: string; name: string };

/**
 * Rotina do worker: concede o giro de inatividade a quem está parado. Devolve só as contas que
 * de fato ganharam um giro agora (para avisar por e-mail).
 */
export async function grantInactivitySpins(limit = 200): Promise<InactiveCandidate[]> {
  const candidates = await query<InactiveCandidate>(INACTIVE_CANDIDATES_SQL, [
    INACTIVITY_DAYS[0],
    INACTIVITY_DAYS[1],
    INACTIVITY_MAX_DAYS,
    limit,
  ]);
  const granted: InactiveCandidate[] = [];
  for (const c of candidates) {
    if ((await grantSpin(c.user_id, c.reason, c.grant_key)) === "ok") granted.push(c);
  }
  return granted;
}
