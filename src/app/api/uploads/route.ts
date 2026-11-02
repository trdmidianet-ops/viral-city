import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, hasAccess } from "@/lib/gate";
import { currentUserId } from "@/lib/auth";
import { UPLOADS_DIR, canUseLocalFiles } from "@/lib/clips/local-files";

const ALLOWED = ["mp4", "mov", "mkv", "webm", "m4v"];

/** Recebe o vídeo longo enviado pelo painel aberto no PC e grava em .data/uploads. */
export async function POST(req: NextRequest) {
  if (!(await hasAccess(req.cookies.get(GATE_COOKIE)?.value, async () => Boolean(await currentUserId())))) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  }
  if (!canUseLocalFiles()) {
    return NextResponse.json({ error: "Envio de arquivo só funciona no painel aberto no seu PC." }, { status: 400 });
  }
  const name = decodeURIComponent(req.headers.get("x-filename") ?? "video.mp4").slice(0, 200);
  const ext = path.extname(name).slice(1).toLowerCase();
  if (!ALLOWED.includes(ext)) return NextResponse.json({ error: "Formato não suportado (use MP4, MOV, MKV ou WEBM)." }, { status: 400 });
  if (!req.body) return NextResponse.json({ error: "Arquivo vazio." }, { status: 400 });

  await mkdir(UPLOADS_DIR, { recursive: true });
  const id = `${randomUUID()}.${ext}`;
  const target = path.join(UPLOADS_DIR, id);
  try {
    await pipeline(Readable.fromWeb(req.body as never), createWriteStream(target));
  } catch {
    await unlink(target).catch(() => {});
    return NextResponse.json({ error: "O envio foi interrompido." }, { status: 500 });
  }
  return NextResponse.json({ uploadId: id, name });
}
