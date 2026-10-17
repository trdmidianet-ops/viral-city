import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { db, isDbConfigured, must } from "@/lib/db";
import { decrypt, encrypt } from "./crypto";

/**
 * Cofre de contas. Com o banco configurado usa a tabela vc_accounts (funciona online e no worker);
 * sem banco, cai num arquivo local (.data/accounts.json). Tokens sempre criptografados.
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

// ---------- backend: Supabase ----------
type Row = {
  id: string;
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

export async function listAccounts(platform?: Platform): Promise<Account[]> {
  if (isDbConfigured()) {
    let q = db().from("vc_accounts").select("*").order("connected_at");
    if (platform) q = q.eq("platform", platform);
    return must<Row[]>(await q, "Listar contas").map((r) => strip(fromRow(r)));
  }
  const rows = await loadFile();
  return rows.filter((r) => !platform || r.platform === platform).map(strip);
}

export async function getAccount(id: string): Promise<Account | null> {
  if (isDbConfigured()) {
    const row = must<Row | null>(await db().from("vc_accounts").select("*").eq("id", id).maybeSingle(), "Buscar conta");
    return row ? strip(fromRow(row)) : null;
  }
  const row = (await loadFile()).find((r) => r.id === id);
  return row ? strip(row) : null;
}

/** Cria ou atualiza (mesma plataforma + mesmo ID externo = mesma conta). */
export async function upsertAccount(
  input: Omit<Account, "id" | "connectedAt">,
  tokens: Tokens,
): Promise<Account> {
  const sealed = encrypt(JSON.stringify(tokens));

  if (isDbConfigured()) {
    const row = must<Row>(
      await db()
        .from("vc_accounts")
        .upsert(
          {
            platform: input.platform,
            external_id: input.externalId,
            name: input.name,
            handle: input.handle ?? null,
            avatar_url: input.avatarUrl ?? null,
            scopes: input.scopes,
            expires_at: tokens.expiresAt ?? null,
            tokens: sealed,
          },
          { onConflict: "platform,external_id" },
        )
        .select("*")
        .single(),
      "Salvar conta",
    );
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
    must(await db().from("vc_accounts").update({ tokens: sealed, expires_at: tokens.expiresAt ?? null }).eq("id", id), "Salvar tokens");
    return;
  }
  const rows = await loadFile();
  await saveFile(rows.map((r) => (r.id === id ? { ...r, tokens: sealed, expiresAt: tokens.expiresAt } : r)));
}

export async function getTokens(id: string): Promise<Tokens | null> {
  let sealed: string | undefined;
  if (isDbConfigured()) {
    const row = must<{ tokens: string } | null>(
      await db().from("vc_accounts").select("tokens").eq("id", id).maybeSingle(),
      "Ler tokens",
    );
    sealed = row?.tokens;
  } else {
    sealed = (await loadFile()).find((r) => r.id === id)?.tokens;
  }
  return sealed ? (JSON.parse(decrypt(sealed)) as Tokens) : null;
}

export async function removeAccount(id: string): Promise<boolean> {
  if (isDbConfigured()) {
    const rows = must<{ id: string }[]>(await db().from("vc_accounts").delete().eq("id", id).select("id"), "Remover conta");
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
  const row = must<{ logo: string | null } | null>(
    await db().from("vc_accounts").select("logo").eq("id", id).maybeSingle(),
    "Ler logo",
  );
  return row?.logo ?? null;
}

export async function setAccountLogo(id: string, dataUrl: string | null): Promise<void> {
  if (!isDbConfigured()) throw new Error("Banco não configurado.");
  must(await db().from("vc_accounts").update({ logo: dataUrl }).eq("id", id), "Salvar logo");
}
