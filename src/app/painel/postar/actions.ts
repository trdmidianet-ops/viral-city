"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { markPostedByUser } from "@/lib/videos/repo";

/** O dono confirma que postou o vídeo: ele sai da lista de "prontos para postar". */
export async function markPostedAction(form: FormData) {
  const id = String(form.get("id") ?? "").slice(0, 40);
  if (!isDbConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) return;
  await markPostedByUser(await requireUserId(), id);
  revalidatePath("/painel/postar");
}
