import { randomInt } from "node:crypto";
import { query, queryOne } from "@/lib/db";

/**
 * Indique e Ganhe. As regras de dinheiro ficam nas funções SQL da migração 0007
 * (atômicas); aqui só ficam os parâmetros e as consultas do painel.
 */

/** Bônus de cadastro de quem usa um cupom (100 CityCoins = US$ 1). */
export const SIGNUP_BONUS = 100;
/** O cupom só vale para contas criadas há até 7 dias e antes da primeira compra. */
export const MAX_ACCOUNT_AGE_DAYS = 7;
/** Bônus de cadastro por cupom por dia (acima disso o indicado entra sem o bônus). */
export const DAILY_SIGNUP_BONUS_CAP = 20;
export const REFERRAL_COOKIE = "vc_ref";

const CODE = /^[A-Z0-9]{3,20}$/;

/** Normaliza o que a pessoa digitou ("torres 10" → "TORRES10"); null se não der um cupom válido. */
export function normalizeCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").normalize("NFD").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 20);
  return CODE.test(code) ? code : null;
}

/** Sugestão de cupom a partir do nome ou do e-mail: TORRES10, ANA10… */
export function suggestCode(nameOrEmail: string): string {
  const base = (normalizeCode(nameOrEmail.split("@")[0]) ?? "VIRAL").replace(/\d+$/, "").slice(0, 12) || "VIRAL";
  return `${base.length >= 3 ? base : `${base}CITY`}10`;
}

export type ApplyResult = "ok" | "cupom_invalido" | "proprio_cupom" | "ja_indicado" | "ja_comprou" | "conta_antiga";

export const APPLY_MESSAGES: Record<ApplyResult, string> = {
  ok: `Cupom aplicado! Você ganhou ${SIGNUP_BONUS} CityCoins e vai ganhar +10% na primeira recarga.`,
  cupom_invalido: "Esse cupom não existe.",
  proprio_cupom: "Você não pode usar o seu próprio cupom.",
  ja_indicado: "Você já usou um cupom.",
  ja_comprou: "O cupom vale só antes da primeira recarga.",
  conta_antiga: `O cupom vale só nos primeiros ${MAX_ACCOUNT_AGE_DAYS} dias da conta.`,
};

export async function applyReferral(userId: string, rawCode: string): Promise<ApplyResult> {
  const code = normalizeCode(rawCode);
  if (!code) return "cupom_invalido";
  const row = await queryOne<{ r: ApplyResult }>("select vc_apply_referral($1, $2, $3, $4, $5) as r", [
    userId,
    code,
    SIGNUP_BONUS,
    MAX_ACCOUNT_AGE_DAYS,
    DAILY_SIGNUP_BONUS_CAP,
  ]);
  return row?.r ?? "cupom_invalido";
}

export async function getCode(userId: string): Promise<string | null> {
  return (await queryOne<{ code: string }>("select code from vc_referral_codes where user_id = $1", [userId]))?.code ?? null;
}

/** Cupom do usuário; na primeira vez cria um a partir do nome (com número no fim se já existir). */
export async function getOrCreateCode(userId: string, nameOrEmail: string): Promise<string> {
  const existing = await getCode(userId);
  if (existing) return existing;
  const base = suggestCode(nameOrEmail).slice(0, 16);
  for (let i = 0; i < 6; i++) {
    const candidate = i === 0 ? base : `${base.replace(/10$/, "")}${randomInt(10, 9999)}`.slice(0, 20);
    const row = await queryOne<{ code: string }>(
      "insert into vc_referral_codes (code, user_id) values ($1, $2) on conflict do nothing returning code",
      [candidate, userId],
    );
    if (row) return row.code;
    const mine = await getCode(userId); // outra aba pode ter criado ao mesmo tempo
    if (mine) return mine;
  }
  throw new Error("Não foi possível criar o cupom agora.");
}

/** Troca o cupom (precisa estar livre). As indicações antigas continuam valendo. */
export async function changeCode(userId: string, raw: string): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  const code = normalizeCode(raw);
  if (!code) return { ok: false, error: "Use de 3 a 20 letras e números, sem espaço." };
  const taken = await queryOne<{ user_id: string }>("select user_id from vc_referral_codes where code = $1", [code]);
  if (taken && taken.user_id !== userId) return { ok: false, error: "Esse cupom já é de outra pessoa." };
  await query(
    "insert into vc_referral_codes (code, user_id) values ($1, $2) on conflict (user_id) do update set code = excluded.code",
    [code, userId],
  );
  return { ok: true, code };
}

export type ReferralStats = { signups: number; buyers: number; coins_earned: number; usd_generated_cents: number };

export async function referralStats(userId: string): Promise<ReferralStats> {
  const row = await queryOne<ReferralStats>(
    `select (select count(*)::int from vc_referrals where referrer_user_id = $1) as signups,
            (select count(distinct referred_user_id)::int from vc_referral_earnings where referrer_user_id = $1) as buyers,
            coalesce((select sum(coins)::int from vc_referral_earnings where referrer_user_id = $1), 0) as coins_earned,
            coalesce((select sum(usd_cents)::int from vc_referral_earnings where referrer_user_id = $1), 0) as usd_generated_cents`,
    [userId],
  );
  return row ?? { signups: 0, buyers: 0, coins_earned: 0, usd_generated_cents: 0 };
}

export type ReferralRow = { email: string; created_at: string; earned: number; purchases: number };

/** Indicados (e-mail mascarado) com quanto cada um rendeu de comissão. */
export async function listReferrals(userId: string, limit = 50): Promise<ReferralRow[]> {
  const rows = await query<ReferralRow>(
    `select u."email" as email, r.created_at,
            coalesce((select sum(e.coins)::int from vc_referral_earnings e where e.referred_user_id = r.referred_user_id), 0) as earned,
            (select count(*)::int from vc_referral_earnings e where e.referred_user_id = r.referred_user_id) as purchases
     from vc_referrals r join "user" u on u."id" = r.referred_user_id
     where r.referrer_user_id = $1 order by r.created_at desc limit $2`,
    [userId, limit],
  );
  return rows.map((r) => ({ ...r, email: maskEmail(r.email) }));
}

/** ana.silva@gmail.com → an•••@gmail.com */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  return `${user.slice(0, 2)}•••@${domain ?? ""}`;
}

/** Se o usuário ainda pode digitar um cupom (conta nova, sem cupom e sem compra). */
export async function canUseCoupon(userId: string): Promise<boolean> {
  const row = await queryOne<{ ok: boolean }>(
    `select not exists (select 1 from vc_referrals where referred_user_id = $1)
        and not exists (select 1 from vc_purchases where user_id = $1 and status = 'paid')
        and exists (select 1 from "user" where "id" = $1 and "createdAt" > now() - make_interval(days => $2)) as ok`,
    [userId, MAX_ACCOUNT_AGE_DAYS],
  );
  return Boolean(row?.ok);
}
