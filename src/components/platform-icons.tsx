type IconProps = { size?: number; className?: string; "aria-label"?: string };

function base(size: number, label?: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    role: label ? "img" : undefined,
    "aria-label": label,
    "aria-hidden": label ? undefined : true,
  };
}

export function YoutubeIcon({ size = 24, className, ...p }: IconProps) {
  return (
    <svg {...base(size, p["aria-label"])} className={className}>
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="M10 9.5v5l4.5-2.5z" fill="currentColor" />
    </svg>
  );
}

export function TiktokIcon({ size = 24, className, ...p }: IconProps) {
  return (
    <svg {...base(size, p["aria-label"])} className={className}>
      <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
      <path d="M14 3c.5 2.8 2.4 4.6 5 5" />
    </svg>
  );
}

export function InstagramIcon({ size = 24, className, ...p }: IconProps) {
  return (
    <svg {...base(size, p["aria-label"])} className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

export const platforms = [
  { id: "youtube", name: "YouTube", Icon: YoutubeIcon, color: "text-[#ff4d4d]" },
  { id: "tiktok", name: "TikTok", Icon: TiktokIcon, color: "text-cyan" },
  { id: "instagram", name: "Instagram", Icon: InstagramIcon, color: "text-pink" },
] as const;
