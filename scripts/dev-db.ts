/**
 * Postgres local para desenvolvimento, sem instalar nada (PGlite, dados em .data/pglite).
 * Rode com: npm run db:local — e use no .env.local:
 *   DATABASE_URL=postgresql://postgres@127.0.0.1:5433/postgres?sslmode=disable
 * Depois aplique as migrações com npm run db:migrate. Em produção, use o Neon.
 */
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const PORT = Number(process.env.DEV_DB_PORT ?? 5433);

async function main() {
  const db = await PGlite.create(path.join(process.cwd(), ".data", "pglite"));
  const server = new PGLiteSocketServer({ db, port: PORT, host: "127.0.0.1", maxConnections: 20 });
  await server.start();
  console.log(`🐘 Postgres local em postgresql://postgres@127.0.0.1:${PORT}/postgres (Ctrl+C para parar)`);
  const stop = async () => {
    await server.stop();
    await db.close();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
