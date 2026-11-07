"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Minus, Pause, Play, Plus, Save, Scissors } from "lucide-react";
import { SPEEDS, editedLength } from "@/lib/clips/edit";
import { CAPTION_COLORS, type CaptionColor, type HookPosition } from "@/lib/video/captions";
import { saveClipEditAction, type EditState } from "../../cortes/actions";

type Word = { text: string; start: number; end: number };

type Props = {
  clip: {
    id: string;
    start: number;
    end: number;
    hook: string;
    hookPosition: HookPosition;
    framing: "center" | "blur" | "split";
    captions: boolean;
    captionColor: CaptionColor;
    speed: number;
    locked: boolean;
  };
  source: { id: string; duration: number; playable: boolean };
  words: Word[];
};

const field = "rounded-lg border border-line bg-night/60 px-3 py-2 text-sm outline-none focus:border-pink";
const time = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function ClipEditor({ clip, source, words }: Props) {
  const [state, action, pending] = useActionState<EditState, FormData>(saveClipEditAction, {});
  const [start, setStart] = useState(clip.start);
  const [end, setEnd] = useState(clip.end);
  const [pick, setPick] = useState<"start" | "end">("start");
  const [speed, setSpeed] = useState(clip.speed);
  const [color, setColor] = useState<CaptionColor>(clip.captionColor);
  const [playing, setPlaying] = useState(false);
  const player = useRef<HTMLVideoElement>(null);
  const max = source.duration || clip.end + 60;

  // toca só o trecho escolhido: para sozinho no fim
  useEffect(() => {
    const v = player.current;
    if (!v) return;
    const onTime = () => {
      if (v.currentTime >= end) {
        v.pause();
        setPlaying(false);
      }
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [end]);

  function togglePlay() {
    const v = player.current;
    if (!v) return;
    if (playing) {
      v.pause();
      setPlaying(false);
      return;
    }
    if (v.currentTime < start || v.currentTime >= end) v.currentTime = start;
    v.playbackRate = speed;
    void v.play();
    setPlaying(true);
  }

  function clickWord(w: Word) {
    if (clip.locked) return;
    if (pick === "start") {
      setStart(+w.start.toFixed(2));
      if (end <= w.start + 1) setEnd(clamp(w.start + 15, 0, max));
      setPick("end");
    } else {
      if (w.end <= start) {
        setStart(+w.start.toFixed(2));
        return;
      }
      setEnd(+w.end.toFixed(2));
      setPick("start");
    }
    if (player.current) player.current.currentTime = w.start;
  }

  const nudge = (which: "start" | "end", delta: number) =>
    which === "start" ? setStart((s) => clamp(+(s + delta).toFixed(2), 0, end - 1)) : setEnd((e) => clamp(+(e + delta).toFixed(2), start + 1, max));

  const length = editedLength(start, end, speed);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="id" value={clip.id} />
      <input type="hidden" name="start" value={start} />
      <input type="hidden" name="end" value={end} />
      <input type="hidden" name="speed" value={speed} />
      <input type="hidden" name="caption_color" value={color} />

      {/* trecho */}
      <section className="glass rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <Scissors size={16} className="text-pink" /> Trecho
          </h2>
          <span className="num font-mono text-xs text-muted">
            {time(start)} → {time(end)} · <span className="text-sun">{length.toFixed(1)}s</span> no Short
          </span>
        </div>

        {source.playable ? (
          <video ref={player} src={`/api/sources/${source.id}/video`} preload="metadata" playsInline className="mt-3 aspect-video w-full rounded-xl bg-night"
            onPause={() => setPlaying(false)}
            // mostra o primeiro quadro do trecho em vez de uma tela preta
            onLoadedMetadata={(e) => (e.currentTarget.currentTime = start)}
          />
        ) : (
          <p className="mt-3 rounded-xl bg-night/60 p-4 text-xs text-muted">O vídeo longo toca aqui no painel aberto no seu PC. Mesmo sem ele, dá para cortar pelo texto abaixo.</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {source.playable && (
            <button type="button" onClick={togglePlay} className="flex items-center gap-1 rounded-full bg-pink/20 px-3 py-1.5 text-ink hover:bg-pink/30">
              {playing ? <Pause size={13} /> : <Play size={13} />} {playing ? "Pausar" : "Ouvir o trecho"}
            </button>
          )}
          {(["start", "end"] as const).map((which) => (
            <span key={which} className="flex items-center gap-1 rounded-full border border-line px-1.5 py-1">
              <span className="px-1 text-muted">{which === "start" ? "Início" : "Fim"}</span>
              <button type="button" disabled={clip.locked} aria-label={`${which === "start" ? "Início" : "Fim"} meio segundo antes`} onClick={() => nudge(which, -0.5)} className="rounded-full p-1 hover:bg-white/10 disabled:opacity-40">
                <Minus size={12} />
              </button>
              <span className="num w-12 text-center font-mono">{time(which === "start" ? start : end)}</span>
              <button type="button" disabled={clip.locked} aria-label={`${which === "start" ? "Início" : "Fim"} meio segundo depois`} onClick={() => nudge(which, 0.5)} className="rounded-full p-1 hover:bg-white/10 disabled:opacity-40">
                <Plus size={12} />
              </button>
            </span>
          ))}
          {source.playable && !clip.locked && (
            <>
              <button type="button" onClick={() => player.current && setStart(clamp(+player.current.currentTime.toFixed(2), 0, end - 1))} className="rounded-full border border-line px-3 py-1.5 text-muted hover:text-ink">
                Início = agora
              </button>
              <button type="button" onClick={() => player.current && setEnd(clamp(+player.current.currentTime.toFixed(2), start + 1, max))} className="rounded-full border border-line px-3 py-1.5 text-muted hover:text-ink">
                Fim = agora
              </button>
            </>
          )}
        </div>

        {words.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-muted">
              Corte pelo texto: clique na palavra onde o corte {pick === "start" ? <b className="text-cyan">começa</b> : <b className="text-pink">termina</b>}.
            </p>
            <div className="mt-2 max-h-56 overflow-y-auto rounded-xl bg-night/60 p-3 text-sm leading-7">
              {words.map((w, i) => {
                const inside = w.start >= start - 0.05 && w.end <= end + 0.3;
                const edge = Math.abs(w.start - start) < 0.06 || Math.abs(w.end - end) < 0.06;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => clickWord(w)}
                    className={`mx-[1px] rounded px-0.5 transition ${inside ? "bg-pink/25 text-ink" : "text-muted/70 hover:text-ink"} ${edge ? "ring-1 ring-sun" : ""}`}
                  >
                    {w.text}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* texto e estilo */}
      <section className="glass grid gap-4 rounded-2xl p-4 sm:grid-cols-2 sm:p-5">
        <label className="text-xs text-muted sm:col-span-2">
          Texto do gancho
          <input name="hook" defaultValue={clip.hook} maxLength={80} disabled={clip.locked} placeholder="Texto que fica na tela (vazio = sem texto)" className={`${field} mt-1 block w-full`} />
        </label>
        <label className="text-xs text-muted">
          Posição do texto
          <select name="hook_position" defaultValue={clip.hookPosition} disabled={clip.locked} className={`${field} mt-1 block w-full`}>
            <option value="top">No topo</option>
            <option value="middle">No meio</option>
            <option value="none">Sem texto</option>
          </select>
        </label>
        <label className="text-xs text-muted">
          Enquadramento
          <select name="framing" defaultValue={clip.framing} disabled={clip.locked} className={`${field} mt-1 block w-full`}>
            <option value="blur">Fundo desfocado</option>
            <option value="center">Cortar no centro</option>
            <option value="split">Dividido</option>
          </select>
        </label>
        <div className="text-xs text-muted">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="captions" defaultChecked={clip.captions} disabled={clip.locked} className="accent-pink" /> Legendas palavra por palavra
          </label>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Cor da palavra falada">
            {(Object.keys(CAPTION_COLORS) as CaptionColor[]).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={CAPTION_COLORS[c].label}
                title={CAPTION_COLORS[c].label}
                disabled={clip.locked}
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-full ring-offset-2 ring-offset-night transition ${color === c ? "ring-2 ring-ink" : "ring-1 ring-white/20"}`}
                style={{ background: CAPTION_COLORS[c].hex }}
              />
            ))}
          </div>
        </div>
        <div className="text-xs text-muted">
          Velocidade
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={clip.locked}
                onClick={() => setSpeed(s)}
                className={`rounded-full border px-3 py-1.5 font-mono ${speed === s ? "border-pink bg-pink/15 text-ink" : "border-line hover:text-ink"}`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </section>

      {state.error && <p className="text-sm text-pink">{state.error}</p>}
      {state.saved && !pending && <p className="text-sm text-cyan">Salvo! O corte está sendo renderizado de novo pelo worker.</p>}

      {!clip.locked && (
        <button disabled={pending} className="btn-sunset flex items-center gap-2 rounded-full px-8 py-3 font-semibold text-white disabled:opacity-50">
          <Save size={18} /> {pending ? "Salvando…" : "Salvar e renderizar"}
        </button>
      )}
    </form>
  );
}
