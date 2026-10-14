import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { decrypt, encrypt } from "./crypto";

/**
 * Cofre local (uso próprio): contas e tokens em .data/accounts.json, tokens criptografados.
 * Quando o login do Supabase for ativado, esta interface passa a usar a tabela social_accounts.
 */
export type Platform = "youtube" | "tiktok" | "instagram";

export type Account = {
  id: string;
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

function file() {
  return path.join(process.env.DATA_DIR ?? path.join(process.cwd(), ".data"), "accounts.json");
}

async function load(): Promise<StoredAccount[]> {
  try {
    return JSON.parse(await readFile(file(), "utf8"));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function save(rows: StoredAccount[]) {
  const target = file();
  await mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.tmp`;
  await writeFile(tmp, JSON.stringify(rows, null, 2), "utf8");
  await rename(tmp, target);
}

function strip(row: StoredAccount): Account {
  const account: Partial<StoredAccount> = { ...row };
  delete account.tokens;
  return account as Account;
}

export async function listAccounts(platform?: Platform): Promise<Account[]> {
  const rows = await load();
  return rows.filter((r) => !platform || r.platform === platform).map(strip);
}

/** Cria ou atualiza (mesma plataforma + mesmo ID externo = mesma conta). */
export async function upsertAccount(
  input: Omit<Account, "id" | "connectedAt">,
  tokens: Tokens,
): Promise<Account> {
  const rows = await load();
  const existing = rows.find((r) => r.platform === input.platform && r.externalId === input.externalId);
  const row: StoredAccount = {
    ...input,
    id: existing?.id ?? randomUUID(),
    connectedAt: existing?.connectedAt ?? new Date().toISOString(),
    expiresAt: tokens.expiresAt,
    tokens: encrypt(JSON.stringify(tokens)),
  };
  await save(existing ? rows.map((r) => (r.id === row.id ? row : r)) : [...rows, row]);
  return strip(row);
}

export async function getTokens(id: string): Promise<Tokens | null> {
  const row = (await load()).find((r) => r.id === id);
  return row ? (JSON.parse(decrypt(row.tokens)) as Tokens) : null;
}

export async function removeAccount(id: string): Promise<boolean> {
  const rows = await load();
  const next = rows.filter((r) => r.id !== id);
  if (next.length === rows.length) return false;
  await save(next);
  return true;
}
