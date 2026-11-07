import { createHash, randomBytes } from "node:crypto";
import { query, queryOne } from "@/lib/db";

/** Chaves de acesso do Claude (MCP). Só o hash fica no banco; a chave aparece uma única vez. */

export const MAX_TOKENS = 5;
const PREFIX = "vc_";

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const isTokenShaped = (t: string) => /^vc_[A-Za-z0-9_-]{40,}$/.test(t);

export type ApiToken = { id: string; name: string; last4: string; created_at: string; last_used_at: string | null };

export async function createApiToken(userId: string, name: string): Promise<{ token: string } | { error: string }> {
  const count = await queryOne<{ n: number }>("select count(*)::int as n from vc_api_tokens where user_id = $1", [userId]);
  if ((count?.n ?? 0) >= MAX_TOKENS) return { error: `Você já tem ${MAX_TOKENS} chaves. Apague uma antes de criar outra.` };
  const token = PREFIX + randomBytes(32).toString("base64url");
  await query("insert into vc_api_tokens (user_id, name, token_hash, last4) values ($1, $2, $3, $4)", [
    userId,
    name.trim().slice(0, 40) || "Claude",
    hashToken(token),
    token.slice(-4),
  ]);
  return { token };
}

export async function listApiTokens(userId: string): Promise<ApiToken[]> {
  return query<ApiToken>("select id, name, last4, created_at, last_used_at from vc_api_tokens where user_id = $1 order by created_at desc", [userId]);
}

export async function deleteApiToken(userId: string, id: string) {
  await query("delete from vc_api_tokens where id = $1 and user_id = $2", [id, userId]);
}

/** Dono da chave (e marca o último uso), ou null se a chave não existe. */
export async function userForToken(token: string): Promise<string | null> {
  if (!isTokenShaped(token)) return null;
  const row = await queryOne<{ user_id: string }>(
    "update vc_api_tokens set last_used_at = now() where token_hash = $1 returning user_id",
    [hashToken(token)],
  );
  return row?.user_id ?? null;
}
