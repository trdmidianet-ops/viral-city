/**
 * Cenário de pôr do sol em SVG: céu estrelado, sol listrado, montanhas, duas camadas
 * de prédios com janelas acesas e letreiros neon, palmeiras e grade retrô.
 * É o fundo leve do hero (celular, PC fraco) e fica por baixo da cidade 3D enquanto ela carrega.
 * Tudo gerado em código com semente fixa: sai igual no servidor e no navegador.
 */

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const W = 1440;
const H = 320; // altura do SVG da skyline; a base dos prédios fica em y = H
const NEON = ["#ff2e88", "#22d3ee", "#ffd166", "#8b3dff"];

type Tower = { x: number; w: number; h: number; roof: number; win: number; neon: string; sign: boolean };

function buildSkyline() {
  const rand = seeded(42);
  const far: { x: number; w: number; h: number }[] = [];
  for (let x = -10; x < W; ) {
    const w = 28 + rand() * 46;
    far.push({ x, w, h: 70 + rand() * 120 });
    x += w + rand() * 6;
  }

  const near: Tower[] = [];
  for (let x = -20; x < W; ) {
    const w = 44 + rand() * 74;
    // mais baixos no meio, para o sol aparecer entre os prédios
    const center = Math.abs(x + w / 2 - W / 2) / (W / 2);
    const h = (90 + rand() * 190) * (0.45 + 0.55 * Math.min(1, center * 1.6));
    near.push({
      x,
      w,
      h,
      roof: Math.floor(rand() * 4),
      win: Math.floor(rand() * 3),
      neon: NEON[Math.floor(rand() * NEON.length)],
      sign: h > 150 && rand() > 0.55,
    });
    x += w + 4 + rand() * 12;
  }

  const stars = Array.from({ length: 70 }, () => ({
    x: rand() * W,
    y: rand() * 330,
    r: 0.6 + rand() * 1.3,
    o: 0.3 + rand() * 0.6,
  }));
  return { far, near, stars };
}

const { far, near, stars } = buildSkyline();

/** Ladrilho de janelas: 4×4 janelas, algumas acesas, com cores diferentes por variação. */
function WindowPattern({ id, seed }: { id: string; seed: number }) {
  const rand = seeded(seed);
  const cells = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const v = rand();
      const fill = v > 0.9 ? "#22d3ee" : v > 0.78 ? "#ff2e88" : v > 0.5 ? "#ffd166" : "#25164a";
      const opacity = v > 0.5 ? 0.55 + rand() * 0.4 : 1;
      cells.push(<rect key={`${r}-${c}`} x={c * 12 + 3} y={r * 15 + 4} width={6} height={8} fill={fill} opacity={opacity} />);
    }
  }
  return (
    <pattern id={id} width={48} height={60} patternUnits="userSpaceOnUse">
      {cells}
    </pattern>
  );
}

function Roof({ t }: { t: Tower }) {
  const top = H - t.h;
  const cx = t.x + t.w / 2;
  switch (t.roof) {
    case 1: // antena com luz piscando
      return (
        <>
          <rect x={cx - 1} y={top - 34} width={2} height={34} fill="#1a0b33" />
          <circle cx={cx} cy={top - 35} r={2.6} fill="#ff2e88" className="vc-blink" />
        </>
      );
    case 2: // topo escalonado
      return (
        <>
          <rect x={t.x + t.w * 0.15} y={top - 14} width={t.w * 0.7} height={14} fill="#170a2e" />
          <rect x={t.x + t.w * 0.3} y={top - 26} width={t.w * 0.4} height={12} fill="#140928" />
        </>
      );
    case 3: // pináculo
      return <polygon points={`${t.x + t.w * 0.2},${top} ${cx},${top - 40} ${t.x + t.w * 0.8},${top}`} fill="#170a2e" />;
    default:
      return null;
  }
}

function Skyline() {
  return (
    <svg className="absolute bottom-[37%] left-0 h-[46%] w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="vc-mountain" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5a1a6e" />
          <stop offset="100%" stopColor="#2a0f4a" />
        </linearGradient>
        <linearGradient id="vc-tower" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1f0d3d" />
          <stop offset="100%" stopColor="#0d0620" />
        </linearGradient>
        <linearGradient id="vc-sign" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd166" />
          <stop offset="50%" stopColor="#ff8a3d" />
          <stop offset="100%" stopColor="#ff2e88" />
        </linearGradient>
        <linearGradient id="vc-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff2e88" stopOpacity="0" />
          <stop offset="100%" stopColor="#ff2e88" stopOpacity="0.35" />
        </linearGradient>
        <WindowPattern id="vc-win-0" seed={3} />
        <WindowPattern id="vc-win-1" seed={11} />
        <WindowPattern id="vc-win-2" seed={29} />
        <filter id="vc-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* montanhas synthwave */}
      <polygon
        fill="url(#vc-mountain)"
        stroke="#ff2e88"
        strokeOpacity="0.5"
        strokeWidth="1.5"
        points={`0,${H} 0,190 120,120 230,175 360,95 470,160 560,130 650,${H} 790,${H} 880,135 980,165 1080,90 1210,170 1320,115 ${W},175 ${W},${H}`}
      />

      {/* camada de trás, apagada pela névoa */}
      <g fill="#2e1254">
        {far.map((b) => (
          <rect key={b.x} x={b.x} y={H - b.h} width={b.w} height={b.h} />
        ))}
      </g>
      <g opacity="0.3">
        {far.map((b, i) => (
          <rect key={b.x} x={b.x + 4} y={H - b.h + 8} width={Math.max(0, b.w - 8)} height={b.h - 8} fill={`url(#vc-win-${i % 3})`} />
        ))}
      </g>
      <rect x="0" y={H - 120} width={W} height="120" fill="url(#vc-haze)" />

      {/* camada da frente */}
      {near.map((t) => {
        const top = H - t.h;
        const leftOfSun = t.x + t.w / 2 < W / 2;
        return (
          <g key={t.x}>
            <Roof t={t} />
            <rect x={t.x} y={top} width={t.w} height={t.h} fill="url(#vc-tower)" />
            <rect x={t.x + 6} y={top + 12} width={t.w - 12} height={t.h - 12} fill={`url(#vc-win-${t.win})`} />
            {/* luz do sol batendo na quina virada para o centro */}
            <rect x={leftOfSun ? t.x + t.w - 3 : t.x} y={top} width={3} height={t.h} fill="#ff2e88" opacity="0.45" />
          </g>
        );
      })}

      {/* neon: topos e letreiros, com um único brilho para todos */}
      <g filter="url(#vc-glow)">
        {near.map((t) =>
          t.roof === 0 ? (
            <rect key={`n${t.x}`} x={t.x} y={H - t.h} width={t.w} height={2.5} fill={t.neon} />
          ) : null,
        )}
        {near
          .filter((t) => t.sign)
          .map((t, i) => (
            <rect
              key={`s${t.x}`}
              x={t.x + (i % 2 ? 8 : t.w - 22)}
              y={H - t.h + 30}
              width={14}
              height={Math.min(90, t.h * 0.4)}
              rx={3}
              fill="url(#vc-sign)"
            />
          ))}
      </g>
    </svg>
  );
}

export function SunsetScene() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_62%,rgba(255,46,136,0.45),transparent_55%),linear-gradient(180deg,#0b0618_0%,#24104a_40%,#5a1a5e_62%,#0b0618_63%)]" />

      {/* estrelas */}
      <svg className="absolute inset-x-0 top-0 h-[55%] w-full" viewBox={`0 0 ${W} 360`} preserveAspectRatio="xMidYMin slice">
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#f6eefe" opacity={s.o} className={i % 7 === 0 ? "vc-blink" : undefined} />
        ))}
      </svg>

      {/* sol com brilho */}
      <div className="absolute left-1/2 top-[14%] h-[min(640px,110vw)] w-[min(640px,110vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,138,61,0.45),rgba(255,46,136,0.18)_45%,transparent_70%)]" />
      <svg className="absolute left-1/2 top-[20%] w-[min(560px,90vw)] -translate-x-1/2" viewBox="0 0 400 220">
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

      <Skyline />

      {/* palmeiras */}
      <Palm className="absolute bottom-[34%] left-[2%] h-[50%] max-h-[420px]" />
      <Palm className="absolute bottom-[34%] left-[11%] hidden h-[34%] max-h-[280px] -scale-x-100 md:block" />
      <Palm className="absolute bottom-[34%] right-[3%] h-[42%] max-h-[360px] -scale-x-100" />

      {/* chão: grade, linha do horizonte e reflexo do sol */}
      <div className="absolute inset-x-0 bottom-0 h-[37%] overflow-hidden bg-[linear-gradient(180deg,#1f0b3a,#0b0618)]">
        <div className="retro-grid absolute -inset-x-1/2 top-0 h-[200%]" />
        <div className="absolute left-1/2 top-0 h-full w-[min(520px,80vw)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,138,61,0.45),rgba(255,46,136,0.15)_40%,transparent_70%)]" />
      </div>
      <div className="absolute inset-x-0 bottom-[37%] h-px bg-pink shadow-[0_0_18px_4px_rgba(255,46,136,0.7)]" />
    </div>
  );
}

function Palm({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 300" fill="#0b0618" stroke="#ff2e88" strokeOpacity="0.35" strokeWidth="1">
      <path d="M60 300 C58 230 56 160 66 70 L72 71 C64 160 66 230 68 300 Z" />
      {/* anéis do tronco */}
      <g stroke="#2a0f4a" strokeOpacity="1">
        {[100, 130, 160, 190, 220, 250, 280].map((y) => (
          <line key={y} x1={60} y1={y} x2={69} y2={y - 2} />
        ))}
      </g>
      <path d="M68 72 C50 50 22 48 4 64 C26 56 48 60 68 78 Z" />
      <path d="M68 72 C84 46 108 40 120 52 C100 50 84 60 70 78 Z" />
      <path d="M68 72 C60 40 40 22 20 22 C42 30 58 50 66 78 Z" />
      <path d="M68 72 C76 40 92 22 110 18 C92 32 80 50 72 78 Z" />
      <path d="M68 72 C84 70 104 82 112 102 C98 86 84 80 70 78 Z" />
      <path d="M68 72 C50 76 32 92 26 112 C40 94 54 84 68 80 Z" />
      <path d="M68 72 C66 56 70 40 80 30 C76 46 74 60 70 78 Z" />
      <circle cx="66" cy="78" r="4" />
      <circle cx="72" cy="80" r="3.5" />
    </svg>
  );
}
