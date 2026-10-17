export type ChannelVideo = { id: string; title: string; thumbnail: string; publishedAt: string };

/** Últimos vídeos enviados pelo canal (playlist de uploads, 1 unidade de cota). */
export async function listChannelUploads(channelId: string, max = 25): Promise<ChannelVideo[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key || !/^UC[\w-]{22}$/.test(channelId)) return [];
  const playlistId = `UU${channelId.slice(2)}`;
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?${new URLSearchParams({
      part: "snippet,contentDetails",
      playlistId,
      maxResults: String(max),
      key,
    })}`,
    { next: { revalidate: 600 } },
  );
  if (!res.ok) return [];
  const body = (await res.json()) as {
    items?: {
      contentDetails: { videoId: string; videoPublishedAt?: string };
      snippet: { title: string; thumbnails: Record<string, { url: string }> };
    }[];
  };
  return (body.items ?? []).map((i) => ({
    id: i.contentDetails.videoId,
    title: i.snippet.title,
    thumbnail: (i.snippet.thumbnails.medium ?? i.snippet.thumbnails.default)?.url ?? "",
    publishedAt: i.contentDetails.videoPublishedAt ?? "",
  }));
}
