/** Converte a duração ISO 8601 do YouTube (ex.: "PT1M5S", "P1DT2H") em segundos. */
export function parseDuration(iso: string): number {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso);
  if (!m) return 0;
  const [, d, h, min, s] = m.map((v) => Number(v ?? 0));
  return d * 86400 + h * 3600 + min * 60 + s;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

/** Views por hora desde a publicação: mede a "velocidade" do viral. */
export function viewsPerHour(views: number, publishedAt: string, now = Date.now()): number {
  const hours = Math.max((now - new Date(publishedAt).getTime()) / 3_600_000, 1);
  return views / hours;
}

/** (likes + comentários) / views, em porcentagem. */
export function engagementRate(views: number, likes: number, comments: number): number {
  if (!views) return 0;
  return ((likes + comments) / views) * 100;
}

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

export function formatCompact(n: number): string {
  return compact.format(n);
}

export function timeAgo(iso: string, now = Date.now()): string {
  const hours = Math.floor((now - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return "agora";
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "há 1 dia" : `há ${days} dias`;
}
