/**
 * worker/server.ts
 * Servidor HTTP do worker — recebe webhooks do Vercel e faz polling de fallback.
 */

// Railway US East não roteia IPv6 → força todas as resoluções DNS a preferir IPv4.
// Deve vir antes de qualquer import que abra sockets (pg, fetch, etc.).
import { setDefaultResultOrder } from "node:dns";
setDefaultResultOrder("ipv4first");

import express from "express";
import { sendSpinEmail } from "@/lib/roulette/email";
import { grantInactivitySpins } from "@/lib/roulette/grants";
import { runDueReminders } from "@/lib/schedule/reminders";

/** Agenda: a cada minuto, manda o lembrete de quem chegou no horário marcado. Nunca derruba o worker. */
let remindersBusy = false;
async function agendaReminders() {
  if (remindersBusy) return;
  remindersBusy = true;
  try {
    const sent = await runDueReminders();
    if (sent) console.log(`[agenda] ${sent} lembrete(s) de postagem enviado(s)`);
  } catch (err) {
    console.warn("[agenda] rotina de lembretes falhou:", err instanceof Error ? err.message : err);
  } finally {
    remindersBusy = false;
  }
}
import { serveFile } from "./files.js";
import { enqueue, pollQueued } from "./process.js";

/** Roleta: de hora em hora, concede o giro de inatividade a quem está parado. Nunca derruba o worker. */
async function rouletteInactivity() {
  try {
    const granted = await grantInactivitySpins();
    if (!granted.length) return;
    let sent = 0;
    for (const g of granted) {
      // o giro já está concedido: uma falha de e-mail não desfaz nada
      if (await sendSpinEmail(g.email, g.name).catch(() => false)) sent++;
    }
    console.log(`[roleta] ${granted.length} giro(s) de inatividade concedido(s), ${sent} e-mail(s) enviado(s)`);
  } catch (err) {
    console.warn("[roleta] rotina de inatividade falhou:", err instanceof Error ? err.message : err);
  }
}

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
 * GET /files/:kind/:id?exp=&sig=[&dl=1]
 * Vídeo pronto (corte, versão do Scale ou vídeo longo) por link assinado pelo site.
 */
app.get("/files/:kind/:id", (req, res) => {
  serveFile(req, res).catch((err) => {
    console.error("[files]", err);
    if (!res.headersSent) res.status(500).send("Erro ao entregar o vídeo.");
  });
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

  setInterval(agendaReminders, 60_000);
  setInterval(rouletteInactivity, 60 * 60 * 1000);
  setTimeout(rouletteInactivity, 60_000);
});
