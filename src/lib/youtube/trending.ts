import { engagementRate, parseDuration, viewsPerHour } from "./metrics";
import { periods, regions, type TrendFilters } from "./niches";

const API = "https://www.googleapis.com/youtube/v3";
const SHORTS_MAX_SECONDS = 180;
const CACHE_SECONDS = 60 * 60;

export type TrendVideo = {
  id: string;
  title: string;
  channel: string;
  channelId: string;
  thumbnail: string;
  publishedAt: string;
  durationSeconds: number;
  views: number;
  likes: number;
  comments: number;
  viewsPerHour: number;
  engagement: number;
  url: string;
};

export type TrendResult =
  | { ok: true; videos: TrendVideo[]; quotaCost: number }
  | { ok: false; reason: "missing-key" | "no-chart" | "quota" | "invalid-key" | "error"; message?: string };

type ApiVideo = {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    thumbnails: Record<string, { url: string }>;
  };
  contentDetails: { duration: string };
  statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
};

class YoutubeError extends Error {
  constructor(public reason: string, message: string) {
    super(message);
  }
}

async function call<T>(path: string, params: Record<string, string>, key: string): Promise<T> {
  const url = `${API}/${path}?${new URLSearchParams({ ...params, key })}`;
  const res = await fetch(url, { next: { revalidate: CACHE_SECONDS } });
  const body = await res.json();
  if (!res.ok) {
    const reason = body?.error?.errors?.[0]?.reason ?? "error";
    throw new YoutubeError(reason, body?.error?.message ?? `HTTP ${res.status}`);
  }
  return body as T;
}

function toTrend(v: ApiVideo): TrendVideo {
  const views = Number(v.statistics.viewCount ?? 0);
  const likes = Number(v.statistics.likeCount ?? 0);
  const comments = Number(v.statistics.commentCount ?? 0);
  const t = v.snippet.thumbnails;
  return {
    id: v.id,
    title: v.snippet.title,
    channel: v.snippet.channelTitle,
    channelId: v.snippet.channelId,
    thumbnail: (t.high ?? t.medium ?? t.default)?.url ?? "",
    publishedAt: v.snippet.publishedAt,
    durationSeconds: parseDuration(v.contentDetails.duration),
    views,
    likes,
    comments,
    viewsPerHour: viewsPerHour(views, v.snippet.publishedAt),
    engagement: engagementRate(views, likes, comments),
    url: `https://www.youtube.com/watch?v=${v.id}`,
  };
}

export async function fetchTrending(filters: TrendFilters): Promise<TrendResult> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return { ok: false, reason: "missing-key" };

  const { niche, region, format, period, sort } = filters;
  const periodHours = periods.find((p) => p.id === period)!.hours;
  const publishedAfter = new Date(Date.now() - periodHours * 3_600_000).toISOString();
  const parts = "snippet,contentDetails,statistics";

  try {
    let items: ApiVideo[];
    let quotaCost: number;

    if (niche.kind === "category") {
      const res = await call<{ items: ApiVideo[] }>(
        "videos",
        {
          part: parts,
          chart: "mostPopular",
          regionCode: region,
          maxResults: "50",
          ...(niche.categoryId !== "0" && { videoCategoryId: niche.categoryId }),
        },
        key,
      );
      items = res.items ?? [];
      quotaCost = 1;
    } else {
      const lang = regions.find((r) => r.code === region)!.lang;
      const search = await call<{ items: { id: { videoId: string } }[] }>(
        "search",
        {
          part: "id",
          type: "video",
          order: "viewCount",
          maxResults: "50",
          regionCode: region,
          relevanceLanguage: lang,
          publishedAfter,
          q: lang === "pt" ? niche.query.pt : niche.query.en,
          ...(format === "shorts" && { videoDuration: "short" }),
          ...(format === "longos" && { videoDuration: "medium" }),
        },
        key,
      );
      const ids = (search.items ?? []).map((i) => i.id.videoId).filter(Boolean);
      if (!ids.length) return { ok: true, videos: [], quotaCost: 100 };
      const res = await call<{ items: ApiVideo[] }>("videos", { part: parts, id: ids.join(",") }, key);
      items = res.items ?? [];
      quotaCost = 101;
    }

    const videos = items
      .map(toTrend)
      .filter((v) => new Date(v.publishedAt).toISOString() >= publishedAfter)
      .filter((v) =>
        format === "shorts"
          ? v.durationSeconds > 0 && v.durationSeconds <= SHORTS_MAX_SECONDS
          : format === "longos"
            ? v.durationSeconds > SHORTS_MAX_SECONDS
            : true,
      )
      .sort((a, b) =>
        sort === "velocidade"
          ? b.viewsPerHour - a.viewsPerHour
          : sort === "engajamento"
            ? b.engagement - a.engagement
            : b.views - a.views,
      );

    return { ok: true, videos, quotaCost };
  } catch (err) {
    if (err instanceof YoutubeError) {
      if (err.reason === "notFound" || err.reason === "invalidChart" || err.reason === "invalidCategoryId")
        return { ok: false, reason: "no-chart" };
      if (err.reason === "quotaExceeded" || err.reason === "dailyLimitExceeded") return { ok: false, reason: "quota" };
      if (err.reason === "keyInvalid" || err.reason === "badRequest" || err.reason === "forbidden")
        return { ok: false, reason: "invalid-key", message: err.message };
      return { ok: false, reason: "error", message: err.message };
    }
    return { ok: false, reason: "error", message: "Não foi possível falar com o YouTube agora." };
  }
}
