/**
 * worker/server.ts
 * Servidor HTTP do worker — recebe webhooks do Vercel e faz polling de fallback.
 */

// Railway US East não roteia IPv6 → força todas as resoluções DNS a preferir IPv4.
// Deve vir antes de qualquer import que abra sockets (pg, fetch, etc.).
import { setDefaultResultOrder } from "node:dns";
setDefaultResultOrder("ipv4first");

import express from "express";
import { enqueue, pollQueued } from "./process.js";

const PORT = Number(process.env.PORT ?? 3001);
const WORKER_SECRET = process.env.WORKER_SECRET ?? "";

if (!WORKER_SECRET) {
  console.warn("[worker] WORKER_SECRET não definido — endpoint /process desprotegido!");
}

const app = express();
app.use(express.json());

// Health check (Railway usa isso para saber se o serviço está de pé)
app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

/**
 * POST /process
 * Body: { sourceId: string }
 * Header: x-worker-secret: <WORKER_SECRET>
 *
 * Vercel chama isso logo após criar uma source.
 */
app.post("/process", (req, res) => {
  const secret = req.headers["x-worker-secret"];
  if (WORKER_SECRET && secret !== WORKER_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { sourceId } = req.body as { sourceId?: string };
  if (!sourceId || !/^[0-9a-f-]{36}$/i.test(sourceId)) {
    res.status(400).json({ error: "sourceId inválido" });
    return;
  }

  enqueue(sourceId);
  res.json({ ok: true, queued: sourceId });
});

app.listen(PORT, () => {
  console.log(`[worker] ouvindo na porta ${PORT}`);

  // Polling de fallback: retoma sources que ficaram 'queued' sem webhook
  setInterval(pollQueued, 30_000);
  // Roda uma vez já no boot para pegar sources que ficaram perdidas
  pollQueued().catch(console.error);
});
