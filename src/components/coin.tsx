import { formatCoins } from "@/lib/coins/pricing";

/**
 * Logo do CityCoin (viewBox 48×48): moeda dourada com aro neon e um "C" em degradê
 * de pôr do sol envolvendo um cifrão. Original, sem marcas de terceiros.
 */
export function CoinMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className={`shrink-0 ${className ?? ""}`}>
      <defs>
        <linearGradient id="vc-coin-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff1b8" />
          <stop offset="45%" stopColor="#ffd166" />
          <stop offset="100%" stopColor="#ff8a3d" />
        </linearGradient>
        <linearGradient id="vc-coin-c" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd166" />
          <stop offset="55%" stopColor="#ff8a3d" />
          <stop offset="100%" stopColor="#ff2e88" />
        </linearGradient>
      </defs>
      {/* borda serrilhada da moeda */}
      <circle cx="24" cy="24" r="22.5" fill="none" stroke="#ff8a3d" strokeWidth="1.6" strokeDasharray="2 1.6" />
      <circle cx="24" cy="24" r="21" fill="url(#vc-coin-gold)" />
      <circle cx="24" cy="24" r="17" fill="#140a2a" stroke="#ff2e88" strokeWidth="1.5" />
      {/* C de CityCoin */}
      <path d="M31.4 16.6 A10.5 10.5 0 1 0 31.4 31.4" fill="none" stroke="url(#vc-coin-c)" strokeWidth="4.4" strokeLinecap="round" />
      {/* cifrão dentro do C */}
      <g fill="none" stroke="#22d3ee" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" transform="translate(24.2 24) scale(0.78) translate(-24.2 -24)">
        <path d="M28 19.6 C27 18.4 25.6 18 24.2 18 C22 18 20.6 19.2 20.6 20.8 C20.6 22.6 22.2 23.2 24.2 23.8 C26.4 24.4 28.2 25.2 28.2 27.2 C28.2 29 26.6 30.2 24.4 30.2 C22.8 30.2 21.2 29.6 20.2 28.4" />
        <path d="M24.3 15.8 V32.2" />
      </g>
      {/* brilho */}
      <path d="M12 15 A14 14 0 0 1 20 9.5" fill="none" stroke="#fff8e0" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

/** Saldo com a moedinha ao lado: "🪙 1.250". */
export function CoinAmount({ value, size = 18, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={`num inline-flex items-center gap-1.5 font-heading font-semibold ${className ?? ""}`}>
      <CoinMark size={size} />
      {formatCoins(value)}
    </span>
  );
}
