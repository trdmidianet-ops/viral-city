import { exec } from "node:child_process";
import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, hasAccess } from "@/lib/gate";
import { currentUserId } from "@/lib/auth";
import { canUseLocalFiles } from "@/lib/clips/local-files";

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
      { error: "Preview de vídeos só funciona com o painel aberto no seu PC." },
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

  const command = `yt-dlp --dump-json --no-playlist "${url}"`;

  return new Promise<NextResponse>((resolve) => {
    const timeout = setTimeout(() => {
      resolve(
        NextResponse.json(
          { error: "Tempo limite atingido ao buscar informações do vídeo." },
          { status: 504 }
        )
      );
    }, 30_000);

    exec(command, (error, stdout, stderr) => {
      clearTimeout(timeout);
      if (error) {
        console.error("[download/info] yt-dlp erro:", stderr);
        resolve(
          NextResponse.json(
            { error: "Não foi possível obter informações do vídeo." },
            { status: 500 }
          )
        );
        return;
      }

      try {
        const data = JSON.parse(stdout);
        resolve(
          NextResponse.json({
            title: data.title ?? "Sem título",
            thumbnail: data.thumbnail ?? null,
            duration: data.duration ?? null,
            uploader: data.uploader ?? data.channel ?? null,
            platform,
            view_count: data.view_count ?? null,
            description: data.description ?? null,
          })
        );
      } catch {
        resolve(
          NextResponse.json(
            { error: "Resposta inesperada do yt-dlp." },
            { status: 500 }
          )
        );
      }
    });
  });
}
