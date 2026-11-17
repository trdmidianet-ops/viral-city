"use server";

import { revalidatePath } from "next/cache";
import { getOwnedAccount } from "@/lib/accounts/store";
import { requireUserId } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { isValidTime } from "@/lib/schedule/due";
import { addReminderSlot, addSlot, removeSlot } from "@/lib/schedule/repo";

const UUID = /^[0-9a-f-]{36}$/i;

/** account = "lembrete" cria um lembrete de postagem; um ID de conta cria postagem automática nela. */
export async function addSlotAction(form: FormData) {
  if (!isDbConfigured()) return;
  const userId = await requireUserId();
  const accountId = String(form.get("account") ?? "");
  const time = String(form.get("time") ?? "");
  const days = form.getAll("weekday").map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  if (!isValidTime(time) || !days.length) return;
  if (accountId === "lembrete") {
    for (const d of new Set(days)) await addReminderSlot(userId, d, time);
  } else {
    if (!UUID.test(accountId) || !(await getOwnedAccount(userId, accountId))) return;
    for (const d of new Set(days)) await addSlot(userId, accountId, d, time);
  }
  revalidatePath("/painel/agenda");
}

export async function removeSlotAction(form: FormData) {
  const id = String(form.get("id") ?? "");
  if (!isDbConfigured() || !UUID.test(id)) return;
  await removeSlot(await requireUserId(), id);
  revalidatePath("/painel/agenda");
}
