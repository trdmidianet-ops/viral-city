"use client";

import { useActionState, useState } from "react";
import { Download, FileVideo, Scissors, Tv } from "lucide-react";
import { createSourceAction, type FormState } from "./actions";
import { useUpload } from "../use-upload";

type Account = { id: string; name: string };
type ChannelVideo = { id: string; title: string; thumbnail: string };

type Props = {
  accounts: Account[];
  uploads: Record<string, ChannelVideo[]>;
  niches: { id: string; label: string }[];
  defaults: { niche: string; referenceTitle: string };
  localFiles: boolean;
};

const field = "mt-1 w-full rounded-lg border border-line bg-night/60 px-3 py-2.5 text-sm outline-none focus:border-pink";

const allKinds = [
  { id: "channel", label: "Meu canal",    icon: Tv,        local: false },
  { id: "file",    label: "Arquivo do PC", icon: FileVideo, local: true  },
  { id: "link",    label: "Download",      icon: Download,  local: false },
] as const;

type KindId = (typeof allKinds)[number]["id"];

const framings = [
  { id: "blur",   label: "Fundo desfocado", hint: "Vídeo inteiro no meio, nunca corta ninguém" },
  { id: "center", label: "Cortar no centro", hint: "Tela cheia, mais imersivo" },
  { id: "split",  label: "Dividido",         hint: "Esquerda em cima, direita embaixo (podcast a dois)" },
] as const;

export function SourceForm({ accounts, uploads, niches, defaults, localFiles }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(createSourceAction, {});
  const [kind, setKind] = useState<KindId>(accounts.length ? "channel" : "link");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const { upload, progress, error: uploadError, send: sendFile } = useUpload();

  const videos = uploads[accountId] ?? [];

  // Filtra abas: local-only só aparecem se localFiles=true
  const kinds = allKinds.filter((k) => !k.local || localFiles);

  return (
    <form action={action} className="glass space-y-5 rounded-2xl p-5 sm:p-6">
      <input type="hidden" name="kind" value={kind} />

      <div role="tablist" aria-label="Origem do vídeo" className={`grid gap-2 grid-cols-${kinds.length}`}>
        {kinds.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={kind === id}
            onClick={() => setKind(id)}
            className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs sm:flex-row sm:justify-center sm:text-sm ${
              kind === id ? "border-pink bg-pink/10 text-ink" : "border-line text-muted hover:text-ink"
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {kind === "channel" &&
        (accounts.length === 0 ? (
          <p className="text-sm text-muted">Conecte um canal do YouTube em Contas para cortar seus vídeos.</p>
        ) : (
          <>
            <label className="block text-sm">
              <span className="text-muted">Canal</span>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={field}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend className="text-sm text-muted">Escolha o vídeo longo</legend>
              {videos.length === 0 ? (
                <p className="mt-2 text-sm text-muted">Nenhum vídeo encontrado nesse canal.</p>
              ) : (
                <div className="mt-2 grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {videos.map((v) => (
                    <label key={v.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-line p-2 has-[:checked]:border-pink has-[:checked]:bg-pink/10">
                      <input type="radio" name="video" value={v.id} required className="sr-only" />
                      {/* eslint-disable-next-line @next/next/no-img-element -- miniatura do YouTube */}
                      <img src={v.thumbnail} alt="" className="h-12 w-20 shrink-0 rounded object-cover" />
                      <span className="line-clamp-2 text-xs">{v.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          </>
        ))}

      {kind === "file" && (
        <div className="text-sm">
          <label className="block">
            <span className="text-muted">Vídeo do seu PC (MP4, MOV, MKV ou WEBM)</span>
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/x-matroska,video/webm,.mkv,.m4v"
              onChange={(e) => e.target.files?.[0] && sendFile(e.target.files[0])}
              className={`${field} file:mr-3 file:rounded-md file:border-0 file:bg-pink/20 file:px-3 file:py-1 file:text-ink`}
            />
          </label>
          {progress !== null && <p className="mt-2 text-xs text-sun">Enviando… {progress}%</p>}
          {upload && <p className="mt-2 text-xs text-cyan">✓ {upload.name} enviado</p>}
          {uploadError && <p className="mt-2 text-xs text-pink">{uploadError}</p>}
          <input type="hidden" name="uploadId" value={upload?.id ?? ""} />
          <input type="hidden" name="uploadName" value={upload?.name ?? ""} />
        </div>
      )}

      {kind === "link" && (
        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="text-muted">Link do vídeo (YouTube, Google Drive, Dropbox ou MP4 direto)</span>
            <input name="url" type="url" required placeholder="https://youtube.com/watch?v=… ou drive.google.com/…" className={field} />
          </label>
          <label className="block">
            <span className="text-muted">Nome do vídeo (opcional)</span>
            <input name="title" maxLength={120} className={field} />
          </label>
        </div>
      )}

      {kind !== "channel" && accounts.length > 0 && (
        <label className="block text-sm">
          <span className="text-muted">Canal de destino (logo e postagem)</span>
          <select name="account" defaultValue={accounts[0].id} className={field}>
            <option value="">Nenhum por enquanto</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {kind === "channel" && <input type="hidden" name="account" value={accountId} />}

      <fieldset>
        <legend className="text-sm text-muted">Enquadramento vertical</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {framings.map((f, i) => (
            <label key={f.id} className="cursor-pointer rounded-xl border border-line p-3 has-[:checked]:border-pink has-[:checked]:bg-pink/10">
              <input type="radio" name="framing" value={f.id} defaultChecked={i === 0} className="sr-only" />
              <span className="block text-sm font-medium">{f.label}</span>
              <span className="block text-xs text-muted">{f.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-muted">Idioma da fala</span>
          <select name="language" defaultValue="portuguese" className={field}>
            <option value="portuguese">Português</option>
            <option value="english">Inglês</option>
            <option value="spanish">Espanhol</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-muted">Nicho (a IA se inspira nos virais dele)</span>
          <select name="niche" defaultValue={defaults.niche} className={field}>
            <option value="">Nenhum</option>
            {niches.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {defaults.referenceTitle && (
        <p className="rounded-lg border border-line bg-night/40 p-3 text-xs text-muted">
          Viral de referência para os ganchos: <span className="text-ink">{defaults.referenceTitle}</span>
          <input type="hidden" name="reference_title" value={defaults.referenceTitle} />
        </p>
      )}

      <div className="flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="captions" defaultChecked className="accent-pink" /> Legendas automáticas
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="use_logo" defaultChecked className="accent-pink" /> Logo do canal
        </label>
      </div>

      {state.error && <p className="text-sm text-pink">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || progress !== null || (kind === "file" && !upload)}
        className="btn-sunset flex w-full items-center justify-center gap-2 rounded-full py-3 font-semibold text-white disabled:opacity-50 sm:w-auto sm:px-8"
      >
        <Scissors size={18} /> {pending ? "Enviando…" : "Gerar 5 cortes"}
      </button>
    </form>
  );
}
