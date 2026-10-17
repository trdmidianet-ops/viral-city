import { pipeline } from "@huggingface/transformers";
import { audioPcm16k } from "./ffmpeg";
import type { Language, Word } from "./repo";

/**
 * Transcrição grátis no PC com Whisper (transformers.js). Na primeira vez baixa o modelo (~80 MB).
 * Devolve cada palavra com início e fim em segundos.
 */
type Asr = (audio: Float32Array, opts: Record<string, unknown>) => Promise<{ chunks?: { text: string; timestamp: [number, number | null] }[] }>;

let asr: Asr | null = null;

export async function transcribe(file: string, language: Language): Promise<Word[]> {
  const audio = await audioPcm16k(file);
  if (!audio.length) throw new Error("O vídeo não tem áudio.");
  asr ??= (await pipeline("automatic-speech-recognition", "onnx-community/whisper-base_timestamped", { dtype: "q8" })) as unknown as Asr;
  const out = await asr(audio, {
    language,
    task: "transcribe",
    return_timestamps: "word",
    chunk_length_s: 30,
    stride_length_s: 5,
  });
  return (out.chunks ?? [])
    .map((c) => ({
      text: c.text.trim(),
      start: Number(c.timestamp[0] ?? 0),
      end: Number(c.timestamp[1] ?? c.timestamp[0] ?? 0),
    }))
    .filter((w) => w.text);
}
