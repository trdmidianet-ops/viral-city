import { db, must } from "@/lib/db";
import { localParts, type Slot } from "./due";

const T = "vc_posting_slots";
export const DEFAULT_TZ = "America/Sao_Paulo";

export async function listSlots(): Promise<Slot[]> {
  return must<Slot[]>(
    await db().from(T).select("id, account_id, weekday, post_time, timezone, last_run_on").order("weekday").order("post_time"),
    "Listar horários",
  );
}

export async function addSlot(accountId: string, weekday: number, postTime: string) {
  const res = await db().from(T).insert({ account_id: accountId, weekday, post_time: postTime, timezone: DEFAULT_TZ });
  if (res.error?.code === "23505") return; // horário repetido: ignora
  must(res, "Adicionar horário");
}

export async function removeSlot(id: string) {
  must(await db().from(T).delete().eq("id", id), "Remover horário");
}

export async function markSlotRun(slot: Slot, now: Date) {
  must(
    await db().from(T).update({ last_run_on: localParts(now, slot.timezone).date }).eq("id", slot.id),
    "Marcar horário",
  );
}
