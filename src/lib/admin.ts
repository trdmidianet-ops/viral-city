import { query, queryOne } from "@/lib/db";
import { ADMIN_CHECK_SQL, adminFromRow, type AdminCheckRow } from "./admin-rules";

export { adminEmails, isAdminEmail } from "./admin-rules";

/**
 * O e-mail só vale como admin quando foi provado pelo Google: a conta precisa ter login
 * Google e NÃO ter senha. Assim ninguém vira admin criando uma conta com e-mail e senha
 * usando o e-mail de um administrador.
 */
export async function isAdminUser(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const row = await queryOne<AdminCheckRow>(ADMIN_CHECK_SQL, [userId]).catch(() => null);
  return adminFromRow(row);
}

// ---------- painel de admin ----------

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  balance: number;
  logins: string[];
  sources: number;
  scale_jobs: number;
  purchased_usd_cents: number;
};

export async function listUsersForAdmin(search: string, limit = 100): Promise<AdminUserRow[]> {
  return query<AdminUserRow>(
    `select u."id" as id, u."name" as name, u."email" as email, u."createdAt" as created_at,
            coalesce(w.balance, 0) as balance,
            coalesce((select array_agg(distinct a."providerId") from "account" a where a."userId" = u."id"), '{}') as logins,
            (select count(*)::int from vc_sources s where s.user_id = u."id") as sources,
            (select count(*)::int from vc_scale_jobs j where j.user_id = u."id") as scale_jobs,
            coalesce((select sum(p.usd_cents)::int from vc_purchases p where p.user_id = u."id" and p.status = 'paid'), 0) as purchased_usd_cents
     from "user" u left join vc_wallets w on w.user_id = u."id"
     where $1 = '' or u."email" ilike '%' || $1 || '%' or u."name" ilike '%' || $1 || '%'
     order by u."createdAt" desc limit $2`,
    [search, limit],
  );
}

export async function adminStats() {
  return queryOne<{ users: number; paid_usd_cents: number; coins_in_wallets: number; coins_spent: number }>(
    `select (select count(*)::int from "user") as users,
            coalesce((select sum(usd_cents)::int from vc_purchases where status = 'paid'), 0) as paid_usd_cents,
            coalesce((select sum(balance)::bigint from vc_wallets), 0) as coins_in_wallets,
            coalesce((select -sum(amount)::bigint from vc_coin_ledger where kind = 'spend'), 0) as coins_spent`,
  );
}

/** Dá (ou tira, com valor negativo) CityCoins de um usuário, registrando no extrato. */
export async function grantCoins(userId: string, amount: number, reason: string): Promise<number> {
  const row = await queryOne<{ v: number }>("select vc_move_coins($1, $2, $3, $4) as v", [
    userId,
    amount,
    amount > 0 ? "bonus" : "adjust",
    reason || (amount > 0 ? "Bônus do administrador" : "Ajuste do administrador"),
  ]);
  return Number(row?.v ?? 0);
}
