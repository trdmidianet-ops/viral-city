import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { exec } from "node:child_process";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, hasAccess } from "@/lib/gate";
import { currentUserId } from "@/lib/auth";
import { DATA_DIR, canUseLocalFiles } from "@/lib/clips/local-files";

const DOWNLOADS_DIR = path.join(DATA_DIR, "downloads");

const ALLOWED_PLATFORMS = [
  "youtube.com",
  "youtu.be",
  "instagram.com",
  "tiktok.com",
];

function detectPlatform(url: string): string | null {
  try {
    const { hostname } = new URL(url);
    const host = hostname.replace(/^www\./, "");
    return ALLOWED_PLATFORMS.find((p) => host === p || host.endsWith("." + p)) ?? null;
  } catch {
    return null;
  }
}

function ytdlpArgs(url: string, platform: string): string[] {
  const args = [
    "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best",
    "--merge-output-format", "mp4",
    "--no-playlist",
  ];
  if (platform === "instagram.com") {
    args.push("--cookies-from-browser", "chrome");
  }
  if (platform === "tiktok.com") {
    args.push(
      "--user-agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
    );
  }
  return args;
}

export async function POST(req: NextRequest) {
  if (
    !(await hasAccess(
      req.cookies.get(GATE_COOKIE)?.value,
      async () => Boolean(await currentUserId())
    ))
  ) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  }
  if (!canUseLocalFiles()) {
    return NextResponse.json(
      { error: "Download de vídeos só funciona com o painel aberto no seu PC." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const url: unknown = body?.url;
  if (typeof url !== "string" || !url.trim()) {
    return NextResponse.json({ error: "URL inválida." }, { status: 400 });
  }

  const platform = detectPlatform(url);
  if (!platform) {
    return NextResponse.json(
      { error: "Plataforma não suportada. Use YouTube, Instagram ou TikTok." },
      { status: 400 }
    );
  }

  await mkdir(DOWNLOADS_DIR, { recursive: true });

  const fileId = randomUUID();
  const outputTemplate = path.join(DOWNLOADS_DIR, `${fileId}.%(ext)s`);
  const extraArgs = ytdlpArgs(url, platform);
  const command = [
    "yt-dlp",
    ...extraArgs,
    "-o",
    `"${outputTemplate}"`,
    `"${url}"`,
  ].join(" ");

  return new Promise<NextResponse>((resolve) => {
    const timeout = setTimeout(() => {
      resolve(
        NextResponse.json(
          { error: "Tempo limite de download atingido (120s)." },
          { status: 504 }
        )
      );
    }, 120_000);

    exec(command, (error, _stdout, stderr) => {
      clearTimeout(timeout);
      if (error) {
        console.error("[download] yt-dlp erro:", stderr);
        resolve(
          NextResponse.json(
            {
              error:
                "Falha ao baixar o vídeo. Verifique se o yt-dlp está instalado.",
            },
            { status: 500 }
          )
        );
        return;
      }
      resolve(
        NextResponse.json({
          success: true,
          file_id: fileId,
          file: `${fileId}.mp4`,
          platform,
        })
      );
    });
  });
}
