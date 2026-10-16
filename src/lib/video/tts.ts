import { readFile } from "node:fs/promises";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { estimateTimings, type TimedWord } from "./captions";

type Boundary = { text: string; start: number; end: number };

const TICKS_PER_SECOND = 10_000_000;

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase();

/**
 * Casa as palavras do roteiro (com pontuação) com as marcações de tempo da voz (sem pontuação).
 * Se muitas palavras não casarem, usa a estimativa proporcional.
 */
export function alignWords(script: string, boundaries: Boundary[], totalSeconds: number): TimedWord[] {
  const tokens = script.split(/\s+/).filter(Boolean);
  const out: TimedWord[] = [];
  let b = 0;
  let misses = 0;
  for (const token of tokens) {
    const key = norm(token);
    let found = -1;
    for (let k = b; k < Math.min(b + 4, boundaries.length); k++) {
      const bk = norm(boundaries[k].text);
      if (bk && (bk === key || key.startsWith(bk) || bk.startsWith(key))) {
        found = k;
        break;
      }
    }
    if (found === -1) {
      misses++;
      const prev = out.at(-1);
      const start = prev ? prev.end : 0;
      out.push({ text: token, start, end: start + 0.25 });
      continue;
    }
    out.push({ text: token, start: boundaries[found].start, end: boundaries[found].end });
    b = found + 1;
  }
  if (!tokens.length || misses / tokens.length > 0.3) return estimateTimings(script, totalSeconds);
  return out;
}

/** Gera a narração em MP3 com a voz neural gratuita do Edge e devolve as palavras com tempo. */
export async function synthesize(text: string, voice: string, outDir: string) {
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, { wordBoundaryEnabled: true });
    const { audioFilePath, metadataFilePath } = await tts.toFile(outDir, text.replace(/\s+/g, " ").trim());
    let boundaries: Boundary[] = [];
    if (metadataFilePath) {
      const meta = JSON.parse(await readFile(metadataFilePath, "utf8")) as {
        Metadata?: { Type: string; Data: { Offset: number; Duration: number; text: { Text: string } } }[];
      };
      boundaries = (meta.Metadata ?? [])
        .filter((m) => m.Type === "WordBoundary")
        .map((m) => ({
          text: m.Data.text.Text,
          start: m.Data.Offset / TICKS_PER_SECOND,
          end: (m.Data.Offset + m.Data.Duration) / TICKS_PER_SECOND,
        }));
    }
    return { audioPath: audioFilePath, boundaries };
  } finally {
    tts.close();
  }
}
