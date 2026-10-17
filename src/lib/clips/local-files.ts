import path from "node:path";

/** Pastas locais (só existem no PC; na Vercel o disco é somente leitura). */
export const DATA_DIR = path.join(process.cwd(), ".data");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

export const UPLOAD_ID = /^[0-9a-f-]{36}\.(mp4|mov|mkv|webm|m4v)$/i;

export function uploadPath(uploadId: string): string | null {
  return UPLOAD_ID.test(uploadId) ? path.join(UPLOADS_DIR, uploadId) : null;
}

/** Só permite servir arquivos de dentro da pasta .data (evita ler qualquer arquivo do PC). */
export function isInsideData(file: string): boolean {
  const rel = path.relative(DATA_DIR, path.resolve(file));
  return !!rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

export const canUseLocalFiles = () => !process.env.VERCEL;
