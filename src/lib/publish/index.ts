import type { Account } from "@/lib/accounts/store";
import { uploadShort } from "@/lib/youtube/upload";
import { instagramCaption, publishInstagramReel } from "./instagram";
import { publishTiktok } from "./tiktok";

export type Published = { externalId: string; url: string | null; note?: string };

/** Publica o vídeo na rede da conta (YouTube Shorts, Instagram Reels ou TikTok). */
export async function publishVideo(account: Account, video: { filePath: string; title: string; description: string }): Promise<Published> {
  switch (account.platform) {
    case "youtube": {
      const id = await uploadShort({ accountId: account.id, filePath: video.filePath, title: video.title, description: video.description });
      return { externalId: id, url: `https://youtube.com/shorts/${id}` };
    }
    case "instagram": {
      const r = await publishInstagramReel({
        accountId: account.id,
        igUserId: account.externalId,
        filePath: video.filePath,
        caption: instagramCaption(video.title, video.description),
      });
      return { externalId: r.id, url: r.url };
    }
    case "tiktok": {
      const r = await publishTiktok({ accountId: account.id, filePath: video.filePath, title: instagramCaption(video.title, video.description) });
      return { externalId: r.id, url: r.url, note: r.privacy === "SELF_ONLY" ? "postado como privado até o app do TikTok ser aprovado" : undefined };
    }
    default:
      throw new Error("Rede não suportada.");
  }
}
