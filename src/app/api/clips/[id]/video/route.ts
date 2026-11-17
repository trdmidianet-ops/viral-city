import { isDbConfigured } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { getOwnedClip } from "@/lib/clips/repo";
import { FILE_ID } from "@/lib/files/signed";
import { respondWithVideo } from "@/lib/files/respond";

/** Vídeo do corte (prévia, ou download com ?dl=1). Só para o dono. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isDbConfigured() || !FILE_ID.test(id)) return new Response("Vídeo não encontrado.", { status: 404 });
  const userId = await currentUserId();
  const clip = userId ? (await getOwnedClip(userId, id))?.clip : null;
  if (!clip) return new Response("Vídeo não encontrado.", { status: 404 });
  return respondWithVideo(req, "clip", id, clip.local_path);
}
