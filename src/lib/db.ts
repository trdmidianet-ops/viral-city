import { Pool, types, type CustomTypesConfig, type QueryResultRow } from "pg";
import { resolve4 } from "node:dns/promises";

/**
 * Banco da Viral City: Postgres comum (Neon em produção, mas roda em qualquer Postgres),
 * acessado só pelo servidor e pelo worker com DATABASE_URL. Sem dependência de provedor.
 *
 * NOTA: Railway US East não roteia IPv6. Neon retorna apenas endereços IPv6 no DNS
 * daquela região, então forçamos resolução IPv4 (resolve4) antes de criar o Pool.
 */

// Tipos do Postgres em formatos fáceis de usar no app (e iguais aos que o painel já espera):
// numeric e bigint viram number; data/hora viram texto ISO; date fica "AAAA-MM-DD".
// Vale só para as conexões do app: o login (Better Auth) usa os tipos padrão (Date).
const appTypes: CustomTypesConfig = {
  getTypeParser: ((oid: number, format?: "text" | "binary") => {
    if (oid === types.builtins.NUMERIC) return (v: string) => parseFloat(v);
    if (oid === types.builtins.INT8) return (v: string) => Number(v);
    if (oid === types.builtins.DATE) return (v: string) => v;
    if (oid === types.builtins.TIMESTAMPTZ) {
      const parse = types.getTypeParser(oid, "text");
      return (v: string) => (parse(v) as Date).toISOString();
    }
    return types.getTypeParser(oid, format ?? "text");
  }) as CustomTypesConfig["getTypeParser"],
};

let pool: Pool | null = null;
let authPool: Pool | null = null;
const maxConnections = () => (process.env.VERCEL ? 3 : 10);

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Conexões compartilhadas do app (poucas na Vercel, onde cada função abre as suas). */
export function db(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("Banco não configurado (DATABASE_URL).");
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: maxConnections(), types: appTypes });
  return pool;
}

/** Conexões do login (Better Auth), com os tipos padrão do Postgres. */
export function authDb(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("Banco não configurado (DATABASE_URL).");
  authPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: maxConnections() });
  return authPool;
}

// ---------------------------------------------------------------------------
// Pool com resolução IPv4 explícita (worker em Railway US East, sem rota IPv6)
// ---------------------------------------------------------------------------
// Na primeira query, resolvemos o hostname do Neon via dns.resolve4() para obter
// um endereço IPv4 puro. O Pool usa esse IP diretamente, evitando ENETUNREACH.
let _workerPool: Pool | null = null;
let _workerPoolInit: Promise<Pool> | null = null;

async function workerPool(): Promise<Pool> {
  if (_workerPool) return _workerPool;
  if (!_workerPoolInit) {
    _workerPoolInit = (async () => {
      const raw = process.env.DATABASE_URL;
      if (!raw) throw new Error("DATABASE_URL não configurado.");
      let cs = raw;
      try {
        const u = new URL(raw);
        const [ipv4] = await resolve4(u.hostname);
        u.hostname = ipv4;
        cs = u.toString();
        console.log(`[db] Neon→IPv4: ${ipv4}`);
      } catch (e) {
        console.warn(`[db] dns.resolve4 falhou, usando hostname original: ${e}`);
      }
      _workerPool = new Pool({ connectionString: cs, max: maxConnections(), types: appTypes });
      return _workerPool;
    })();
  }
  return _workerPoolInit;
}

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  // No worker (Railway), usa pool com IPv4 explícito para evitar ENETUNREACH.
  // Na Vercel/local, process.env.RAILWAY_ENVIRONMENT não existe e cai no fallback síncrono.
  if (process.env.RAILWAY_ENVIRONMENT) {
    return (await (await workerPool()).query<T>(text, params)).rows;
  }
  return (await db().query<T>(text, params)).rows;
}

export async function queryOne<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
  return (await query<T>(text, params))[0] ?? null;
}

// ---------- inserir / atualizar a partir de objetos ----------

// Colunas jsonb: o pg converteria listas para array do Postgres, então vão como JSON.
const JSONB = new Set(["transcript", "reference"]);
const IDENT = /^[a-z_][a-z0-9_]*$/;

function ident(name: string): string {
  if (!IDENT.test(name)) throw new Error(`Nome inválido: ${name}`);
  return name;
}

const toParam = (col: string, v: unknown) => (v !== null && typeof v === "object" && JSONB.has(col) ? JSON.stringify(v) : v);

/** INSERT com as chaves do objeto (as undefined ficam de fora); devolve a linha criada. */
export async function insertRow<T extends QueryResultRow>(table: string, row: Record<string, unknown>): Promise<T> {
  const cols = Object.keys(row).filter((k) => row[k] !== undefined);
  const rows = await query<T>(
    `insert into ${ident(table)} (${cols.map(ident).join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")}) returning *`,
    cols.map((c) => toParam(c, row[c])),
  );
  return rows[0];
}

/**
 * UPDATE com as chaves do objeto. `where` usa $1, $2… para os próprios parâmetros
 * (os campos do SET são numerados depois deles). Devolve as linhas alteradas.
 */
export async function updateRows<T extends QueryResultRow>(
  table: string,
  patch: Record<string, unknown>,
  where: string,
  whereParams: unknown[],
): Promise<T[]> {
  const cols = Object.keys(patch).filter((k) => patch[k] !== undefined);
  if (!cols.length) return [];
  const set = cols.map((c, i) => `${ident(c)} = $${whereParams.length + i + 1}`).join(", ");
  return query<T>(`update ${ident(table)} set ${set} where ${where} returning *`, [
    ...whereParams,
    ...cols.map((c) => toParam(c, patch[c])),
  ]);
}
