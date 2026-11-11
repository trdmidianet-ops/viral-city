"use client";

import { useActionState, useState } from "react";
import { Clapperboard, FileVideo, Layers, Link2, Sparkles } from "lucide-react";
import { COINS_PER_VARIATION, MAX_VARIATIONS, formatCoins } from "@/lib/coins/pricing";
import { TEMPLATES, usesCta, type TemplateId } from "@/lib/scale/templates";
import { createScaleAction, type ScaleFormState } from "./actions";
import { SAMPLE_PROFILE, TemplateThumb } from "./template-thumb";
import { useUpload } from "../use-upload";

type ClipOption = { id: string; label: string; score: number };
type Account = { id: string; name: string; label: string; handle: string; avatarUrl: string | null };

type Props = {
  clips: ClipOption[];
  accounts: Account[];
  localFiles: boolean;
  initial: { clipId: string; template: TemplateId | ""; count: number };
};

const field = "mt-1 w-full rounded-lg border border-line bg-night/60 px-3 py-2.5 text-sm outline-none focus:border-pink";

export function ScaleForm({ clips, accounts, localFiles, initial }: Props) {
  const [state, action, pending] = useActionState<ScaleFormState, FormData>(createScaleAction, {});
  const [base, setBase] = useState<"clip" | "file" | "url">(clips.length || !localFiles ? "clip" : "file");
  const [count, setCount] = useState(initial.count);
  const [selected, setSelected] = useState<TemplateId[]>(initial.template ? [initial.template] : ["perfil", "perfil-cta", "tweet-escuro"]);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const { upload, progress, error: uploadError, send } = useUpload();

  const toggle = (id: TemplateId) =>
    setSelected((cur) => (cur.includes(id) ? (cur.length > 1 ? cur.filter((t) => t !== id) : cur) : [...cur, id]));
  const account = accounts.find((a) => a.id === accountId);
  const [name, setName] = useState(account?.name ?? SAMPLE_PROFILE.name);
  const [handle, setHandle] = useState(account?.handle ?? SAMPLE_PROFILE.handle);
  const [verified, setVerified] = useState(true);
  const [headlines, setHeadlines] = useState("");
  const [cta, setCta] = useState("se vocà curte gta 6, precisa seguir essa página");
  const [previewIndex, setPreviewIndex] = useState(0);
  const preview = selected[Math.min(previewIndex, selected.length - 1)] ?? "perfil";
  const firstHeadline = headlines.split(/\r?\n/).map((h) => h.trim()).find(Boolean);

  function chooseAccount(id: string) {
    setAccountId(id);
    const a = accounts.find((x) => x.id === id);
    setName(a?.name ?? SAMPLE_PROFILE.name);
    setHandle(a?.handle ?? SAMPLE_PROFILE.handle);
  }

  return (
    <form action={action} className="glass grid gap-6 rounded-2xl p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_220px]">
      <input type="hidden" name="base" value={base} />
      <div className="min-w-0 space-y-6">

      {/* 1. vídeo base */}
      <fieldset>
        <legend className="text-sm font-semibold">1. Vídeo base</legend>
        <div role="tablist" aria-label="Vídeo base" className="mt-2 grid grid-cols-3 gap-2">
          {[
            { id: "clip" as const, label: "Corte pronto", icon: Clapperboard },
            { id: "file" as const, label: "Clipe do PC", icon: FileVideo },
            { id: "url" as const, label: "Link do YouTube", icon: Link2 },
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
            <p className="mt-3 text-sm text-muted">Vocà ainda não tem cortes renderizados. Use &quot;Link do YouTube&quot; para gerar ou suba um clipe do PC.</p>
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

        {base === "url" && (
          <div className="mt-3 text-sm">
            <label className="block">
              <span className="text-muted">Link do vídeo (YouTube, Drive, qualquer URL direta)</span>
              <input
                name="url"
                type="url"
                required={base === "url"}
                placeholder="https://youtube.com/watch?v=… ou outro link"
                className={field}
              />
            </label>
            <p className="mt-2 text-xs text-muted">O vídeo será baixado, cortado pela IA e os clipes aparecerão aqui prontos para Scale.</p>
          </div>
        )}
      </fieldset>

      {/* 2. templates */}
      <fieldset>
        <legend className="text-sm font-semibold">2. Templates</legend>
        <p className="text-xs text-muted">Escolha um ou mais; as versões se revezam entre eles.</p>
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-3 2xl:grid-cols-6">
          {TEMPLATES.map((t) => {
            const on = selected.includes(t.id);
            return (
              <label key={t.id} className={`cursor-pointer rounded-xl border p-1.5 text-center transition ${on ? "border-pink bg-pink/10" : "border-line hover:border-white/20"}`}>
                <input
                  type="checkbox"
                  name="templates"
                  value={t.id}
                  checked={on}
                  onChange={() => {
                    toggle(t.id);
                    setPreviewIndex(Math.max(0, selected.indexOf(t.id)));
                  }}
                  className="sr-only"
                />
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
          <textarea
            name="headlines"
            rows={4}
            value={headlines}
            onChange={(e) => setHeadlines(e.target.value)}
            placeholder={"viu tudo do gta 6 ainda?\nninguém percebeu esse detalhe no trailer"}
            className={field}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="use_ai" defaultChecked className="accent-pink" />
          <Sparkles size={14} className="text-sun" /> A IA completa as manchetes que faltarem
        </label>
      </fieldset>

      {/* 4. perfil que aparece no vídeo */}
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold sm:col-span-2">4. Perfil no vídeo</legend>
        <label className="block text-sm">
          <span className="text-muted">Conta (foto, nome e destino da postagem)</span>
          <select name="account" value={accountId} onChange={(e) => chooseAccount(e.target.value)} className={field}>
            <option value="">Conta de exemplo (Viral City)</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-muted">Nome da página</span>
          <input name="profile_name" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="Portal GTA 6" className={field} />
        </label>
        <label className="block text-sm">
          <span className="text-muted">@ no vídeo</span>
          <input name="handle" maxLength={40} value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@seucanal" className={field} />
        </label>
        <label className="flex items-center gap-2 self-end pb-3 text-sm">
          <input type="checkbox" name="verified" checked={verified} onChange={(e) => setVerified(e.target.checked)} className="accent-pink" /> Selo azul de verificado
        </label>
        {selected.some(usesCta) && (
          <label className="block text-sm sm:col-span-2">
            <span className="text-muted">Chamada de baixo (template Página + chamada)</span>
            <input name="cta" maxLength={90} value={cta} onChange={(e) => setCta(e.target.value)} className={field} />
          </label>
        )}
      </fieldset>

      {/* 5. quantidade */}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">5. Quantidade</legend>
        <label className="block max-w-[10rem] text-sm">
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
      </fieldset>

      {state.error && <p className="text-sm text-pink">{state.error}</p>}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending || progress !== null || (base === "file" && !upload) || (base === "clip" && !clips.length)}
          className="btn-sunset flex items-center justify-center gap-2 rounded-full px-8 py-3 font-semibold text-white disabled:opacity-50"
        >
          <Layers size={18} /> {pending ? "Enviando…" : base === "url" ? "Gerar Cortes" : `Gerar ${count} ${count === 1 ? "versão" : "versões"}`}
        </button>
        <span className="text-sm text-muted">
          Custa <span className="num font-semibold text-sun">{formatCoins(count * COINS_PER_VARIATION)}</span> CityCoins · as que falharem voltam para a carteira
        </span>
      </div>
      </div>

      {/* prévia ao vivo com o perfil escolhido (ou a conta de exemplo) */}
      <aside className="order-first lg:order-none">
        <div className="lg:sticky lg:top-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Prévia</p>
          <TemplateThumb
            id={preview}
            className="mx-auto w-[200px] lg:w-full"
            profile={{ name, handle, verified, avatarUrl: account?.avatarUrl }}
            headline={firstHeadline || "viu tudo do gta 6 ainda?"}
            cta={cta}
          />
          {selected.length > 1 && (
            <div className="mt-2 flex flex-wrap justify-center gap-1">
              {selected.map((t, i) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPreviewIndex(i)}
                  className={`rounded-full px-2 py-0.5 text-[10px] ${t === preview ? "bg-pink/25 text-ink" : "text-muted hover:text-ink"}`}
                >
                  {TEMPLATES.find((x) => x.id === t)?.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
    </form>
  );
}
