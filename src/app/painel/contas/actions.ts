"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getAccount, removeAccount, setAccountLogo } from "@/lib/accounts/store";

const UUID = /^[0-9a-f-]{36}$/i;
const MAX_LOGO = 300 * 1024;

export async function disconnectAccount(formData: FormData) {
  if (isSupabaseConfigured && !(await getUser())) return;
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;
  await removeAccount(id);
  revalidatePath("/painel/contas");
}

/** Salva (ou remove) a logo do canal usada nos cortes. PNG ou JPG até 300 KB. */
export async function saveLogoAction(formData: FormData) {
  if (isSupabaseConfigured && !(await getUser())) return;
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id) || !(await getAccount(id))) return;

  if (formData.get("remove") === "1") {
    await setAccountLogo(id, null);
  } else {
    const file = formData.get("logo");
    if (!(file instanceof File) || !file.size || file.size > MAX_LOGO) return;
    const bytes = Buffer.from(await file.arrayBuffer());
    const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (!isPng && !isJpg) return;
    await setAccountLogo(id, `data:image/${isPng ? "png" : "jpeg"};base64,${bytes.toString("base64")}`);
  }
  revalidatePath("/painel/contas");
}
