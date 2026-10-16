import Image from "next/image";
import Link from "next/link";
import { Eye, Gauge, Heart, Wand2 } from "lucide-react";
import { formatCompact, formatDuration, timeAgo } from "@/lib/youtube/metrics";
import type { TrendVideo } from "@/lib/youtube/trending";

export function VideoCard({ video, rank, niche }: { video: TrendVideo; rank: number; niche: string }) {
  const refHref = `/painel/gerador?${new URLSearchParams({ ref: video.id, titulo: video.title, canal: video.channel, nicho: niche })}`;
  return (
    <article className="glass flex flex-col overflow-hidden rounded-2xl">
      <a href={video.url} target="_blank" rel="noopener noreferrer" className="relative block aspect-video bg-night-3">
        {video.thumbnail && (
          <Image src={video.thumbnail} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
        )}
        <span className="absolute left-2 top-2 rounded-md bg-gradient-to-br from-pink to-orange px-2 py-0.5 font-display text-sm text-white">
          #{rank}
        </span>
        <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-xs">
          {formatDuration(video.durationSeconds)}
        </span>
      </a>

      <div className="flex flex-1 flex-col p-4">
        <a href={video.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-sm font-medium hover:text-pink">
          {video.title}
        </a>
        <p className="mt-1 text-xs text-muted">
          {video.channel} · {timeAgo(video.publishedAt)}
        </p>

        <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg bg-night/50 p-2">
            <dt className="flex items-center gap-1 text-muted"><Eye size={12} /> Views</dt>
            <dd className="mt-0.5 font-semibold">{formatCompact(video.views)}</dd>
          </div>
          <div className="rounded-lg bg-night/50 p-2">
            <dt className="flex items-center gap-1 text-muted"><Gauge size={12} /> Por hora</dt>
            <dd className="mt-0.5 font-semibold text-orange">{formatCompact(video.viewsPerHour)}</dd>
          </div>
          <div className="rounded-lg bg-night/50 p-2">
            <dt className="flex items-center gap-1 text-muted"><Heart size={12} /> Engaj.</dt>
            <dd className="mt-0.5 font-semibold text-cyan">{video.engagement.toFixed(1)}%</dd>
          </div>
        </dl>

        <Link
          href={refHref}
          className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-pink/40 py-2 text-xs text-ink transition hover:bg-pink/10"
        >
          <Wand2 size={14} /> Usar como referência
        </Link>
      </div>
    </article>
  );
}
