"use server";

import { revalidatePath } from "next/cache";
import { getAccount } from "@/lib/accounts/store";
import { isDbConfigured } from "@/lib/db";
import { isValidTime } from "@/lib/schedule/due";
import { addSlot, removeSlot } from "@/lib/schedule/repo";

const UUID = /^[0-9a-f-]{36}$/i;

export async function addSlotAction(form: FormData) {
  if (!isDbConfigured()) return;
  const accountId = String(form.get("account") ?? "");
  const time = String(form.get("time") ?? "");
  const days = form.getAll("weekday").map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  if (!UUID.test(accountId) || !isValidTime(time) || !days.length) return;
  if (!(await getAccount(accountId))) return;
  for (const d of new Set(days)) await addSlot(accountId, d, time);
  revalidatePath("/painel/agenda");
}

export async function removeSlotAction(form: FormData) {
  const id = String(form.get("id") ?? "");
  if (!isDbConfigured() || !UUID.test(id)) return;
  await removeSlot(id);
  revalidatePath("/painel/agenda");
}
