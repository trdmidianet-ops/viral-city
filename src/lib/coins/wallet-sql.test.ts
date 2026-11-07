import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { ADMIN_CHECK_SQL, adminFromRow, type AdminCheckRow } from "@/lib/admin-rules";

/**
 * Testa as migrações e as funções de dinheiro (CityCoins) num Postgres de verdade,
 * embutido (PGlite), sem precisar do Neon.
 */

let db: PGlite;
const USER = "user_1";

const one = async <T>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows[0];
const balance = async () => Number((await one<{ balance: string }>("select balance from vc_wallets where user_id = $1", [USER]))?.balance ?? 0);

async function newSource(): Promise<string> {
  return (await one<{ id: string }>("insert into vc_sources (user_id, kind, title) values ($1, 'file', 'teste') returning id", [USER])).id;
}

beforeAll(async () => {
  db = new PGlite();
  const dir = path.join(process.cwd(), "db", "migrations");
  for (const file of (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(await readFile(path.join(dir, file), "utf8"));
  }
  await db.query(`insert into "user" ("id", "name", "email", "updatedAt") values ($1, 'Ana', 'ana@exemplo.com', now())`, [USER]);
}, 60_000);

describe("CityCoins no banco", () => {
  it("sem carteira, o saldo é zero e não dá para gastar", async () => {
    expect(await balance()).toBe(0);
    await expect(db.query("select vc_move_coins($1, -10, 'spend', 'x')", [USER])).rejects.toThrow(/saldo_insuficiente/);
  });

  it("credita uma compra paga uma única vez", async () => {
    await db.query(
      "insert into vc_purchases (user_id, stripe_session_id, currency, amount_minor, usd_cents, coins, usd_rate) values ($1, 'cs_1', 'brl', 2800, 500, 500, 5.6)",
      [USER],
    );
    expect(Number((await one<{ v: string }>("select vc_credit_purchase('cs_1') as v")).v)).toBe(500);
    expect((await one<{ v: string | null }>("select vc_credit_purchase('cs_1') as v")).v).toBeNull();
    expect(await balance()).toBe(500);
  });

  it("cobra uma fonte uma única vez e estorna se falhar", async () => {
    const source = await newSource();
    expect(Number((await one<{ v: string }>("select vc_charge_source($1, 60, 'cortes') as v", [source])).v)).toBe(440);
    // reprocessar a mesma fonte não cobra de novo
    expect((await one<{ v: string | null }>("select vc_charge_source($1, 60, 'cortes') as v", [source])).v).toBeNull();
    expect(Number((await one<{ v: string }>("select vc_refund_source($1, 'estorno') as v", [source])).v)).toBe(500);
    expect((await one<{ v: string | null }>("select vc_refund_source($1, 'estorno') as v", [source])).v).toBeNull();
  });

  it("sem saldo suficiente, a cobrança não acontece e a fonte continua sem cobrança", async () => {
    const source = await newSource();
    await expect(db.query("select vc_charge_source($1, 9999, 'cortes')", [source])).rejects.toThrow(/saldo_insuficiente/);
    expect((await one<{ charged_coins: number | null }>("select charged_coins from vc_sources where id = $1", [source])).charged_coins).toBeNull();
    expect(await balance()).toBe(500);
  });

  it("o extrato registra cada movimento com o saldo depois dele", async () => {
    const rows = (await db.query<{ amount: string; balance_after: string; kind: string }>(
      "select amount, balance_after, kind from vc_coin_ledger where user_id = $1 order by id",
      [USER],
    )).rows.map((r) => [r.kind, Number(r.amount), Number(r.balance_after)]);
    expect(rows).toEqual([
      ["purchase", 500, 500],
      ["spend", -60, 440],
      ["refund", 60, 500],
    ]);
  });
});

describe("CityCoins do Scale no banco", () => {
  async function newJob(count: number): Promise<string> {
    return (
      await one<{ id: string }>(
        "insert into vc_scale_jobs (user_id, base_kind, templates, count) values ($1, 'file', '{manchete}', $2) returning id",
        [USER, count],
      )
    ).id;
  }

  it("cobra um lote uma única vez e devolve só as versões que falharam", async () => {
    const job = await newJob(10);
    expect(Number((await one<{ v: string }>("select vc_charge_scale($1, 20, 'scale') as v", [job])).v)).toBe(480);
    expect((await one<{ v: string | null }>("select vc_charge_scale($1, 20, 'scale') as v", [job])).v).toBeNull();
    // 3 versões falharam: volta 6
    expect(Number((await one<{ v: string }>("select vc_refund_scale($1, 6, 'estorno parcial') as v", [job])).v)).toBe(486);
    // pedir mais do que sobrou cobrado devolve só o resto (14)
    expect(Number((await one<{ v: string }>("select vc_refund_scale($1, 999, 'estorno') as v", [job])).v)).toBe(500);
    expect((await one<{ v: string | null }>("select vc_refund_scale($1, null, 'estorno') as v", [job])).v).toBeNull();
  });

  it("sem saldo, o lote não é cobrado", async () => {
    const job = await newJob(30);
    await expect(db.query("select vc_charge_scale($1, 9999, 'scale')", [job])).rejects.toThrow(/saldo_insuficiente/);
    expect((await one<{ charged_coins: number | null }>("select charged_coins from vc_scale_jobs where id = $1", [job])).charged_coins).toBeNull();
    expect(await balance()).toBe(500);
  });
});

describe("administrador", () => {
  async function user(id: string, email: string, providers: string[]) {
    await db.query(`insert into "user" ("id", "name", "email", "updatedAt") values ($1, 'x', $2, now())`, [id, email]);
    for (const p of providers) {
      await db.query(
        `insert into "account" ("id", "accountId", "providerId", "userId", "createdAt", "updatedAt") values ($1, $1, $2, $3, now(), now())`,
        [`${id}-${p}`, p, id],
      );
    }
  }
  const check = async (id: string) => adminFromRow(await one<AdminCheckRow>(ADMIN_CHECK_SQL, [id]));

  it("só vira admin com o e-mail da lista entrando pelo Google, sem senha", async () => {
    await user("adm", "Rafhael.MouraSaraiva@gmail.com", ["google"]);
    await user("fake", "rafhael.mourasaraiva@gmail.com.br", ["google"]);
    expect(await check("adm")).toBe(true);
    expect(await check("fake")).toBe(false);
    expect(await check(USER)).toBe(false);
  });

  it("uma conta com senha usando o e-mail do admin não vira admin", async () => {
    await db.query(`delete from "user" where "id" = 'adm'`);
    await user("impostor", "rafhael.mourasaraiva@gmail.com", ["credential", "google"]);
    expect(await check("impostor")).toBe(false);
  });
});
