"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { removeAccount } from "@/lib/accounts/store";

export async function disconnectAccount(formData: FormData) {
  if (isSupabaseConfigured && !(await getUser())) return;
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await removeAccount(id);
  revalidatePath("/painel/contas");
}
