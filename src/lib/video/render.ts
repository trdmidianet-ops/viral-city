import { spawn } from "node:child_process";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import { buildAss } from "./captions";
import { alignWords, synthesize } from "./tts";

/** Roda o FFmpeg na pasta do job (caminhos relativos evitam problemas de escape no Windows). */
function ffmpeg(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error("FFmpeg não encontrado (ffmpeg-static)."));
    const proc = spawn(ffmpegPath, ["-hide_banner", ...args], { cwd });
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d));
    proc.on("error", reject);
    proc.on("close", (code) =>
      code === 0 ? resolve(stderr) : reject(new Error(`FFmpeg falhou (${code}): ${stderr.slice(-600)}`)),
    );
  });
}

export async function mediaDuration(file: string, cwd: string): Promise<number> {
  const out = await ffmpeg(["-i", file, "-f", "null", "-"], cwd);
  const m = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(out);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
}

/** Fonte grossa estilo Shorts: usa a Impact do Windows se existir, senão a padrão do sistema. */
async function prepareFont(dir: string): Promise<string> {
  const impact = "C:/Windows/Fonts/impact.ttf";
  if (existsSync(impact)) {
    await copyFile(impact, path.join(dir, "impact.ttf"));
    return "Impact";
  }
  return "Arial";
}

export type RenderInput = { id: string; script: string; title: string; voice: string };

/**
 * Monta um Short vertical 1080x1920: narração neural + fundo neon animado + legendas
 * palavra a palavra + gancho no topo. Tudo gerado do zero (nenhum vídeo de terceiros).
 */
export async function renderVideo(input: RenderInput, baseDir: string) {
  const dir = path.join(baseDir, input.id);
  await mkdir(dir, { recursive: true });

  const { audioPath, boundaries } = await synthesize(input.script, input.voice, dir);
  const audio = path.basename(audioPath);
  const duration = Math.max(await mediaDuration(audio, dir), boundaries.at(-1)?.end ?? 0);
  if (!duration) throw new Error("A narração saiu vazia.");

  const words = alignWords(input.script, boundaries, duration);
  const font = await prepareFont(dir);
  await writeFile(path.join(dir, "captions.ass"), buildAss(words, { hook: input.title, font }), "utf8");

  const total = (duration + 0.6).toFixed(2);
  await ffmpeg(
    [
      "-y",
      "-f", "lavfi",
      "-i", `gradients=s=1080x1920:c0=0x3a1260:c1=0xff2e88:c2=0x8b3dff:c3=0xff8a3d:n=4:speed=0.006:d=${total}:r=30`,
      "-i", audio,
      "-vf", "boxblur=40:2,eq=brightness=-0.18:saturation=1.2,vignette=PI/4,ass=captions.ass:fontsdir=.",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "128k",
      "-t", total,
      "-movflags", "+faststart",
      "final.mp4",
    ],
    dir,
  );

  return { path: path.join(dir, "final.mp4"), duration: Number(total) };
}
