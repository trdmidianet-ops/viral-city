"use client";

import { useState } from "react";

interface VideoInfo {
  title: string;
  thumbnail: string | null;
  duration: number | null;
  uploader: string | null;
  platform: string;
  view_count: number | null;
  description: string | null;
}

interface ImportarVideoProps {
  /** Chamado quando o import termina com sucesso. Recebe o file_id retornado pela API. */
  onImported?: (fileId: string, info: VideoInfo) => void;
}

const PLATFORM_LABEL: Record<string, string> = {
  "youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "instagram.com": "Instagram",
  "tiktok.com": "TikTok",
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K views`;
  return `${n} views`;
}

export function ImportarVideo({ onImported }: ImportarVideoProps) {
  const [url, setUrl] = useState("");
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);

  async function handleVerificar() {
    setError(null);
    setInfo(null);
    setImported(false);
    if (!url.trim()) return;
    setLoadingInfo(true);
    try {
      const res = await fetch("/api/download/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao buscar informações.");
      setInfo(data as VideoInfo);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setLoadingInfo(false);
    }
  }

  async function handleImportar() {
    if (!info) return;
    setError(null);
    setLoadingImport(true);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao importar vídeo.");
      setImported(true);
      onImported?.(data.file_id as string, info);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setLoadingImport(false);
    }
  }

  return (
    <div
      style={{
        background: "rgba(13,0,30,0.85)",
        border: "1px solid rgba(168,85,247,0.35)",
        borderRadius: "12px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        maxWidth: "520px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "20px" }}>⬇️</span>
        <span
          style={{
            fontWeight: 700,
            fontSize: "15px",
            color: "#e2d9f3",
            letterSpacing: "0.02em",
          }}
        >
          Importar vídeo externo
        </span>
      </div>

      {/* Input + botão Verificar */}
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setInfo(null); setError(null); setImported(false); }}
          onKeyDown={(e) => e.key === "Enter" && handleVerificar()}
          placeholder="Cole o link do YouTube, Instagram ou TikTok"
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(168,85,247,0.3)",
            borderRadius: "8px",
            padding: "10px 14px",
            color: "#e2d9f3",
            fontSize: "13px",
            outline: "none",
          }}
        />
        <button
          onClick={handleVerificar}
          disabled={loadingInfo || !url.trim()}
          style={{
            padding: "10px 16px",
            background: loadingInfo ? "rgba(168,85,247,0.2)" : "rgba(168,85,247,0.15)",
            border: "1px solid rgba(168,85,247,0.5)",
            borderRadius: "8px",
            color: "#c084fc",
            fontWeight: 600,
            fontSize: "13px",
            cursor: loadingInfo || !url.trim() ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
            transition: "all 0.15s",
          }}
        >
          {loadingInfo ? "A verificar…" : "Verificar"}
        </button>
      </div>

      {/* Erro */}
      {error && (
        <p
          style={{
            margin: 0,
            padding: "10px 14px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "8px",
            color: "#fca5a5",
            fontSize: "13px",
          }}
        >
          {error}
        </p>
      )}

      {/* Preview do vídeo */}
      {info && !imported && (
        <div
          style={{
            display: "flex",
            gap: "14px",
            padding: "14px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(74,222,128,0.2)",
            borderRadius: "10px",
          }}
        >
          {info.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={info.thumbnail}
              alt={info.title}
              style={{ width: "100px", height: "60px", objectFit: "cover", borderRadius: "6px", flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
            <p
              style={{
                margin: 0,
                fontWeight: 600,
                fontSize: "13px",
                color: "#e2d9f3",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={info.title}
            >
              {info.title}
            </p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {info.uploader && (
                <span style={{ fontSize: "12px", color: "#a78bfa" }}>{info.uploader}</span>
              )}
              <span
                style={{
                  fontSize: "11px",
                  padding: "1px 8px",
                  background: "rgba(168,85,247,0.15)",
                  border: "1px solid rgba(168,85,247,0.3)",
                  borderRadius: "4px",
                  color: "#c084fc",
                }}
              >
                {PLATFORM_LABEL[info.platform] ?? info.platform}
              </span>
              {info.duration && (
                <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                  {formatDuration(info.duration)}
                </span>
              )}
              {info.view_count && (
                <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                  {formatViews(info.view_count)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sucesso */}
      {imported && (
        <p
          style={{
            margin: 0,
            padding: "10px 14px",
            background: "rgba(74,222,128,0.1)",
            border: "1px solid rgba(74,222,128,0.3)",
            borderRadius: "8px",
            color: "#86efac",
            fontSize: "13px",
          }}
        >
          ✓ Vídeo importado com sucesso!
        </p>
      )}

      {/* Botão Importar */}
      {info && !imported && (
        <button
          onClick={handleImportar}
          disabled={loadingImport}
          style={{
            padding: "11px 20px",
            background: loadingImport
              ? "rgba(74,222,128,0.1)"
              : "linear-gradient(135deg,rgba(74,222,128,0.2),rgba(168,85,247,0.2))",
            border: "1px solid rgba(74,222,128,0.5)",
            borderRadius: "8px",
            color: "#86efac",
            fontWeight: 700,
            fontSize: "14px",
            cursor: loadingImport ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
        >
          {loadingImport ? "A importar… (pode demorar)" : "⬇ Importar vídeo"}
        </button>
      )}
    </div>
  );
}
