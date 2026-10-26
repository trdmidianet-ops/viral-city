import Link from "next/link";

/** Desenho da marca (viewBox 48×48): sol listrado com play, palmeira saindo do anel neon. */
function LogoArt() {
  return (
    <>
      <defs>
        <linearGradient id="vc-logo-sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd166" />
          <stop offset="50%" stopColor="#ff8a3d" />
          <stop offset="100%" stopColor="#ff2e88" />
        </linearGradient>
        <clipPath id="vc-logo-clip">
          <circle cx="24" cy="24" r="18" />
        </clipPath>
      </defs>
      {/* anel neon rosa com um arco ciano */}
      <circle cx="24" cy="24" r="22.2" fill="none" stroke="#ff2e88" strokeWidth="1.8" />
      <circle
        cx="24"
        cy="24"
        r="22.2"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeDasharray="26 200"
        transform="rotate(150 24 24)"
      />
      <circle cx="24" cy="24" r="18" fill="url(#vc-logo-sun)" />
      <g clipPath="url(#vc-logo-clip)" fill="#0b0618">
        <rect x="0" y="29" width="48" height="1.2" />
        <rect x="0" y="32.4" width="48" height="1.8" />
        <rect x="0" y="36" width="48" height="2.6" />
        <rect x="0" y="40" width="48" height="4" />
      </g>
      {/* play com cantos arredondados */}
      <path
        d="M19.5 15.5 L30.5 24 L19.5 32.5 Z"
        fill="#0b0618"
        stroke="#0b0618"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* palmeira que ultrapassa o anel */}
      <g fill="#0b0618" stroke="#ff2e88" strokeWidth="0.6" strokeLinejoin="round">
        <path d="M35.2 12.5 C36.2 22 37 32 37.6 46 L35.6 46 C35.2 32 34.6 22 34 12.6 Z" />
        <path d="M34.6 12.4 C30.5 8.6 25.5 8.8 22.5 12.2 C26.5 10.6 30.4 11 34.4 13.4 Z" />
        <path d="M34.6 12.4 C37.2 7.6 42.5 6.6 46 8.8 C41.8 8.8 38.4 10.4 35.2 13.6 Z" />
        <path d="M34.6 12.4 C33.4 7 30 3.8 26.4 3.4 C30.4 5.4 32.8 8.6 34 13 Z" />
        <path d="M34.6 12.4 C36.6 7.2 39.6 4 43 3 C40 5.4 37.8 8.6 35.4 13 Z" />
        <path d="M34.8 12.8 C39 12.4 43.6 14.6 45.6 18.6 C42.2 15.8 38.6 14.6 35 14 Z" />
        <path d="M34.4 12.8 C30.6 13.6 27.4 16 26 19.4 C28.4 16.6 31.2 15 34.6 14.2 Z" />
        <circle cx="34.2" cy="14.6" r="1.1" />
        <circle cx="35.8" cy="14.9" r="1" />
      </g>
    </>
  );
}

/** Logo original da Viral City, nada de marcas de terceiros. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="shrink-0 overflow-visible">
      <LogoArt />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="Viral City — início">
      <LogoMark size={40} />
      <span className="font-display text-lg leading-none tracking-wide">
        <span className="text-sunset">VIRAL</span>{" "}
        <span className="text-ink [text-shadow:0_0_10px_rgba(255,46,136,0.65)]">CITY</span>
      </span>
    </Link>
  );
}
