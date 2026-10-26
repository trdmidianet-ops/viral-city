import Link from "next/link";

/** Logo original: sol listrado + palmeira, nada de marcas de terceiros. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id="vc-sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd166" />
          <stop offset="55%" stopColor="#ff8a3d" />
          <stop offset="100%" stopColor="#ff2e88" />
        </linearGradient>
        <clipPath id="vc-clip">
          <circle cx="20" cy="20" r="18" />
        </clipPath>
      </defs>
      <circle cx="20" cy="20" r="18" fill="url(#vc-sun)" />
      <g clipPath="url(#vc-clip)" fill="#0b0618">
        <rect x="0" y="24" width="40" height="2" />
        <rect x="0" y="29" width="40" height="3" />
        <rect x="0" y="35" width="40" height="5" />
        {/* palmeira */}
        <path d="M27 38 C26.5 30 26 24 24.5 18 L25.6 17.8 C27.2 24 27.8 30 28.4 38 Z" />
        <path d="M25 18 C21 14 16 15 13 18 C17 16 21 16.5 25 18.6 Z" />
        <path d="M25 18 C27 13 32 11 36 13 C31.5 13.2 28 15.5 25.6 18.8 Z" />
        <path d="M25 18 C23 12 19 9 15 10 C19.5 11.5 22.5 14.5 24.6 18.8 Z" />
        <path d="M25.4 18 C29 17 34 18.5 36 22 C32 19.5 28.5 19 25.6 19 Z" />
      </g>
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="Viral City — início">
      <LogoMark />
      <span className="font-display text-lg leading-none tracking-wide">
        <span className="text-sunset">VIRAL</span> <span className="text-ink">CITY</span>
      </span>
    </Link>
  );
}
