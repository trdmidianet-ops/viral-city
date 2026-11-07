import type { CSSProperties } from "react";
import { LogoMark } from "@/components/brand";
import { headlineSize, layoutFor, type TemplateId } from "@/lib/scale/templates";

/**
 * Prévia do template em HTML, nas mesmas posições do render (1080x1920 escalado pela largura),
 * com uma conta de exemplo. Os tamanhos usam cqw, então a prévia funciona em qualquer largura.
 */

export type PreviewProfile = { name: string; handle: string; avatarUrl?: string | null; verified: boolean };

export const SAMPLE_PROFILE: PreviewProfile = { name: "Viral City", handle: "@viralcity", verified: true };
const SAMPLE_HEADLINE = "viu tudo do gta 6 ainda?";
const SAMPLE_CTA = "se você curte gta 6, precisa seguir essa página";

const u = (px: number) => `${(px / 10.8).toFixed(3)}cqw`;

/** "Vídeo" de exemplo: pôr do sol com a cidade. */
function SampleVideo({ style }: { style: CSSProperties }) {
  return (
    <div className="absolute overflow-hidden" style={style}>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#2a1150,#a2246a_55%,#ff8a3d)]" />
      <div className="absolute left-1/2 top-[42%] aspect-square w-[34%] -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,#ffd166,#ff2e88)] opacity-90" />
      <div className="absolute inset-x-0 bottom-0 h-[38%] bg-[linear-gradient(90deg,#140a2a_0_8%,transparent_8%_11%,#140a2a_11%_19%,transparent_19%_21%,#140a2a_21%_33%,transparent_33%_36%,#140a2a_36%_44%,transparent_44%_47%,#140a2a_47%_60%,transparent_60%_62%,#140a2a_62%_73%,transparent_73%_76%,#140a2a_76%_88%,transparent_88%_90%,#140a2a_90%)] [clip-path:polygon(0_40%,8%_40%,8%_10%,19%_10%,19%_55%,33%_55%,33%_0,44%_0,44%_35%,60%_35%,60%_20%,73%_20%,73%_50%,88%_50%,88%_15%,100%_15%,100%_100%,0_100%)]" />
    </div>
  );
}

function Badge({ size }: { size: string }) {
  return (
    <svg viewBox="0 0 24 24" style={{ width: size, height: size }} className="shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#1d9bf0" />
      <path d="M6 12.5 10.2 16.5 18 8 16.4 6.6 10.2 13.4 7.6 10.9Z" fill="#fff" />
    </svg>
  );
}

function Profile({ id, profile }: { id: TemplateId; profile: PreviewProfile }) {
  const L = layoutFor(id);
  const a = L.avatar!;
  const nameSize = Math.round(a.size * 0.44);
  const handleSize = Math.round(a.size * 0.36);
  const onVideo = id === "texto-central";
  return (
    <div className="absolute flex items-center" style={{ left: u(a.x), top: u(a.y), gap: u(22) }}>
      <div className="overflow-hidden rounded-full bg-night" style={{ width: u(a.size), height: u(a.size) }}>
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- foto do canal conectado
          <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-[8%]">
            <LogoMark size={64} />
          </div>
        )}
      </div>
      <div className={onVideo ? "[text-shadow:0_1px_3px_#000]" : ""}>
        <div className="flex items-center font-bold leading-tight" style={{ fontSize: u(nameSize), gap: u(10), color: L.light ? "#0f0f14" : "#fff" }}>
          {profile.name || "Sua página"}
          {profile.verified && <Badge size={u(nameSize * 0.95)} />}
        </div>
        {profile.handle && (
          <div className="leading-tight" style={{ fontSize: u(handleSize), color: onVideo ? "#fff" : "#8f96a0" }}>
            {profile.handle}
          </div>
        )}
      </div>
    </div>
  );
}

export function TemplateThumb({
  id,
  className = "",
  profile = SAMPLE_PROFILE,
  headline = SAMPLE_HEADLINE,
  cta = SAMPLE_CTA,
}: {
  id: TemplateId;
  className?: string;
  profile?: PreviewProfile;
  headline?: string;
  cta?: string;
}) {
  const L = layoutFor(id);
  const v = L.video;
  const bg = L.background === "white" ? "#ffffff" : "#000000";
  return (
    <div className={`relative aspect-[9/16] overflow-hidden rounded-lg ring-1 ring-white/10 ${className}`} style={{ containerType: "inline-size", background: bg }}>
      <SampleVideo style={{ left: u(v.x), top: u(v.y), width: u(v.w), height: u(v.h), filter: L.dim ? "brightness(0.85)" : undefined }} />

      {(id === "perfil" || id === "perfil-cta") && (
        <>
          <p className="absolute inset-x-0 px-[6.5%] text-center leading-snug text-white" style={{ bottom: `calc(100% - ${u(v.y - 44)})`, fontSize: u(headlineSize(headline, 64)) }}>
            {headline}
          </p>
          <Profile id={id} profile={profile} />
          {id === "perfil-cta" && (
            <p className="absolute inset-x-0 px-[6.5%] text-center leading-snug text-white" style={{ top: u(L.avatar!.y + L.avatar!.size + 50), fontSize: u(headlineSize(cta, 54)) }}>
              {cta}
            </p>
          )}
        </>
      )}

      {(id === "tweet-escuro" || id === "tweet-claro") && (
        <>
          <Profile id={id} profile={profile} />
          <p
            className="absolute leading-snug"
            style={{ left: u(60), right: u(60), top: u(L.avatar!.y + L.avatar!.size + 30), fontSize: u(headlineSize(headline, 56)), color: L.light ? "#0f0f14" : "#fff" }}
          >
            {headline}
          </p>
        </>
      )}

      {id === "texto-central" && (
        <>
          <p className="absolute inset-x-0 -translate-y-1/2 px-[6.5%] text-center font-bold leading-snug text-white [text-shadow:0_0_4px_#000,0_2px_2px_#000]" style={{ top: u(820), fontSize: u(headlineSize(headline, 66)) }}>
            {headline}
          </p>
          <Profile id={id} profile={profile} />
        </>
      )}

      {id === "manchete" && (
        <p
          className="absolute inset-x-0 top-0 flex items-center justify-center px-[6.5%] text-center uppercase leading-[1.05] text-white"
          style={{ height: u(560), fontSize: u(headlineSize(headline, 124)), fontFamily: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif" }}
        >
          {headline}
        </p>
      )}
    </div>
  );
}
