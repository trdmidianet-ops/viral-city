import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { ADMIN_CHECK_SQL, adminFromRow, type AdminCheckRow } from "@/lib/admin-rules";
import { INACTIVE_CANDIDATES_SQL } from "@/lib/roulette/grants";

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

describe("Indique e Ganhe no banco", () => {
  const apply = async (user: string, code: string, cap = 20) =>
    (await one<{ r: string }>("select vc_apply_referral($1, $2, 100, 7, $3) as r", [user, code, cap])).r;
  const bal = async (user: string) => Number((await one<{ balance: string }>("select balance from vc_wallets where user_id = $1", [user]))?.balance ?? 0);
  async function newUser(id: string) {
    await db.query(`insert into "user" ("id", "name", "email", "updatedAt") values ($1, 'x', $2, now())`, [id, `${id}@exemplo.com`]);
  }
  async function buy(user: string, session: string, coins: number) {
    await db.query(
      "insert into vc_purchases (user_id, stripe_session_id, currency, amount_minor, usd_cents, coins, usd_rate) values ($1, $2, 'usd', $3, $3, $3, 1)",
      [user, session, coins],
    );
    return one<{ v: string | null }>("select vc_credit_purchase($1) as v", [session]);
  }

  beforeAll(async () => {
    await newUser("torres");
    await newUser("amigo");
    await newUser("amigo2");
    await db.query("insert into vc_referral_codes (code, user_id) values ('TORRES10', 'torres')");
  });

  it("recusa cupom inexistente e o próprio cupom", async () => {
    expect(await apply("amigo", "NAOEXISTE")).toBe("cupom_invalido");
    expect(await apply("torres", "torres10")).toBe("proprio_cupom");
  });

  it("aplica o cupom uma única vez e dá o bônus de cadastro", async () => {
    expect(await apply("amigo", " torres10 ")).toBe("ok");
    expect(await bal("amigo")).toBe(100);
    expect(await apply("amigo", "TORRES10")).toBe("ja_indicado");
    expect(await bal("amigo")).toBe(100);
  });

  it("primeira compra: indicado ganha +10% e quem indicou ganha 10%; depois só a comissão", async () => {
    expect(Number((await buy("amigo", "cs_ref_1", 1000)).v)).toBe(100 + 1000 + 100);
    expect(await bal("torres")).toBe(100);
    // o webhook chegando de novo não paga nada a mais
    expect((await buy("amigo", "cs_ref_1", 1000).catch(() => ({ v: null }))).v ?? null).toBeNull();
    expect(Number((await one<{ v: string | null }>("select vc_credit_purchase('cs_ref_1') as v")).v ?? 0)).toBe(0);
    // segunda compra: sem bônus para o indicado, 10% para quem indicou
    expect(Number((await buy("amigo", "cs_ref_2", 500)).v)).toBe(1200 + 500);
    expect(await bal("torres")).toBe(150);
    expect(Number((await one<{ n: string }>("select count(*) as n from vc_referral_earnings where referrer_user_id = 'torres'")).n)).toBe(2);
  });

  it("depois de comprar, não dá mais para usar cupom", async () => {
    await db.query("insert into vc_referral_codes (code, user_id) values ('AMIGO10', 'amigo')");
    await buy("amigo2", "cs_ref_3", 200);
    expect(await apply("amigo2", "AMIGO10")).toBe("ja_comprou");
  });

  it("acima do limite diário, o indicado entra sem o bônus de cadastro", async () => {
    await newUser("amigo3");
    expect(await apply("amigo3", "TORRES10", 1)).toBe("ok");
    expect(await bal("amigo3")).toBe(0);
  });
});

describe("Lembretes da agenda no banco", () => {
  const U = "agenda_1";
  // mesmo SQL de lib/schedule/repo.ts
  const addReminder = (weekday: number, time: string) =>
    db.query(
      `insert into vc_posting_slots (user_id, account_id, weekday, post_time, timezone) values ($1, null, $2, $3, 'America/Sao_Paulo')
       on conflict (user_id, weekday, post_time) where account_id is null do nothing`,
      [U, weekday, time],
    );
  const claim = async (id: string, date: string) =>
    (await db.query("update vc_posting_slots set last_run_on = $2 where id = $1 and last_run_on is distinct from $2::date returning id", [id, date])).rows.length === 1;

  beforeAll(async () => {
    await db.query(`insert into "user" ("id", "name", "email", "updatedAt") values ($1, 'x', 'agenda@exemplo.com', now())`, [U]);
  });

  it("cria lembrete sem conta e ignora o horário repetido", async () => {
    await addReminder(5, "18:00");
    await addReminder(5, "18:00");
    await addReminder(1, "12:00");
    const rows = (await db.query<{ weekday: number }>("select weekday from vc_posting_slots where user_id = $1 and account_id is null", [U])).rows;
    expect(rows.map((r) => r.weekday).sort()).toEqual([1, 5]);
  });

  it("cada lembrete roda uma vez por dia, mesmo com duas chamadas ao mesmo tempo", async () => {
    const id = (await one<{ id: string }>("select id from vc_posting_slots where user_id = $1 and weekday = 5", [U])).id;
    expect(await claim(id, "2026-11-20")).toBe(true);
    expect(await claim(id, "2026-11-20")).toBe(false);
    expect(await claim(id, "2026-11-27")).toBe(true);
  });
});

describe("Roleta no banco", () => {
  const R = "roleta_1";
  // ttl 7 dias, até 3 guardados, até 4 por mês
  const grant = async (user: string, reason: string, key: string) =>
    (await one<{ r: string }>("select vc_grant_spin($1, $2, $3, 7, 3, 4) as r", [user, reason, key])).r;
  // prêmio máximo 500, carência de 90 dias, substituto 100
  const spin = async (user: string, prize: number) =>
    (await db.query<{ won_prize: number; new_balance: string }>("select won_prize, new_balance from vc_spin_roulette($1, $2, 500, 90, 100)", [user, prize])).rows[0];
  const bal = async (user: string) => Number((await one<{ balance: string }>("select balance from vc_wallets where user_id = $1", [user]))?.balance ?? 0);
  async function newUser(id: string, verified: boolean) {
    await db.query(`insert into "user" ("id", "name", "email", "emailVerified", "updatedAt") values ($1, 'x', $2, $3, now())`, [
      id,
      `${id}@exemplo.com`,
      verified,
    ]);
  }
  async function pay(user: string, session: string) {
    await db.query(
      "insert into vc_purchases (user_id, stripe_session_id, currency, amount_minor, usd_cents, coins, usd_rate, status) values ($1, $2, 'usd', 100, 100, 100, 1, 'paid')",
      [user, session],
    );
  }

  beforeAll(async () => {
    await newUser(R, true);
    await pay(R, "cs_roleta_1");
  });

  it("só concede giro a conta verificada que já pagou ou processou um vídeo", async () => {
    await newUser("roleta_sem_email", false);
    await pay("roleta_sem_email", "cs_roleta_2");
    expect(await grant("roleta_sem_email", "cuts", "cuts:5")).toBe("inelegivel");
    await newUser("roleta_sem_uso", true);
    expect(await grant("roleta_sem_uso", "inactive_7", "inactive_7:a")).toBe("inelegivel");
    expect(await spin("roleta_sem_uso", 20)).toBeUndefined();
  });

  it("o mesmo motivo não concede dois giros e a conta guarda no máximo 3", async () => {
    expect(await grant(R, "cuts", "cuts:5")).toBe("ok");
    expect(await grant(R, "cuts", "cuts:5")).toBe("ja_concedido");
    expect(await grant(R, "cuts", "cuts:10")).toBe("ok");
    expect(await grant(R, "inactive_7", "inactive_7:a")).toBe("ok");
    expect(await grant(R, "cuts", "cuts:15")).toBe("limite_guardados");
  });

  it("girar usa um giro e credita o prêmio como bônus", async () => {
    const before = await bal(R);
    const res = await spin(R, 30);
    expect(res.won_prize).toBe(30);
    expect(Number(res.new_balance)).toBe(before + 30);
    const last = await one<{ kind: string; amount: string }>("select kind, amount from vc_coin_ledger where user_id = $1 order by id desc limit 1", [R]);
    expect([last.kind, Number(last.amount)]).toEqual(["bonus", 30]);
  });

  it("o prêmio máximo só sai uma vez dentro da carência; depois paga o substituto", async () => {
    expect((await spin(R, 500)).won_prize).toBe(500);
    expect((await spin(R, 500)).won_prize).toBe(100);
  });

  it("sem giro disponível, nada é pago", async () => {
    const before = await bal(R);
    expect(await spin(R, 50)).toBeUndefined();
    expect(await bal(R)).toBe(before);
  });

  it("depois de 4 giros em 30 dias, só no mês seguinte", async () => {
    expect(await grant(R, "cuts", "cuts:15")).toBe("ok");
    expect(await grant(R, "cuts", "cuts:20")).toBe("limite_mensal");
    // o suporte pode conceder mesmo assim
    expect(await grant(R, "admin", "admin:1")).toBe("ok");
  });

  it("giro vencido não pode ser usado", async () => {
    await db.query("update vc_roulette_spins set expires_at = now() - interval '1 minute' where user_id = $1 and used_at is null", [R]);
    expect(await spin(R, 20)).toBeUndefined();
  });

  it("a rotina de inatividade acha quem parou há 7 e há 21 dias, e ninguém fora da janela", async () => {
    // [usuário, dias desde o último vídeo, e-mail verificado]
    const cases: [string, number, boolean][] = [
      ["parado_3", 3, true],
      ["parado_10", 10, true],
      ["parado_25", 25, true],
      ["parado_60", 60, true],
      ["parado_10_sem_email", 10, false],
    ];
    for (const [id, days, verified] of cases) {
      await newUser(id, verified);
      await db.query("insert into vc_sources (user_id, kind, title, created_at) values ($1, 'file', 'x', now() - make_interval(days => $2::int))", [id, days]);
    }
    const candidates = async () =>
      (await db.query<{ user_id: string; reason: string; grant_key: string }>(INACTIVE_CANDIDATES_SQL, [7, 21, 45, 200])).rows.filter((r) =>
        r.user_id.startsWith("parado_"),
      );
    const found = await candidates();
    expect(found.map((r) => [r.user_id, r.reason]).sort()).toEqual([
      ["parado_10", "inactive_7"],
      ["parado_25", "inactive_21"],
    ]);
    // depois de receber o giro daquela chave, a conta sai da lista
    const first = found.find((r) => r.user_id === "parado_10")!;
    await pay("parado_10", "cs_roleta_parado");
    expect(await grant("parado_10", first.reason, first.grant_key)).toBe("ok");
    expect((await candidates()).map((r) => r.user_id)).toEqual(["parado_25"]);
  });
});
