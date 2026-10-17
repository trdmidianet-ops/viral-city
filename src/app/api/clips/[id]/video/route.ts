import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { isDbConfigured } from "@/lib/db";
import { getClip } from "@/lib/clips/repo";
import { canUseLocalFiles, isInsideData } from "@/lib/clips/local-files";

/** Serve a prévia do corte a partir do PC, com suporte a "Range" (avançar/voltar no player). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!canUseLocalFiles() || !isDbConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response("Prévia disponível só no painel do PC.", { status: 404 });
  }
  const clip = await getClip(id);
  if (!clip?.local_path || !isInsideData(clip.local_path)) return new Response("Corte não encontrado.", { status: 404 });

  const { size } = await stat(clip.local_path).catch(() => ({ size: 0 }));
  if (!size) return new Response("Arquivo não encontrado.", { status: 404 });

  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") ?? "");
  const headers: Record<string, string> = { "Content-Type": "video/mp4", "Accept-Ranges": "bytes", "Cache-Control": "no-store" };

  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = Math.min(range[2] ? Number(range[2]) : size - 1, size - 1);
    if (start > end || start >= size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    const stream = Readable.toWeb(createReadStream(clip.local_path, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  const stream = Readable.toWeb(createReadStream(clip.local_path)) as ReadableStream;
  return new Response(stream, { headers: { ...headers, "Content-Length": String(size) } });
}
