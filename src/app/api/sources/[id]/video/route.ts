import { isDbConfigured } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { getOwnedSource } from "@/lib/clips/repo";
import { FILE_ID } from "@/lib/files/signed";
import { respondWithVideo } from "@/lib/files/respond";

/** Vídeo longo, para o editor de clipes tocar o trecho escolhido. Só para o dono. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isDbConfigured() || !FILE_ID.test(id)) return new Response("Vídeo não encontrado.", { status: 404 });
  const userId = await currentUserId();
  const source = userId ? await getOwnedSource(userId, id) : null;
  if (!source) return new Response("Vídeo não encontrado.", { status: 404 });
  return respondWithVideo(req, "source", id, source.local_path);
}
