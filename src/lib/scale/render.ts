import { existsSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ffmpeg, mediaDuration } from "@/lib/clips/ffmpeg";
import { audioSpeedFilter, buildTemplateAss, templateVideoFilter, type TemplateId, type VariationParams } from "./templates";

/** Vídeos base longos demais viram Shorts de até 3 minutos. */
export const MAX_BASE_SECONDS = 180;

async function prepareFont(dir: string): Promise<string> {
  const impact = "C:/Windows/Fonts/impact.ttf";
  if (existsSync(impact)) {
    await copyFile(impact, path.join(dir, "impact.ttf"));
    return "Impact";
  }
  return "Arial";
}

export type RenderVariationInput = {
  id: string;
  basePath: string;
  template: TemplateId;
  headline: string;
  handle: string;
  params: VariationParams;
};

/** Renderiza uma versão: vídeo base no layout do template, manchete e pequenas diferenças de edição. */
export async function renderVariation(input: RenderVariationInput, baseDir: string): Promise<{ file: string; duration: number }> {
  const dir = path.join(baseDir, input.id);
  await mkdir(dir, { recursive: true });

  const total = await mediaDuration(input.basePath);
  if (!total) throw new Error("Não consegui ler o vídeo base.");
  const offset = Math.min(input.params.offset, Math.max(0, total - 3));
  const inputSeconds = Math.min(total - offset, MAX_BASE_SECONDS * input.params.speed);
  const duration = inputSeconds / input.params.speed;

  const font = await prepareFont(dir);
  await writeFile(
    path.join(dir, "text.ass"),
    buildTemplateAss(input.template, { headline: input.headline, handle: input.handle, duration, font }),
    "utf8",
  );

  // clipe de gameplay sem som: não dá para acelerar um áudio que não existe
  const hasAudio = await ffmpeg(["-i", path.resolve(input.basePath), "-map", "0:a:0", "-t", "0.1", "-f", "null", "-"]).then(
    () => true,
    () => false,
  );
  const audio = hasAudio ? audioSpeedFilter(input.params) : "";
  const filters = [templateVideoFilter(input.template, input.params), "[base]ass=text.ass:fontsdir=.[out]"];
  if (audio) filters.push(`[0:a]${audio}[aout]`);

  await ffmpeg(
    [
      "-y",
      "-ss", offset.toFixed(2),
      "-t", inputSeconds.toFixed(2),
      "-i", path.resolve(input.basePath),
      "-filter_complex", filters.join(";"),
      "-map", "[out]",
      "-map", audio ? "[aout]" : "0:a:0?",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p", "-r", "30",
      "-c:a", "aac", "-b:a", "160k",
      "-movflags", "+faststart",
      "final.mp4",
    ],
    dir,
  );
  return { file: path.join(dir, "final.mp4"), duration };
}
