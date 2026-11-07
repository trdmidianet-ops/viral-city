import { readFile, stat } from "node:fs/promises";
import { freshAccessToken } from "@/lib/publish/tokens";

export function shortsMetadata(title: string, description: string) {
  const desc = description.includes("#shorts") ? description : `${description}\n\n#shorts`.trim();
  return {
    snippet: { title: title.slice(0, 100), description: desc.slice(0, 5000), categoryId: "22" },
    status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
  };
}

/**
 * Envio "resumable" da YouTube Data API (videos.insert, custa 1.600 unidades de cota).
 * Devolve o ID do vídeo publicado.
 */
export async function uploadShort(params: {
  accountId: string;
  filePath: string;
  title: string;
  description: string;
}): Promise<string> {
  const token = await freshAccessToken(params.accountId);
  const size = (await stat(params.filePath)).size;

  const init = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "video/mp4",
        "X-Upload-Content-Length": String(size),
      },
      body: JSON.stringify(shortsMetadata(params.title, params.description)),
    },
  );
  if (!init.ok) throw new Error(`YouTube recusou o envio: ${await errorText(init)}`);
  const location = init.headers.get("location");
  if (!location) throw new Error("YouTube não devolveu o endereço de envio.");

  const put = await fetch(location, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", "Content-Length": String(size) },
    body: await readFile(params.filePath),
  });
  if (!put.ok) throw new Error(`Falha ao enviar o arquivo: ${await errorText(put)}`);
  const body = (await put.json()) as { id?: string };
  if (!body.id) throw new Error("YouTube não devolveu o ID do vídeo.");
  return body.id;
}

async function errorText(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  const reason = body?.error?.errors?.[0]?.reason;
  if (reason === "quotaExceeded") return "cota diária da API acabou (cada envio custa 1.600 de 10.000 unidades).";
  if (reason === "uploadLimitExceeded") return "o canal atingiu o limite de envios do dia.";
  return body?.error?.message ?? `HTTP ${res.status}`;
}
