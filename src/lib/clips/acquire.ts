import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { getAccount } from "@/lib/accounts/store";
import type { Source } from "./repo";

const MAX_BYTES = 4 * 1024 ** 3; // 4 GB

/** Converte links de compartilhamento (Drive, Dropbox) em link de download direto. */
export function directDownloadUrl(raw: string): string {
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Use um link http(s).");

  const host = url.hostname.replace(/^www\./, "");
  if (host === "drive.google.com") {
    const id = url.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] ?? url.searchParams.get("id");
    if (!id) throw new Error("Link do Google Drive sem ID do arquivo.");
    return `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;
  }
  if (host === "dropbox.com" || host.endsWith(".dropbox.com")) {
    url.searchParams.set("dl", "1");
    return url.toString();
  }
  return url.toString();
}

async function downloadLink(rawUrl: string, target: string) {
  const res = await fetch(directDownloadUrl(rawUrl), { redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`Não foi possível baixar o link (HTTP ${res.status}).`);
  const type = res.headers.get("content-type") ?? "";
  if (type.startsWith("text/html")) {
    throw new Error("O link abriu uma página, não um arquivo de vídeo. Verifique se o compartilhamento está público.");
  }
  const size = Number(res.headers.get("content-length") ?? 0);
  if (size > MAX_BYTES) throw new Error("Arquivo maior que 4 GB.");
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(target));
}

/** Confere pela API do YouTube que o vídeo é mesmo do canal conectado. */
async function assertOwnVideo(videoId: string, channelId: string) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY não configurada.");
  const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(videoId)}&key=${key}`);
  const body = (await res.json()) as { items?: { snippet: { channelId: string } }[] };
  if (body.items?.[0]?.snippet.channelId !== channelId) {
    throw new Error("Esse vídeo não pertence ao canal conectado.");
  }
}

function ytDlpUrl(url: string, target: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "yt-dlp",
      ["-f", "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b", "--merge-output-format", "mp4", "--no-playlist", "-o", target, url],
      { windowsHide: true },
    );
    let err = "";
    proc.stderr.on("data", (d) => (err += d));
    proc.on("error", () =>
      reject(new Error("yt-dlp não está instalado no servidor. Instale com: apt-get install yt-dlp")),
    );
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`yt-dlp falhou: ${err.slice(-400)}`))));
  });
}

function ytDlp(videoId: string, target: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "yt-dlp",
      ["-f", "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b", "--merge-output-format", "mp4", "--no-playlist", "-o", target, `https://www.youtube.com/watch?v=${videoId}`],
      { windowsHide: true },
    );
    let err = "";
    proc.stderr.on("data", (d) => (err += d));
    proc.on("error", () =>
      reject(new Error("yt-dlp não está instalado. No PowerShell rode: winget install yt-dlp.yt-dlp — e reinicie o worker.")),
    );
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`yt-dlp falhou: ${err.slice(-400)}`))));
  });
}

/** Deixa o vídeo longo disponível no PC e devolve o caminho. */
export async function acquireSource(source: Source, baseDir: string): Promise<string> {
  const dir = path.join(baseDir, source.id);
  await mkdir(dir, { recursive: true });

  if (source.kind === "file") {
    if (!source.local_path) throw new Error("Arquivo enviado não encontrado.");
    await stat(source.local_path);
    return source.local_path;
  }

  const target = path.join(dir, "source.mp4");
  if (source.kind === "import") {
    if (!source.source_url) throw new Error("Fonte sem URL.");
    await ytDlpUrl(source.source_url, target);
  } else if (source.kind === "link") {
    if (!source.source_url) throw new Error("Fonte sem link.");
    const isYt = /youtube\.com|youtu\.be/i.test(source.source_url);
    if (isYt) {
      await ytDlpUrl(source.source_url, target);
    } else {
      await downloadLink(source.source_url, target);
    }
  } else {
    if (!source.youtube_video_id || !source.account_id) throw new Error("Vídeo do canal sem identificação.");
    const account = await getAccount(source.account_id);
    if (!account || account.platform !== "youtube") throw new Error("Canal não encontrado: reconecte a conta.");
    await assertOwnVideo(source.youtube_video_id, account.externalId);
    await ytDlp(source.youtube_video_id, target);
  }
  await stat(target);
  return target;
}
