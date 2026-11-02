import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDbConfigured, query, queryOne } from "@/lib/db";
import { decrypt, encrypt } from "./crypto";

/**
 * Cofre de contas. Com o banco configurado usa a tabela vc_accounts (funciona online e no worker);
 * sem banco, cai num arquivo local (.data/accounts.json, modo demo de um usuário só).
 * Com banco, toda leitura do painel filtra pelo dono (userId). Tokens sempre criptografados.
 */
export type Platform = "youtube" | "tiktok" | "instagram";

export type Account = {
  id: string;
  /** Dono no banco (ausente no modo demo com arquivo local). */
  userId?: string;
  platform: Platform;
  externalId: string;
  name: string;
  handle?: string;
  avatarUrl?: string;
  scopes: string[];
  expiresAt?: string;
  connectedAt: string;
};

export type Tokens = { accessToken: string; refreshToken?: string; expiresAt?: string };

type StoredAccount = Account & { tokens: string };

// ---------- backend: arquivo local ----------
function file() {
  return path.join(process.env.DATA_DIR ?? path.join(process.cwd(), ".data"), "accounts.json");
}

async function loadFile(): Promise<StoredAccount[]> {
  try {
    return JSON.parse(await readFile(file(), "utf8"));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function saveFile(rows: StoredAccount[]) {
  const target = file();
  await mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.tmp`;
  await writeFile(tmp, JSON.stringify(rows, null, 2), "utf8");
  await rename(tmp, target);
}

// ---------- backend: Postgres ----------
type Row = {
  id: string;
  user_id: string;
  platform: Platform;
  external_id: string;
  name: string;
  handle: string | null;
  avatar_url: string | null;
  scopes: string[];
  expires_at: string | null;
  connected_at: string;
  tokens: string;
};

const fromRow = (r: Row): StoredAccount => ({
  id: r.id,
  userId: r.user_id,
  platform: r.platform,
  externalId: r.external_id,
  name: r.name,
  handle: r.handle ?? undefined,
  avatarUrl: r.avatar_url ?? undefined,
  scopes: r.scopes ?? [],
  expiresAt: r.expires_at ?? undefined,
  connectedAt: r.connected_at,
  tokens: r.tokens,
});

function strip(row: StoredAccount): Account {
  const account: Partial<StoredAccount> = { ...row };
  delete account.tokens;
  return account as Account;
}

export async function listAccounts(userId: string, platform?: Platform): Promise<Account[]> {
  if (isDbConfigured()) {
    const rows = await query<Row>(
      "select * from vc_accounts where user_id = $1 and ($2::text is null or platform = $2) order by connected_at",
      [userId, platform ?? null],
    );
    return rows.map((r) => strip(fromRow(r)));
  }
  const rows = await loadFile();
  return rows.filter((r) => !platform || r.platform === platform).map(strip);
}

/** Conta pelo ID, sem checar dono: uso interno (worker, upload). No painel use getOwnedAccount. */
export async function getAccount(id: string): Promise<Account | null> {
  if (isDbConfigured()) {
    const row = await queryOne<Row>("select * from vc_accounts where id = $1", [id]);
    return row ? strip(fromRow(row)) : null;
  }
  const row = (await loadFile()).find((r) => r.id === id);
  return row ? strip(row) : null;
}

/** Conta pelo ID, só se pertencer ao usuário. */
export async function getOwnedAccount(userId: string, id: string): Promise<Account | null> {
  if (isDbConfigured()) {
    const row = await queryOne<Row>("select * from vc_accounts where id = $1 and user_id = $2", [id, userId]);
    return row ? strip(fromRow(row)) : null;
  }
  return getAccount(id);
}

/** Cria ou atualiza (mesma plataforma + mesmo ID externo = mesma conta). */
export async function upsertAccount(
  userId: string,
  input: Omit<Account, "id" | "connectedAt">,
  tokens: Tokens,
): Promise<Account> {
  const sealed = encrypt(JSON.stringify(tokens));

  if (isDbConfigured()) {
    const owner = await queryOne<{ user_id: string }>(
      "select user_id from vc_accounts where platform = $1 and external_id = $2",
      [input.platform, input.externalId],
    );
    if (owner && owner.user_id !== userId) {
      throw new Error("Esse canal já está conectado em outra conta da Viral City.");
    }
    const row = (await queryOne<Row>(
      `insert into vc_accounts (user_id, platform, external_id, name, handle, avatar_url, scopes, expires_at, tokens)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       on conflict (platform, external_id) do update set
         name = excluded.name, handle = excluded.handle, avatar_url = excluded.avatar_url,
         scopes = excluded.scopes, expires_at = excluded.expires_at, tokens = excluded.tokens
       returning *`,
      [userId, input.platform, input.externalId, input.name, input.handle ?? null, input.avatarUrl ?? null, input.scopes, tokens.expiresAt ?? null, sealed],
    ))!;
    return strip(fromRow(row));
  }

  const rows = await loadFile();
  const existing = rows.find((r) => r.platform === input.platform && r.externalId === input.externalId);
  const row: StoredAccount = {
    ...input,
    id: existing?.id ?? randomUUID(),
    connectedAt: existing?.connectedAt ?? new Date().toISOString(),
    expiresAt: tokens.expiresAt,
    tokens: sealed,
  };
  await saveFile(existing ? rows.map((r) => (r.id === row.id ? row : r)) : [...rows, row]);
  return strip(row);
}

/** Atualiza só os tokens (após renovar o access token). */
export async function saveTokens(id: string, tokens: Tokens): Promise<void> {
  const sealed = encrypt(JSON.stringify(tokens));
  if (isDbConfigured()) {
    await query("update vc_accounts set tokens = $2, expires_at = $3 where id = $1", [id, sealed, tokens.expiresAt ?? null]);
    return;
  }
  const rows = await loadFile();
  await saveFile(rows.map((r) => (r.id === id ? { ...r, tokens: sealed, expiresAt: tokens.expiresAt } : r)));
}

export async function getTokens(id: string): Promise<Tokens | null> {
  let sealed: string | undefined;
  if (isDbConfigured()) {
    sealed = (await queryOne<{ tokens: string }>("select tokens from vc_accounts where id = $1", [id]))?.tokens;
  } else {
    sealed = (await loadFile()).find((r) => r.id === id)?.tokens;
  }
  return sealed ? (JSON.parse(decrypt(sealed)) as Tokens) : null;
}

export async function removeAccount(userId: string, id: string): Promise<boolean> {
  if (isDbConfigured()) {
    const rows = await query("delete from vc_accounts where id = $1 and user_id = $2 returning id", [id, userId]);
    return rows.length > 0;
  }
  const rows = await loadFile();
  const next = rows.filter((r) => r.id !== id);
  if (next.length === rows.length) return false;
  await saveFile(next);
  return true;
}

/** True quando é possível gravar contas neste ambiente (banco, ou disco local fora da Vercel). */
export function canStoreAccounts(): boolean {
  return isDbConfigured() || !process.env.VERCEL;
}

// ---------- logo do canal (usada nos cortes; só com banco) ----------
export async function getAccountLogo(id: string): Promise<string | null> {
  if (!isDbConfigured()) return null;
  return (await queryOne<{ logo: string | null }>("select logo from vc_accounts where id = $1", [id]))?.logo ?? null;
}

export async function setAccountLogo(userId: string, id: string, dataUrl: string | null): Promise<void> {
  if (!isDbConfigured()) throw new Error("Banco não configurado.");
  await query("update vc_accounts set logo = $3 where id = $1 and user_id = $2", [id, userId, dataUrl]);
}
