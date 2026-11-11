/**
 * worker/process.ts
 * Pipeline principal: queued → downloading → transcribing → analyzing → rendering → ready
 */

import { rm, mkdir } from "node:fs/promises";
import path from "node:path";
import { acquireSource } from "@/lib/clips/acquire";
import { transcribe } from "@/lib/clips/transcribe";
import { buildPrompt, parseClips, fallbackClips, toSegments } from "@/lib/clips/pick";
import { renderClip } from "@/lib/clips/render";
import {
  claimNextSource,
  claimNextClip,
  replaceClips,
  listClips,
  updateSource,
  updateClip,
  recoverStuckClips,
  type Source,
} from "@/lib/clips/repo";
import { mediaDuration } from "@/lib/clips/ffmpeg";
import { getAccount } from "@/lib/accounts/store";
import { chargeSource, refundSource } from "@/lib/coins/wallet";
import { costForDuration } from "@/lib/coins/pricing";

const DATA_DIR = process.env.WORKER_DATA_DIR ?? path.join(process.cwd(), ".data");
const MAX_CONCURRENT = Number(process.env.WORKER_MAX_CONCURRENT ?? "3");
const CHARGE_COINS = !!process.env.VERCEL; // só cobra em produção

// ----- job queue in-memory -----
const running = new Set<string>();

export function enqueue(sourceId: string) {
  if (running.has(sourceId)) return;
  if (running.size < MAX_CONCURRENT) {
    running.add(sourceId);
    runPipeline(sourceId)
      .catch((err) => console.error(`[worker] source ${sourceId} crashed:`, err))
      .finally(() => {
        running.delete(sourceId);
        // depois de terminar, pega o próximo da fila
        pollQueued().catch(() => {});
      });
  }
}

// ----- polling (fallback + boot) -----
export async function pollQueued() {
  while (running.size < MAX_CONCURRENT) {
    await recoverStuckClips(10); // devolve cortes/sources travados há >10min
    const source = await claimNextSource(); // atômico: dois workers nunca pegam o mesmo
    if (!source) break; // fila vazia
    running.add(source.id);
    runPipeline(source.id)
      .catch((err) => console.error(`[worker] source ${source.id} crashed:`, err))
      .finally(() => {
        running.delete(source.id);
        pollQueued().catch(() => {});
      });
  }
}

// ----- chamada à API Gemini Flash 2.0 -----
async function callGeminiApi(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada no worker.");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1024, temperature: 0.2 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini API ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error("Resposta vazia da Gemini API.");
  return text;
}

// ----- pipeline principal -----
async function runPipeline(sourceId: string) {
  const { getSource } = await import("@/lib/clips/repo");
  const source = await getSource(sourceId, false);
  if (!source) return console.warn(`[worker] source ${sourceId} not found`);

  const workDir = path.join(DATA_DIR, "jobs", sourceId);
  await mkdir(workDir, { recursive: true });

  try {
    // 1. Download
    await setStatus(sourceId, "downloading", "Baixando vídeo…");
    const videoPath = await acquireSource(source, path.join(DATA_DIR, "downloads"));

    // 2. Duração real
    const durationSeconds = await mediaDuration(videoPath);
    await updateSource(sourceId, { duration_seconds: durationSeconds });

    // 3. Cobrar coins (baseado na duração real)
    if (CHARGE_COINS) {
      const cost = costForDuration(durationSeconds);
      const result = await chargeSource(sourceId, cost, "Geração de cortes");
      if (!result.ok) throw new Error(`Saldo insuficiente para ${cost} coins.`);
      await updateSource(sourceId, { charged_coins: cost });
    }

    // 4. Transcrição com Whisper local
    await setStatus(sourceId, "transcribing", "Transcrevendo áudio…");
    const words = await transcribe(videoPath, source.language);
    await updateSource(sourceId, { transcript: words });

    // 5. Escolher clipes com IA (Gemini Flash 2.0) ou fallback
    await setStatus(sourceId, "analyzing", "Analisando com IA…");
    const account = source.account_id ? await getAccount(source.account_id) : null;
    const segments = toSegments(words);

    let proposals;
    let aiUsed = false;
    try {
      const prompt = buildPrompt({
        title: source.title,
        duration: durationSeconds,
        language: source.language,
        segments,
        niche: source.niche,
        referenceTitle: source.reference_title,
      });
      const raw = await callGeminiApi(prompt);
      proposals = parseClips(raw, durationSeconds);
      aiUsed = true;
    } catch (aiErr) {
      console.warn(`[worker] IA falhou, usando fallback: ${aiErr}`);
      proposals = fallbackClips(segments, durationSeconds);
    }

    if (!proposals.length) throw new Error("Nenhum trecho adequado encontrado no vídeo.");

    // 6. Salva clipes no banco
    await replaceClips(sourceId, proposals);
    await updateSource(sourceId, {
      ai_used: aiUsed,
      status: "rendering",
      progress: `0 de ${proposals.length} corte${proposals.length !== 1 ? "s" : ""} prontos`,
    });

    // 7. Renderizar cada clipe (atômico: claimNextClip evita duplicatas)
    const freshSource = await (await import("@/lib/clips/repo")).getSource(sourceId, true);
    if (!freshSource) throw new Error("Source sumiu do banco.");
    const allClips = await listClips(sourceId);
    const total = allClips.length;
    let done = 0;

    for (const clip of allClips) {
      await updateClip(clip.id, { status: "rendering" });
      try {
        const clipsBaseDir = path.join(DATA_DIR, "clips", sourceId);
        await mkdir(clipsBaseDir, { recursive: true });

        const renderedPath = await renderClip({
          clip,
          sourcePath: videoPath,
          words: freshSource.transcript ?? [],
          framing: clip.framing ?? freshSource.framing,
          captions: clip.captions ?? freshSource.captions,
          logo: null,
          highlight: clip.caption_color,
          hookPosition: clip.hook_position,
          speed: clip.speed,
        }, clipsBaseDir);

        done++;
        await updateClip(clip.id, { status: "rendered", local_path: renderedPath });
        await updateSource(sourceId, {
          progress: `${done} de ${total} corte${done !== 1 ? "s" : ""} prontos`,
        });
      } catch (clipErr) {
        console.error(`[worker] clip ${clip.id} failed:`, clipErr);
        await updateClip(clip.id, {
          status: "failed",
          error: String(clipErr instanceof Error ? clipErr.message : clipErr).slice(0, 400),
        });
      }
    }

    await updateSource(sourceId, { status: "ready", progress: null });
    console.log(`[worker] ✓ source ${sourceId} — ${done}/${total} clips renderizados`);
  } catch (err) {
    const msg = String(err instanceof Error ? err.message : err).slice(0, 500);
    console.error(`[worker] ✗ source ${sourceId}:`, msg);
    if (CHARGE_COINS) await refundSource(sourceId, "Falha no processamento").catch(() => {});
    await updateSource(sourceId, { status: "failed", error: msg, progress: null }).catch(() => {});
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function setStatus(id: string, status: Source["status"], progress: string) {
  await updateSource(id, { status, progress });
}
