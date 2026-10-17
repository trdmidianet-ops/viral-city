import { existsSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildAss } from "@/lib/video/captions";
import { ffmpeg } from "./ffmpeg";
import { wordsInRange } from "./pick";
import type { Clip, Framing, Word } from "./repo";

/** Filtro que transforma o vídeo (qualquer proporção) em 1080x1920. */
export function framingFilter(framing: Framing): string {
  switch (framing) {
    case "center":
      return "[0:v]crop='min(iw,ih*9/16)':ih,scale=1080:1920,setsar=1[base]";
    case "split":
      // Metade esquerda em cima, metade direita embaixo (bom para podcast com 2 pessoas)
      return [
        "[0:v]split[l][r]",
        "[l]crop=iw/2:ih:0:0,scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960[top]",
        "[r]crop=iw/2:ih:iw/2:0,scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960[bot]",
        "[top][bot]vstack,setsar=1[base]",
      ].join(";");
    case "blur":
    default:
      return [
        "[0:v]split[a][b]",
        "[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:2,eq=brightness=-0.18[bg]",
        "[b]scale=1080:1920:force_original_aspect_ratio=decrease[fg]",
        "[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1[base]",
      ].join(";");
  }
}

/** Decodifica a logo (data URL PNG/JPEG) para um arquivo. */
async function writeLogo(dataUrl: string, dir: string): Promise<string | null> {
  const m = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  const name = `logo.${m[1] === "png" ? "png" : "jpg"}`;
  await writeFile(path.join(dir, name), Buffer.from(m[2], "base64"));
  return name;
}

async function prepareFont(dir: string): Promise<string> {
  const impact = "C:/Windows/Fonts/impact.ttf";
  if (existsSync(impact)) {
    await copyFile(impact, path.join(dir, "impact.ttf"));
    return "Impact";
  }
  return "Arial";
}

export type RenderClipInput = {
  clip: Pick<Clip, "id" | "start_seconds" | "end_seconds" | "hook">;
  sourcePath: string;
  words: Word[];
  framing: Framing;
  captions: boolean;
  logo: string | null;
};

/** Renderiza um corte vertical com enquadramento, texto no topo, logo e legendas. */
export async function renderClip(input: RenderClipInput, baseDir: string): Promise<string> {
  const dir = path.join(baseDir, input.clip.id);
  await mkdir(dir, { recursive: true });

  const start = Number(input.clip.start_seconds);
  const duration = Number(input.clip.end_seconds) - start;
  const font = await prepareFont(dir);
  const words = wordsInRange(input.words, start, start + duration);
  await writeFile(
    path.join(dir, "captions.ass"),
    buildAss(words, { hook: input.clip.hook, hookUntil: duration, font, captions: input.captions }),
    "utf8",
  );

  const logo = input.logo ? await writeLogo(input.logo, dir) : null;
  const filters = [framingFilter(input.framing), "[base]ass=captions.ass:fontsdir=.[sub]"];
  if (logo) {
    filters.push("[1:v]scale=150:150:force_original_aspect_ratio=decrease,format=rgba,colorchannelmixer=aa=0.92[lg]");
    filters.push("[sub][lg]overlay=40:60[out]");
  }

  await ffmpeg(
    [
      "-y",
      "-ss", start.toFixed(2),
      "-t", duration.toFixed(2),
      "-i", path.resolve(input.sourcePath),
      ...(logo ? ["-i", logo] : []),
      "-filter_complex", filters.join(";"),
      "-map", logo ? "[out]" : "[sub]",
      "-map", "0:a:0?",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p", "-r", "30",
      "-c:a", "aac", "-b:a", "160k",
      "-movflags", "+faststart",
      "final.mp4",
    ],
    dir,
  );
  return path.join(dir, "final.mp4");
}
