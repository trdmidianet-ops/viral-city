/**
 * Aplica as migrações de db/migrations no banco de DATABASE_URL, em ordem, uma única vez
 * cada (guarda as aplicadas na tabela _migrations). Rode com: npm run db:migrate
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Configure DATABASE_URL no .env.local antes de migrar.");
    process.exit(1);
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())");
    const done = new Set((await client.query<{ name: string }>("select name from _migrations")).rows.map((r) => r.name));
    const dir = path.join(process.cwd(), "db", "migrations");
    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
    let applied = 0;
    for (const file of files) {
      if (done.has(file)) continue;
      const sql = await readFile(path.join(dir, file), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into _migrations (name) values ($1)", [file]);
        await client.query("commit");
        console.log(`✔ ${file}`);
        applied++;
      } catch (err) {
        await client.query("rollback");
        throw new Error(`Falhou em ${file}: ${(err as Error).message}`);
      }
    }
    console.log(applied ? `${applied} migração(ões) aplicada(s).` : "Banco já está atualizado.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
