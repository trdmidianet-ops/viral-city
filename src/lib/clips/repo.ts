import { db, must } from "@/lib/db";

export type SourceKind = "channel" | "file" | "link";
export type Framing = "center" | "blur" | "split";
export type Language = "portuguese" | "english" | "spanish";
export type SourceStatus =
  | "queued"
  | "downloading"
  | "transcribing"
  | "analyzing"
  | "rendering"
  | "ready"
  | "failed";
export type ClipStatus = "pending" | "rendering" | "rendered" | "approved" | "failed";

export type Word = { text: string; start: number; end: number };

export type Source = {
  id: string;
  kind: SourceKind;
  account_id: string | null;
  youtube_video_id: string | null;
  source_url: string | null;
  upload_name: string | null;
  title: string;
  language: Language;
  framing: Framing;
  captions: boolean;
  use_logo: boolean;
  niche: string | null;
  reference_title: string | null;
  status: SourceStatus;
  progress: string | null;
  error: string | null;
  local_path: string | null;
  duration_seconds: number | null;
  transcript: Word[] | null;
  ai_used: boolean | null;
  created_at: string;
  updated_at: string;
};

export type Clip = {
  id: string;
  source_id: string;
  position: number;
  start_seconds: number;
  end_seconds: number;
  score: number;
  hook: string;
  reason: string;
  is_best: boolean;
  status: ClipStatus;
  error: string | null;
  local_path: string | null;
  video_id: string | null;
  created_at: string;
  updated_at: string;
};

const S = "vc_sources";
const C = "vc_clips";
const LIST_COLS =
  "id,kind,account_id,youtube_video_id,source_url,upload_name,title,language,framing,captions,use_logo,niche,reference_title,status,progress,error,local_path,duration_seconds,ai_used,created_at,updated_at";

const now = () => new Date().toISOString();

// ---------- fontes (vídeos longos) ----------
export type NewSource = Pick<
  Source,
  "kind" | "account_id" | "youtube_video_id" | "source_url" | "upload_name" | "title" | "language" | "framing" | "captions" | "use_logo" | "niche" | "reference_title"
> & { local_path?: string | null };

export async function createSource(input: NewSource): Promise<Source> {
  return must<Source>(await db().from(S).insert(input).select("*").single(), "Criar fonte");
}

export async function listSources(limit = 30): Promise<Source[]> {
  return must<Source[]>(
    await db().from(S).select(LIST_COLS).order("created_at", { ascending: false }).limit(limit),
    "Listar fontes",
  );
}

export async function getSource(id: string, withTranscript = false): Promise<Source | null> {
  return must<Source | null>(
    await db().from(S).select(withTranscript ? "*" : LIST_COLS).eq("id", id).maybeSingle(),
    "Buscar fonte",
  );
}

export async function updateSource(id: string, patch: Partial<Source>) {
  must(await db().from(S).update({ ...patch, updated_at: now() }).eq("id", id), "Atualizar fonte");
}

/** Pega a próxima fonte da fila de forma atômica. */
export async function claimNextSource(): Promise<Source | null> {
  const next = must<{ id: string }[]>(
    await db().from(S).select("id").eq("status", "queued").order("created_at").limit(1),
    "Fila de fontes",
  )[0];
  if (!next) return null;
  const rows = must<Source[]>(
    await db()
      .from(S)
      .update({ status: "downloading", error: null, updated_at: now() })
      .eq("id", next.id)
      .eq("status", "queued")
      .select("*"),
    "Pegar fonte",
  );
  return rows[0] ?? null;
}

export async function deleteSource(id: string) {
  must(await db().from(S).delete().eq("id", id), "Apagar fonte");
}

// ---------- cortes ----------
export type NewClip = Pick<Clip, "position" | "start_seconds" | "end_seconds" | "score" | "hook" | "reason" | "is_best">;

export async function replaceClips(sourceId: string, clips: NewClip[]) {
  must(await db().from(C).delete().eq("source_id", sourceId).neq("status", "approved"), "Limpar cortes");
  if (clips.length) must(await db().from(C).insert(clips.map((c) => ({ ...c, source_id: sourceId }))), "Salvar cortes");
}

export async function listClips(sourceId: string): Promise<Clip[]> {
  return must<Clip[]>(
    await db().from(C).select("*").eq("source_id", sourceId).order("score", { ascending: false }),
    "Listar cortes",
  );
}

export async function getClip(id: string): Promise<Clip | null> {
  return must<Clip | null>(await db().from(C).select("*").eq("id", id).maybeSingle(), "Buscar corte");
}

export async function updateClip(id: string, patch: Partial<Clip>) {
  must(await db().from(C).update({ ...patch, updated_at: now() }).eq("id", id), "Atualizar corte");
}

/** Próximo corte esperando renderização (novo ou editado). */
export async function claimNextClip(): Promise<Clip | null> {
  const next = must<{ id: string }[]>(
    await db().from(C).select("id").eq("status", "pending").order("updated_at").limit(1),
    "Fila de cortes",
  )[0];
  if (!next) return null;
  const rows = must<Clip[]>(
    await db()
      .from(C)
      .update({ status: "rendering", error: null, updated_at: now() })
      .eq("id", next.id)
      .eq("status", "pending")
      .select("*"),
    "Pegar corte",
  );
  return rows[0] ?? null;
}

/** Cortes/fontes travados (PC desligou no meio) voltam para a fila. */
export async function recoverStuckClips(olderThanMinutes = 30) {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000).toISOString();
  must(await db().from(C).update({ status: "pending" }).eq("status", "rendering").lt("updated_at", cutoff), "Recuperar cortes");
  must(
    await db()
      .from(S)
      .update({ status: "queued" })
      .in("status", ["downloading", "transcribing", "analyzing"])
      .lt("updated_at", cutoff),
    "Recuperar fontes",
  );
}
