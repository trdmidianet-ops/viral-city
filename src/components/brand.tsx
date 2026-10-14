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

/** Cenário de pôr do sol: sol listrado, skyline, palmeiras e grade retrô. */
export function SunsetScene() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_70%,rgba(255,46,136,0.35),transparent_60%),linear-gradient(180deg,#0b0618_0%,#2a0f4a_45%,#5a1a5e_62%,#0b0618_63%)]" />
      <svg
        className="absolute left-1/2 top-[18%] w-[min(560px,90vw)] -translate-x-1/2"
        viewBox="0 0 400 220"
      >
        <defs>
          <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd166" />
            <stop offset="50%" stopColor="#ff8a3d" />
            <stop offset="100%" stopColor="#ff2e88" />
          </linearGradient>
          <mask id="stripes">
            <rect width="400" height="220" fill="white" />
            {[120, 140, 158, 174, 188, 200, 210].map((y, i) => (
              <rect key={y} x="0" y={y} width="400" height={3 + i} fill="black" />
            ))}
          </mask>
        </defs>
        <circle cx="200" cy="200" r="170" fill="url(#sun)" mask="url(#stripes)" opacity="0.95" />
      </svg>

      {/* skyline */}
      <svg className="absolute bottom-[37%] left-0 w-full" viewBox="0 0 1440 140" preserveAspectRatio="none">
        <path
          fill="#12082a"
          d="M0 140V96h40V70h30v26h28V50h22v-18h14v18h20v90h40V80h36v-30h18v30h26v60h30V60h20V30h8V10h6v20h8v30h22v80h44V90h30V40h40v100h36V70h24v-20h30v90h40V30h16V12h10v18h16v110h34V84h38v56h46V56h22V36h20v104h40V74h30v66h36V44h26V24h12v20h24v96h44V88h32v52h40V64h28v76h38V90h30v50h40V48h22v92h34V80h36v60h40V98h40v42z"
        />
      </svg>

      {/* palmeiras */}
      <Palm className="absolute bottom-[34%] left-[3%] h-[46%] max-h-[380px] opacity-95" />
      <Palm className="absolute bottom-[34%] right-[4%] h-[38%] max-h-[320px] -scale-x-100 opacity-95" />

      {/* chão */}
      <div className="absolute inset-x-0 bottom-0 h-[37%] overflow-hidden bg-[linear-gradient(180deg,#1a0b33,#0b0618)]">
        <div className="retro-grid absolute -inset-x-1/2 top-0 h-[200%]" />
      </div>
    </div>
  );
}

function Palm({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 300" fill="#0b0618">
      <path d="M60 300 C58 230 56 160 66 70 L72 71 C64 160 66 230 68 300 Z" />
      <path d="M68 72 C50 50 22 48 4 64 C26 56 48 60 68 78 Z" />
      <path d="M68 72 C84 46 108 40 120 52 C100 50 84 60 70 78 Z" />
      <path d="M68 72 C60 40 40 22 20 22 C42 30 58 50 66 78 Z" />
      <path d="M68 72 C76 40 92 22 110 18 C92 32 80 50 72 78 Z" />
      <path d="M68 72 C84 70 104 82 112 102 C98 86 84 80 70 78 Z" />
      <path d="M68 72 C50 76 32 92 26 112 C40 94 54 84 68 80 Z" />
    </svg>
  );
}
