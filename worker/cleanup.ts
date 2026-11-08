/**
 * worker/cleanup.ts
 * Apaga ficheiros em .data/downloads com mais de 2 horas.
 * Adicionar ao worker principal para correr a cada hora.
 *
 * Uso:
 *   import { runDownloadCleanup } from "./cleanup";
 *   setInterval(runDownloadCleanup, 60 * 60 * 1000); // a cada hora
 */

import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data");
const DOWNLOADS_DIR = path.join(DATA_DIR, "downloads");
const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 horas

export async function runDownloadCleanup(): Promise<void> {
  let files: string[];
  try {
    files = await readdir(DOWNLOADS_DIR);
  } catch {
    // Pasta ainda não existe — nada a limpar
    return;
  }

  const now = Date.now();
  let removed = 0;

  await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(DOWNLOADS_DIR, file);
      try {
        const { mtimeMs } = await stat(filePath);
        if (now - mtimeMs > MAX_AGE_MS) {
          await unlink(filePath);
          removed++;
        }
      } catch {
        // Ficheiro pode ter sido removido entretanto — ignorar
      }
    })
  );

  if (removed > 0) {
    console.log(`[cleanup] ${removed} ficheiro(s) de download removido(s).`);
  }
}
