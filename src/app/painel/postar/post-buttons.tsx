"use client";

import { Check, Copy, Download, Send } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Postar com um toque. No celular, abre a folha de compartilhar do sistema com o vídeo: a pessoa
 * escolhe YouTube, Instagram ou TikTok e o app abre com o vídeo carregado. A legenda vai copiada
 * antes, porque nem todo app aceita o texto junto. No PC (sem compartilhar arquivos), baixa o vídeo.
 */
export function PostButtons({ videoId, caption }: { videoId: string; caption: string }) {
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    try {
      const probe = new File([new Blob()], "teste.mp4", { type: "video/mp4" });
      setCanShareFiles(typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] }));
    } catch {
      setCanShareFiles(false);
    }
  }, []);

  async function copyCaption(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      return true;
    } catch {
      return false;
    }
  }

  async function share() {
    if (busy) return;
    setBusy(true);
    setNote("Preparando o vídeo…");
    try {
      await copyCaption();
      const link = await fetch(`/api/videos/${videoId}/video?link=1`, { cache: "no-store" });
      if (!link.ok) throw new Error("link");
      const { url } = (await link.json()) as { url: string };
      const res = await fetch(url);
      if (!res.ok) throw new Error("download");
      const file = new File([await res.blob()], "viral-city-corte.mp4", { type: "video/mp4" });
      setNote(null);
      await navigator.share({ files: [file], text: caption });
      setNote("Depois de postar, toque em “Já postei” para tirar da lista.");
    } catch (err) {
      // fechar a folha de compartilhar não é erro
      if (err instanceof DOMException && err.name === "AbortError") setNote(null);
      else setNote("Não deu para abrir o compartilhamento. Use “Baixar vídeo” e poste pelo app.");
    } finally {
      setBusy(false);
    }
  }

  const btn = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {canShareFiles && (
          <button type="button" onClick={share} disabled={busy} className={`btn-sunset ${btn} font-bold text-night disabled:opacity-60`}>
            <Send size={16} /> {busy ? "Abrindo…" : "Postar"}
          </button>
        )}
        <a
          href={`/api/videos/${videoId}/video?dl=1`}
          className={`${btn} ${canShareFiles ? "border border-line text-ink hover:bg-white/5" : "btn-sunset font-bold text-night"}`}
        >
          <Download size={16} /> Baixar vídeo
        </a>
        <button type="button" onClick={copyCaption} className={`${btn} border border-line text-ink hover:bg-white/5`}>
          {copied ? <Check size={16} className="text-cyan" /> : <Copy size={16} />} {copied ? "Legenda copiada" : "Copiar legenda"}
        </button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-xs text-muted">
        {note}
      </p>
    </div>
  );
}
