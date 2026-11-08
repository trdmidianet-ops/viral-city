import { insertRow, query, queryOne, updateRows } from "@/lib/db";
import type { CaptionColor, HookPosition } from "@/lib/video/captions";

export type SourceKind = "channel" | "file" | "link" | "import";
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
  user_id: string;
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
  charged_coins: number | null;
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
  /** Ajustes do editor (null = usa o do vídeo longo). */
  framing: Framing | null;
  captions: boolean | null;
  caption_color: CaptionColor;
  speed: number;
  hook_position: HookPosition;
  created_at: string;
  updated_at: string;
};

const LIST_COLS =
  "id, user_id, kind, account_id, youtube_video_id, source_url, upload_name, title, language, framing, captions, use_logo, niche, reference_title, status, progress, error, local_path, duration_seconds, ai_used, charged_coins, created_at, updated_at";

// ---------- fontes (vídeos longos) ----------
export type NewSource = Pick<
  Source,
  "kind" | "account_id" | "youtube_video_id" | "source_url" | "upload_name" | "title" | "language" | "framing" | "captions" | "use_logo" | "niche" | "reference_title"
> & { local_path?: string | null };

export async function createSource(userId: string, input: NewSource): Promise<Source> {
  return insertRow<Source>("vc_sources", { ...input, user_id: userId });
}

export async function listSources(userId: string, limit = 30): Promise<Source[]> {
  return query<Source>(`select ${LIST_COLS} from vc_sources where user_id = $1 order by created_at desc limit $2`, [userId, limit]);
}

/** Fonte do usuário (painel). */
export async function getOwnedSource(userId: string, id: string): Promise<Source | null> {
  return queryOne<Source>(`select ${LIST_COLS} from vc_sources where id = $1 and user_id = $2`, [id, userId]);
}

/** Fonte do usuário com a transcrição (editor de clipes). */
export async function getOwnedSourceWithTranscript(userId: string, id: string): Promise<Source | null> {
  return queryOne<Source>("select * from vc_sources where id = $1 and user_id = $2", [id, userId]);
}

/** Fonte pelo ID, sem checar dono: uso interno do worker. */
export async function getSource(id: string, withTranscript = false): Promise<Source | null> {
  return queryOne<Source>(`select ${withTranscript ? "*" : LIST_COLS} from vc_sources where id = $1`, [id]);
}

export async function updateSource(id: string, patch: Partial<Source>) {
  await updateRows("vc_sources", { ...patch, updated_at: new Date().toISOString() }, "id = $1", [id]);
}

/** Pega a próxima fonte da fila de forma atômica (dois workers nunca pegam a mesma). */
export async function claimNextSource(): Promise<Source | null> {
  return queryOne<Source>(
    `update vc_sources set status = 'downloading', error = null, updated_at = now()
     where id = (select id from vc_sources where status = 'queued' order by created_at limit 1 for update skip locked)
     returning *`,
  );
}

export async function deleteSource(userId: string, id: string) {
  await query("delete from vc_sources where id = $1 and user_id = $2", [id, userId]);
}

// ---------- cortes ----------
export type NewClip = Pick<Clip, "position" | "start_seconds" | "end_seconds" | "score" | "hook" | "reason" | "is_best">;

export async function replaceClips(sourceId: string, clips: NewClip[]) {
  await query("delete from vc_clips where source_id = $1 and status <> 'approved'", [sourceId]);
  for (const c of clips) await insertRow("vc_clips", { ...c, source_id: sourceId });
}

export async function listClips(sourceId: string): Promise<Clip[]> {
  return query<Clip>("select * from vc_clips where source_id = $1 order by score desc", [sourceId]);
}

/** Cortes já renderizados do usuário (base para o Scale), do mais novo ao mais antigo. */
export async function listRenderedClips(userId: string, limit = 60): Promise<(Clip & { source_title: string })[]> {
  return query<Clip & { source_title: string }>(
    `select c.*, coalesce(nullif(s.title, ''), s.upload_name, 'Vídeo') as source_title
     from vc_clips c join vc_sources s on s.id = c.source_id
     where s.user_id = $1 and c.status in ('rendered', 'approved') and c.local_path is not null
     order by c.updated_at desc limit $2`,
    [userId, limit],
  );
}

export async function getClip(id: string): Promise<Clip | null> {
  return queryOne<Clip>("select * from vc_clips where id = $1", [id]);
}

/** Corte com a fonte dele, só se a fonte pertencer ao usuário. */
export async function getOwnedClip(userId: string, id: string): Promise<{ clip: Clip; source: Source } | null> {
  const clip = await getClip(id);
  const source = clip ? await getOwnedSource(userId, clip.source_id) : null;
  return clip && source ? { clip, source } : null;
}

export async function updateClip(id: string, patch: Partial<Clip>) {
  await updateRows("vc_clips", { ...patch, updated_at: new Date().toISOString() }, "id = $1", [id]);
}

/** Próximo corte esperando renderização (novo ou editado), de forma atômica. */
export async function claimNextClip(): Promise<Clip | null> {
  return queryOne<Clip>(
    `update vc_clips set status = 'rendering', error = null, updated_at = now()
     where id = (select id from vc_clips where status = 'pending' order by updated_at limit 1 for update skip locked)
     returning *`,
  );
}

/** Cortes/fontes travados (PC desligou no meio) voltam para a fila. */
export async function recoverStuckClips(olderThanMinutes = 30) {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000).toISOString();
  await query("update vc_clips set status = 'pending' where status = 'rendering' and updated_at < $1", [cutoff]);
  await query(
    "update vc_sources set status = 'queued' where status in ('downloading', 'transcribing', 'analyzing') and updated_at < $1",
    [cutoff],
  );
}
