import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

/** Roda o FFmpeg (caminhos relativos ao `cwd` evitam problemas de escape no Windows). */
export function ffmpeg(args: string[], cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error("FFmpeg não encontrado (ffmpeg-static)."));
    const proc = spawn(ffmpegPath, ["-hide_banner", ...args], { cwd, windowsHide: true });
    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d;
      if (stderr.length > 200_000) stderr = stderr.slice(-50_000);
    });
    proc.on("error", reject);
    proc.on("close", (code) =>
      code === 0 ? resolve(stderr) : reject(new Error(`FFmpeg falhou (${code}): ${stderr.slice(-600)}`)),
    );
  });
}

export async function mediaDuration(file: string): Promise<number> {
  const out = await ffmpeg(["-i", file, "-map", "0:a:0?", "-f", "null", "-"]).catch((e: Error) => e.message);
  const m = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(out);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
}

/** Extrai o áudio como PCM float 16 kHz mono (formato que o Whisper espera). */
export function audioPcm16k(file: string): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error("FFmpeg não encontrado."));
    const proc = spawn(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-i", file, "-vn", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], {
      windowsHide: true,
    });
    const parts: Buffer[] = [];
    let err = "";
    proc.stdout.on("data", (d: Buffer) => parts.push(d));
    proc.stderr.on("data", (d) => (err += d));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error(`Não foi possível extrair o áudio: ${err.slice(-300)}`));
      const buf = Buffer.concat(parts);
      const copy = new Uint8Array(buf.byteLength);
      copy.set(buf);
      resolve(new Float32Array(copy.buffer, 0, Math.floor(copy.byteLength / 4)));
    });
  });
}
