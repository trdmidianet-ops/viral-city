"use client";

import { useActionState, useState } from "react";
import { Clapperboard, FileVideo, Layers, Sparkles } from "lucide-react";
import { COINS_PER_VARIATION, MAX_VARIATIONS, formatCoins } from "@/lib/coins/pricing";
import { TEMPLATES, type TemplateId } from "@/lib/scale/templates";
import { createScaleAction, type ScaleFormState } from "./actions";
import { TemplateThumb } from "./template-thumb";
import { useUpload } from "../use-upload";

type ClipOption = { id: string; label: string; score: number };
type Account = { id: string; name: string; handle: string };

type Props = {
  clips: ClipOption[];
  accounts: Account[];
  localFiles: boolean;
  initial: { clipId: string; template: TemplateId | ""; count: number };
};

const field = "mt-1 w-full rounded-lg border border-line bg-night/60 px-3 py-2.5 text-sm outline-none focus:border-pink";

export function ScaleForm({ clips, accounts, localFiles, initial }: Props) {
  const [state, action, pending] = useActionState<ScaleFormState, FormData>(createScaleAction, {});
  const [base, setBase] = useState<"clip" | "file">(clips.length || !localFiles ? "clip" : "file");
  const [count, setCount] = useState(initial.count);
  const [selected, setSelected] = useState<TemplateId[]>(initial.template ? [initial.template] : ["manchete", "caixa", "urgente"]);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const { upload, progress, error: uploadError, send } = useUpload();

  const toggle = (id: TemplateId) =>
    setSelected((cur) => (cur.includes(id) ? (cur.length > 1 ? cur.filter((t) => t !== id) : cur) : [...cur, id]));
  const handle = accounts.find((a) => a.id === accountId)?.handle ?? "";

  return (
    <form action={action} className="glass space-y-6 rounded-2xl p-5 sm:p-6">
      <input type="hidden" name="base" value={base} />

      {/* 1. vídeo base */}
      <fieldset>
        <legend className="text-sm font-semibold">1. Vídeo base</legend>
        <div role="tablist" aria-label="Vídeo base" className="mt-2 grid grid-cols-2 gap-2">
          {[
            { id: "clip" as const, label: "Corte pronto", icon: Clapperboard },
            { id: "file" as const, label: "Clipe do PC", icon: FileVideo },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={base === id}
              onClick={() => setBase(id)}
              className={`flex items-center justify-center gap-2 rounded-xl border px-2 py-3 text-sm ${
                base === id ? "border-pink bg-pink/10 text-ink" : "border-line text-muted hover:text-ink"
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {base === "clip" &&
          (clips.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Você ainda não tem cortes renderizados. Gere em Cortes ou suba um clipe do PC.</p>
          ) : (
            <label className="mt-3 block text-sm">
              <span className="text-muted">Corte</span>
              <select name="clip" defaultValue={initial.clipId || clips[0].id} className={field}>
                {clips.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} · nota {c.score}
                  </option>
                ))}
              </select>
            </label>
          ))}

        {base === "file" &&
          (localFiles ? (
            <div className="mt-3 text-sm">
              <label className="block">
                <span className="text-muted">Clipe curto (gameplay, meme, trecho seu) — até 3 min são usados</span>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-matroska,video/webm,.mkv,.m4v"
                  onChange={(e) => e.target.files?.[0] && send(e.target.files[0])}
                  className={`${field} file:mr-3 file:rounded-md file:border-0 file:bg-pink/20 file:px-3 file:py-1 file:text-ink`}
                />
              </label>
              {progress !== null && <p className="mt-2 text-xs text-sun">Enviando… {progress}%</p>}
              {upload && <p className="mt-2 text-xs text-cyan">✓ {upload.name} enviado</p>}
              {uploadError && <p className="mt-2 text-xs text-pink">{uploadError}</p>}
              <input type="hidden" name="uploadId" value={upload?.id ?? ""} />
              <input type="hidden" name="uploadName" value={upload?.name ?? ""} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">O envio de arquivo funciona só no painel aberto no seu PC (localhost:3000).</p>
          ))}
      </fieldset>

      {/* 2. templates */}
      <fieldset>
        <legend className="text-sm font-semibold">2. Templates</legend>
        <p className="text-xs text-muted">Escolha um ou mais; as versões se revezam entre eles.</p>
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {TEMPLATES.map((t) => {
            const on = selected.includes(t.id);
            return (
              <label key={t.id} className={`cursor-pointer rounded-xl border p-1.5 text-center transition ${on ? "border-pink bg-pink/10" : "border-line hover:border-white/20"}`}>
                <input type="checkbox" name="templates" value={t.id} checked={on} onChange={() => toggle(t.id)} className="sr-only" />
                <TemplateThumb id={t.id} />
                <span className="mt-1.5 block text-[11px] leading-tight">{t.name}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* 3. manchetes */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">3. Manchetes</legend>
        <label className="block text-sm">
          <span className="text-muted">Assunto do vídeo (a IA usa para escrever as manchetes)</span>
          <input name="topic" maxLength={200} placeholder="Ex.: novo trailer de GTA 6 mostra a cidade inteira" className={field} />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Suas manchetes (uma por linha, opcional)</span>
          <textarea name="headlines" rows={4} placeholder={"Ninguém viu esse detalhe no trailer\nO mapa é 2x maior que o do GTA 5"} className={field} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="use_ai" defaultChecked className="accent-pink" />
          <Sparkles size={14} className="text-sun" /> A IA completa as manchetes que faltarem
        </label>
      </fieldset>

      {/* 4. quantidade e destino */}
      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold sm:col-span-3">4. Quantidade e destino</legend>
        <label className="block text-sm">
          <span className="text-muted">Versões</span>
          <input
            name="count"
            type="number"
            min={1}
            max={MAX_VARIATIONS}
            value={count}
            onChange={(e) => setCount(Math.min(MAX_VARIATIONS, Math.max(1, Number(e.target.value) || 1)))}
            className={field}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Conta de destino</span>
          <select name="account" value={accountId} onChange={(e) => setAccountId(e.target.value)} className={field}>
            <option value="">Nenhuma por enquanto</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-muted">Seu @ no vídeo</span>
          <input key={accountId} name="handle" maxLength={40} defaultValue={handle} placeholder="@seucanal" className={field} />
        </label>
      </fieldset>

      {state.error && <p className="text-sm text-pink">{state.error}</p>}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending || progress !== null || (base === "file" && !upload) || (base === "clip" && !clips.length)}
          className="btn-sunset flex items-center justify-center gap-2 rounded-full px-8 py-3 font-semibold text-white disabled:opacity-50"
        >
          <Layers size={18} /> {pending ? "Enviando…" : `Gerar ${count} ${count === 1 ? "versão" : "versões"}`}
        </button>
        <span className="text-sm text-muted">
          Custa <span className="num font-semibold text-sun">{formatCoins(count * COINS_PER_VARIATION)}</span> CityCoins · as que falharem voltam para a carteira
        </span>
      </div>
    </form>
  );
}
