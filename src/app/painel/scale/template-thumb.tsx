import type { TemplateId } from "@/lib/scale/templates";

/** Miniatura 9:16 desenhada só com CSS mostrando onde ficam vídeo, faixas e manchete. */
export function TemplateThumb({ id, className = "" }: { id: TemplateId; className?: string }) {
  const video = <div className="absolute inset-0 bg-[linear-gradient(160deg,#3b1a6e,#a2246a_60%,#ff8a3d)]" />;
  const bar = (cls: string) => <div className={`absolute left-[12%] right-[12%] h-[5%] rounded-sm ${cls}`} />;
  return (
    <div className={`relative aspect-[9/16] overflow-hidden rounded-lg bg-night ring-1 ring-white/10 ${className}`}>
      {id === "manchete" && (
        <>
          <div className="absolute inset-x-0 bottom-0 top-[29%] bg-[linear-gradient(160deg,#3b1a6e,#a2246a_60%,#ff8a3d)]" />
          <div className="absolute inset-x-0 top-0 h-[29%] bg-black" />
          {bar("top-[9%] bg-white")}
          {bar("top-[16%] bg-white right-[25%]")}
        </>
      )}
      {id === "meme" && (
        <>
          <div className="absolute inset-x-0 bottom-0 top-[29%] bg-[linear-gradient(160deg,#3b1a6e,#a2246a_60%,#ff8a3d)]" />
          <div className="absolute inset-x-0 top-0 h-[29%] bg-white" />
          {bar("top-[9%] bg-night")}
          {bar("top-[16%] bg-night right-[30%]")}
        </>
      )}
      {id === "caixa" && (
        <>
          {video}
          <div className="absolute left-[10%] right-[10%] top-[14%] h-[13%] rounded bg-white" />
          {bar("top-[17%] bg-night left-[18%] right-[18%]")}
        </>
      )}
      {id === "urgente" && (
        <>
          {video}
          <div className="absolute left-[8%] top-[11%] h-[5%] w-[34%] rounded-sm bg-rose-600" />
          <div className="absolute left-[8%] right-[8%] top-[18%] h-[10%] rounded-sm bg-night/80" />
          <div className="absolute inset-x-0 bottom-[3%] h-[6%] bg-night/85" />
          <div className="absolute inset-x-0 bottom-[9%] h-[0.6%] bg-rose-600" />
        </>
      )}
      {id === "neon" && (
        <>
          <div className="absolute inset-x-[5%] top-[22%] h-[57%] rounded-sm bg-[linear-gradient(160deg,#3b1a6e,#a2246a_60%,#ff8a3d)] ring-2 ring-pink shadow-[0_0_12px_rgba(255,46,136,0.8)]" />
          {bar("top-[9%] bg-white")}
          {bar("bottom-[11%] bg-pink/80 left-[30%] right-[30%] h-[3%]")}
        </>
      )}
      {id === "tela-cheia" && (
        <>
          {video}
          {bar("top-[13%] bg-white ring-2 ring-night")}
          {bar("top-[20%] bg-white ring-2 ring-night right-[28%]")}
        </>
      )}
    </div>
  );
}
