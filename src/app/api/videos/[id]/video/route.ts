import { isDbConfigured } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { FILE_ID } from "@/lib/files/signed";
import { respondWithVideo } from "@/lib/files/respond";
import { getOwnedVideo } from "@/lib/videos/repo";

/** Vídeo aprovado, pronto para postar (prévia, download com ?dl=1, ou endereço com ?link=1). Só para o dono. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isDbConfigured() || !FILE_ID.test(id)) return new Response("Vídeo não encontrado.", { status: 404 });
  const userId = await currentUserId();
  const video = userId ? await getOwnedVideo(userId, id) : null;
  if (!video) return new Response("Vídeo não encontrado.", { status: 404 });
  return respondWithVideo(req, "video", id, video.local_path);
}
