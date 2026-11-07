import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { isInsideData } from "./local-files";

/** Envia um MP4 de dentro de .data com suporte a "Range" (avançar/voltar no player). */
export async function serveLocalVideo(req: Request, file: string | null): Promise<Response> {
  if (!file || !isInsideData(file)) return new Response("Vídeo não encontrado.", { status: 404 });
  const { size } = await stat(file).catch(() => ({ size: 0 }));
  if (!size) return new Response("Arquivo não encontrado.", { status: 404 });

  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") ?? "");
  const headers: Record<string, string> = { "Content-Type": "video/mp4", "Accept-Ranges": "bytes", "Cache-Control": "no-store" };

  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = Math.min(range[2] ? Number(range[2]) : size - 1, size - 1);
    if (start > end || start >= size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    const stream = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  const stream = Readable.toWeb(createReadStream(file)) as ReadableStream;
  return new Response(stream, { headers: { ...headers, "Content-Length": String(size) } });
}
