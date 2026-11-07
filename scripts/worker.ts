/**
 * Worker da Viral City — roda no seu PC: `npm run worker`.
 * 1) Cortes: baixa o vídeo longo, cobra os CityCoins, transcreve (Whisper), a IA escolhe 5 cortes
 *    e o FFmpeg renderiza. Se der erro depois da cobrança, os CityCoins voltam para a carteira.
 * 2) Scale: um vídeo base vira várias versões (templates + manchetes); cobra por versão e
 *    devolve as que falharem.
 * 3) Agenda: nos horários marcados, posta o próximo vídeo aprovado de cada conta no YouTube.
 * Deixe a janela aberta; ele verifica tudo a cada 20 segundos.
 */
import path from "node:path";
import { getAccount, getAccountLogo } from "@/lib/accounts/store";
import { acquireSource } from "@/lib/clips/acquire";
import { askClaude } from "@/lib/clips/ai";
import { mediaDuration } from "@/lib/clips/ffmpeg";
import { buildPrompt, fallbackClips, parseClips, toSegments } from "@/lib/clips/pick";
import { COINS_PER_VARIATION, costForDuration, costForVariations, formatCoins } from "@/lib/coins/pricing";
import { chargeSource, refundSource } from "@/lib/coins/wallet";
import { renderClip } from "@/lib/clips/render";
import {
  claimNextClip,
  claimNextSource,
  getClip,
  getSource,
  recoverStuckClips,
  replaceClips,
  updateClip,
  updateSource,
  type Source,
} from "@/lib/clips/repo";
import { transcribe } from "@/lib/clips/transcribe";
import { buildHeadlinePrompt, fallbackHeadlines, parseHeadlines } from "@/lib/scale/headlines";
import { renderVariation } from "@/lib/scale/render";
import {
  chargeScaleJob,
  claimNextScaleJob,
  claimNextVariation,
  finishScaleJobIfDone,
  getScaleJob,
  insertVariations,
  recoverStuckScale,
  refundScaleJob,
  updateScaleJob,
  updateVariation,
  type ScaleJob,
} from "@/lib/scale/repo";
import { planVariations } from "@/lib/scale/templates";
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
const SCALE_DIR = path.join(DATA, "scale");

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

// ---------- Scale ----------

/** Arquivo do vídeo base: o corte renderizado ou o clipe enviado. */
async function scaleBasePath(job: ScaleJob): Promise<string> {
  if (job.base_kind === "file") {
    if (!job.base_path) throw new Error("O clipe enviado não está mais no PC.");
    return job.base_path;
  }
  const clip = job.clip_id ? await getClip(job.clip_id) : null;
  if (!clip?.local_path) throw new Error("O corte base não está mais no PC (renderize ele de novo em Cortes).");
  return clip.local_path;
}

async function processScaleJob(job: ScaleJob) {
  const label = (job.topic || job.base_name || "vídeo").slice(0, 80);
  log(`🧬 Scale: ${job.count} versões de "${label}"…`);
  await scaleBasePath(job); // confere antes de cobrar

  const cost = costForVariations(job.count);
  const charge = await chargeScaleJob(job.id, cost, `Scale: ${job.count} versões de "${label}"`);
  if (!charge.ok) throw new Error(`Saldo insuficiente: ${job.count} versões custam ${formatCoins(cost)} CityCoins. Recarregue na Carteira.`);
  if (charge.balance !== null) log(`🪙 ${formatCoins(cost)} CityCoins cobrados (saldo: ${formatCoins(charge.balance)}).`);

  let headlines = job.headlines;
  let aiUsed: boolean | null = null;
  if (job.use_ai && headlines.length < job.count) {
    await updateScaleJob(job.id, { progress: "A IA está escrevendo as manchetes…" });
    try {
      const prompt = buildHeadlinePrompt({ topic: job.topic, count: job.count - headlines.length, examples: headlines });
      const fromAi = parseHeadlines(await askClaude(prompt, process.cwd()));
      if (!fromAi.length) throw new Error("resposta sem manchetes");
      headlines = [...headlines, ...fromAi];
      aiUsed = true;
    } catch (err) {
      log(`🤖 IA indisponível (${message(err)}). Usando fórmulas de gancho.`);
      headlines = [...headlines, ...fallbackHeadlines(job.topic, job.count)];
      aiUsed = false;
    }
  }

  await insertVariations(job.id, planVariations(job.templates, headlines, job.count));
  await updateScaleJob(job.id, { status: "rendering", progress: `Renderizando ${job.count} versões…`, ai_used: aiUsed, headlines });
}

async function scaleJobsQueue() {
  for (;;) {
    const job = await claimNextScaleJob();
    if (!job) return;
    try {
      await processScaleJob(job);
    } catch (err) {
      await updateScaleJob(job.id, { status: "failed", error: message(err).slice(0, 1000), progress: null });
      log(`❌ Scale falhou: ${message(err)}`);
      const refunded = await refundScaleJob(job.id, null, "Estorno: o Scale falhou").catch(() => null);
      if (refunded !== null) log(`↩️  CityCoins devolvidos (saldo: ${formatCoins(refunded)}).`);
    }
  }
}

async function variationsQueue() {
  for (;;) {
    const v = await claimNextVariation();
    if (!v) return;
    const job = await getScaleJob(v.job_id);
    try {
      if (!job) throw new Error("Job não encontrado.");
      const { file, duration } = await renderVariation(
        { id: v.id, basePath: await scaleBasePath(job), template: v.template, headline: v.headline, handle: job.handle, params: v.params },
        SCALE_DIR,
      );
      await updateVariation(v.id, { status: "rendered", local_path: file, duration_seconds: duration });
      log(`🎞️  Versão ${v.position} pronta (${v.template}).`);
    } catch (err) {
      await updateVariation(v.id, { status: "failed", error: message(err).slice(0, 1000) });
      log(`❌ Versão falhou: ${message(err)}`);
    }
    if (!job) continue;
    const finished = await finishScaleJobIfDone(job.id);
    if (finished?.failed) {
      const back = await refundScaleJob(job.id, finished.failed * COINS_PER_VARIATION, `Estorno: ${finished.failed} versões do Scale falharam`).catch(() => null);
      if (back !== null) log(`↩️  ${finished.failed * COINS_PER_VARIATION} CityCoins devolvidos (saldo: ${formatCoins(back)}).`);
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
    await scaleJobsQueue();
    await variationsQueue();
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
  await recoverStuckScale();
  await tick();
  setInterval(tick, TICK_MS);
}

main();
