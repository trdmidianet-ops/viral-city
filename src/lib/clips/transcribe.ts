import { pipeline } from "@huggingface/transformers";
import { audioPcm16k } from "./ffmpeg";
import type { Language, Word } from "./repo";

/**
 * Transcrição com Whisper local (transformers.js).
 * Em produção o modelo já está pré-baixado no layer do Docker.
 * Devolve cada palavra com início e fim em segundos.
 */
type Asr = (audio: Float32Array, opts: Record<string, unknown>) => Promise<{ chunks?: { text: string; timestamp: [number, number | null] }[] }>;

let asr: Asr | null = null;

/** Rejeita a promise depois de `ms` milissegundos para evitar travamento infinito. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout na transcrição: ${label} demorou mais de ${ms / 60_000} min`)), ms),
    ),
  ]);
}

const MODEL_LOAD_TIMEOUT_MS = 3 * 60_000;  // 3 min para carregar modelo (pré-baixado → deve ser rápido)
const TRANSCRIBE_TIMEOUT_MS = 10 * 60_000; // 10 min para transcrever (vídeos muito longos podem demorar)

export async function transcribe(file: string, language: Language): Promise<Word[]> {
  const audio = await audioPcm16k(file);
  if (!audio.length) throw new Error("O vídeo não tem áudio.");

  if (!asr) {
    asr = (await withTimeout(
      pipeline("automatic-speech-recognition", "onnx-community/whisper-base_timestamped", { dtype: "q8" }),
      MODEL_LOAD_TIMEOUT_MS,
      "carregamento do modelo",
    )) as unknown as Asr;
  }

  const out = await withTimeout(
    asr(audio, {
      language,
      task: "transcribe",
      return_timestamps: "word",
      chunk_length_s: 30,
      stride_length_s: 5,
    }),
    TRANSCRIBE_TIMEOUT_MS,
    "transcrição do áudio",
  );

  return (out.chunks ?? [])
    .map((c) => ({
      text: c.text.trim(),
      start: Number(c.timestamp[0] ?? 0),
      end: Number(c.timestamp[1] ?? c.timestamp[0] ?? 0),
    }))
    .filter((w) => w.text);
}
