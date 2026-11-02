/**
 * Worker da Viral City — roda no seu PC: `npm run worker`.
 * 1) Cortes: baixa o vídeo longo, cobra os CityCoins, transcreve (Whisper), a IA escolhe 5 cortes
 *    e o FFmpeg renderiza. Se der erro depois da cobrança, os CityCoins voltam para a carteira.
 * 2) Agenda: nos horários marcados, posta o próximo vídeo aprovado de cada conta no YouTube.
 * Deixe a janela aberta; ele verifica tudo a cada 20 segundos.
 */
import path from "node:path";
import { getAccount, getAccountLogo } from "@/lib/accounts/store";
import { acquireSource } from "@/lib/clips/acquire";
import { askClaude } from "@/lib/clips/ai";
import { mediaDuration } from "@/lib/clips/ffmpeg";
import { buildPrompt, fallbackClips, parseClips, toSegments } from "@/lib/clips/pick";
import { costForDuration, formatCoins } from "@/lib/coins/pricing";
import { chargeSource, refundSource } from "@/lib/coins/wallet";
import { renderClip } from "@/lib/clips/render";
import {
  claimNextClip,
  claimNextSource,
  getSource,
  recoverStuckClips,
  replaceClips,
  updateClip,
  updateSource,
  type Source,
} from "@/lib/clips/repo";
import { transcribe } from "@/lib/clips/transcribe";
import { isDbConfigured } from "@/lib/db";
import { isSlotDue } from "@/lib/schedule/due";
import { listSlots, markSlotRun } from "@/lib/schedule/repo";
import { niches } from "@/lib/youtube/niches";
import { fetchTrending } from "@/lib/youtube/trending";
import { claimForPublishing, markFailed, markPublished, nextReadyFor, recoverStuck } from "@/lib/videos/repo";
import { uploadShort } from "@/lib/youtube/upload";

const TICK_MS = 20_000;
const DATA = path.join(process.cwd(), ".data");
const SOURCES_DIR = path.join(DATA, "sources");
const CLIPS_DIR = path.join(DATA, "clips");

const log = (...args: unknown[]) => console.log(new Date().toLocaleTimeString("pt-BR"), "·", ...args);
const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

async function trendingTitles(source: Source): Promise<string[]> {
  const niche = niches.find((n) => n.id === source.niche);
  if (!niche || !process.env.YOUTUBE_API_KEY) return [];
  const res = await fetchTrending({ niche, region: "BR", format: "shorts", period: "7d", sort: "views" }).catch(() => null);
  return res?.ok ? res.videos.slice(0, 10).map((v) => v.title) : [];
}

async function processSource(source: Source) {
  const step = (status: Source["status"], progress: string) => updateSource(source.id, { status, progress });
  log(`📥 Preparando "${source.title || source.upload_name || source.source_url}"…`);

  await step("downloading", "Baixando o vídeo…");
  const file = await acquireSource(source, SOURCES_DIR);
  const duration = await mediaDuration(file);
  if (!duration) throw new Error("Não consegui ler a duração do vídeo.");
  await updateSource(source.id, { local_path: file, duration_seconds: duration });

  const cost = costForDuration(duration);
  const charge = await chargeSource(source.id, cost, `Cortes de "${(source.title || source.upload_name || "vídeo").slice(0, 80)}" (${Math.ceil(duration / 60)} min)`);
  if (!charge.ok) {
    throw new Error(`Saldo insuficiente: este vídeo custa ${formatCoins(cost)} CityCoins. Recarregue na Carteira e tente de novo.`);
  }
  if (charge.balance !== null) log(`🪙 ${formatCoins(cost)} CityCoins cobrados (saldo: ${formatCoins(charge.balance)}).`);

  await step("transcribing", "Transcrevendo a fala (Whisper)…");
  const words = await transcribe(file, source.language);
  if (words.length < 20) throw new Error("O vídeo tem pouca fala para escolher cortes.");
  await updateSource(source.id, { transcript: words });

  await step("analyzing", "A IA está escolhendo os melhores momentos…");
  const segments = toSegments(words);
  let clips;
  let aiUsed = true;
  try {
    const prompt = buildPrompt({
      title: source.title,
      duration,
      language: source.language,
      segments,
      niche: niches.find((n) => n.id === source.niche)?.label,
      referenceTitle: source.reference_title,
      trendingTitles: await trendingTitles(source),
    });
    clips = parseClips(await askClaude(prompt, path.join(SOURCES_DIR, source.id)), duration);
    if (clips.length < 3) throw new Error("a IA devolveu poucos cortes válidos");
  } catch (err) {
    log(`🤖 IA indisponível (${message(err)}). Usando a escolha automática.`);
    clips = fallbackClips(segments, duration);
    aiUsed = false;
  }
  if (!clips.length) throw new Error("Não encontrei trechos bons para cortar.");

  await replaceClips(source.id, clips);
  await updateSource(source.id, { status: "rendering", progress: `Renderizando ${clips.length} cortes…`, ai_used: aiUsed });
  log(`✂️  ${clips.length} cortes escolhidos ${aiUsed ? "pela IA" : "automaticamente"}.`);
}

async function sourcesQueue() {
  for (;;) {
    const source = await claimNextSource();
    if (!source) return;
    try {
      await processSource(source);
    } catch (err) {
      await updateSource(source.id, { status: "failed", error: message(err).slice(0, 1000), progress: null });
      log(`❌ Fonte falhou: ${message(err)}`);
      const refunded = await refundSource(source.id, `Estorno: os cortes de "${(source.title || "vídeo").slice(0, 80)}" falharam`).catch(() => null);
      if (refunded !== null) log(`↩️  CityCoins devolvidos (saldo: ${formatCoins(refunded)}).`);
    }
  }
}

async function clipsQueue() {
  for (;;) {
    const clip = await claimNextClip();
    if (!clip) return;
    const source = await getSource(clip.source_id, true);
    try {
      if (!source?.local_path || !source.transcript) throw new Error("Vídeo original não está mais no PC.");
      const account = source.account_id ? await getAccount(source.account_id) : null;
      const logo = source.use_logo && account ? await getAccountLogo(account.id) : null;
      const file = await renderClip(
        { clip, sourcePath: source.local_path, words: source.transcript, framing: source.framing, captions: source.captions, logo },
        CLIPS_DIR,
      );
      await updateClip(clip.id, { status: "rendered", local_path: file });
      log(`🎬 Corte ${clip.position} pronto (nota ${clip.score}).`);
    } catch (err) {
      await updateClip(clip.id, { status: "failed", error: message(err).slice(0, 1000) });
      log(`❌ Corte falhou: ${message(err)}`);
    }
    if (source && source.status === "rendering") {
      await updateSource(source.id, { status: "ready", progress: null });
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
    if (!account || account.platform !== "youtube") continue;
    if (!account.userId) continue;
    const next = await nextReadyFor(account.id, account.userId);
    if (!next?.local_path) {
      log(`⏰ Horário de ${account.name}, mas não há corte aprovado na fila.`);
      continue;
    }
    const video = await claimForPublishing(next.id, account.id);
    if (!video) continue;

    log(`📤 Postando "${video.title}" em ${account.name}…`);
    try {
      const id = await uploadShort({ accountId: account.id, filePath: video.local_path!, title: video.title, description: video.description });
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
    await publishDue(); // primeiro a agenda, para não atrasar posts por causa de renderização
    await sourcesQueue();
    await clipsQueue();
  } catch (err) {
    log(`⚠️  ${message(err)}`);
  } finally {
    busy = false;
  }
}

async function main() {
  if (!isDbConfigured()) {
    console.error("Configure DATABASE_URL no .env.local antes de rodar o worker.");
    process.exit(1);
  }
  log("🌴 Worker da Viral City ligado. Ctrl+C para parar.");
  await recoverStuck();
  await recoverStuckClips();
  await tick();
  setInterval(tick, TICK_MS);
}

main();
