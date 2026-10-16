/**
 * Worker da Viral City — roda no seu PC: `npm run worker`.
 * 1) Gera os vídeos da fila (narração + fundo + legendas) com FFmpeg.
 * 2) Nos horários da Agenda, posta o próximo vídeo pronto de cada conta no YouTube.
 * Deixe a janela aberta; ele verifica tudo a cada 30 segundos.
 */
import path from "node:path";
import { getAccount } from "@/lib/accounts/store";
import { isDbConfigured } from "@/lib/db";
import { isSlotDue } from "@/lib/schedule/due";
import { listSlots, markSlotRun } from "@/lib/schedule/repo";
import { renderVideo } from "@/lib/video/render";
import {
  claimForPublishing,
  claimNextQueued,
  markFailed,
  markPublished,
  markReady,
  nextReadyFor,
  recoverStuck,
} from "@/lib/videos/repo";
import { uploadShort } from "@/lib/youtube/upload";

const TICK_MS = 30_000;
const VIDEOS_DIR = path.join(process.cwd(), ".data", "videos");

const log = (...args: unknown[]) =>
  console.log(new Date().toLocaleTimeString("pt-BR"), "·", ...args);
const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

async function renderQueue() {
  for (;;) {
    const video = await claimNextQueued();
    if (!video) return;
    log(`🎬 Gerando "${video.title}"…`);
    try {
      const out = await renderVideo({ id: video.id, script: video.script, title: video.title, voice: video.voice }, VIDEOS_DIR);
      await markReady(video.id, out.path, out.duration);
      log(`✅ Pronto (${Math.round(out.duration)}s): ${out.path}`);
    } catch (err) {
      await markFailed(video.id, message(err));
      log(`❌ Falhou: ${message(err)}`);
    }
  }
}

async function publishDue() {
  const now = new Date();
  for (const slot of await listSlots()) {
    if (!isSlotDue(slot, now)) continue;
    // Marca antes de postar: se algo falhar, não tenta duas vezes no mesmo horário
    await markSlotRun(slot, now);

    const account = await getAccount(slot.account_id);
    if (!account) continue;
    if (account.platform !== "youtube") {
      log(`⏭️  ${account.name}: postagem em ${account.platform} ainda não disponível.`);
      continue;
    }
    const next = await nextReadyFor(account.id);
    if (!next?.local_path) {
      log(`⏰ Horário de ${account.name}, mas não há vídeo pronto na fila.`);
      continue;
    }
    const video = await claimForPublishing(next.id, account.id);
    if (!video) continue;

    log(`📤 Postando "${video.title}" em ${account.name}…`);
    try {
      const id = await uploadShort({
        accountId: account.id,
        filePath: video.local_path!,
        title: video.title,
        description: video.description,
      });
      await markPublished(video.id, id);
      log(`🚀 Publicado: https://youtube.com/shorts/${id}`);
    } catch (err) {
      await markFailed(video.id, message(err));
      log(`❌ Postagem falhou: ${message(err)}`);
    }
  }
}

let busy = false;
async function tick() {
  if (busy) return;
  busy = true;
  try {
    await renderQueue();
    await publishDue();
  } catch (err) {
    log(`⚠️  ${message(err)}`);
  } finally {
    busy = false;
  }
}

async function main() {
  if (!isDbConfigured()) {
    console.error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local antes de rodar o worker.");
    process.exit(1);
  }
  log("🌴 Worker da Viral City ligado. Ctrl+C para parar.");
  await recoverStuck();
  await tick();
  setInterval(tick, TICK_MS);
}

main();
