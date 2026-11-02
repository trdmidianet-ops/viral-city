import { query } from "@/lib/db";
import { localParts, type Slot } from "./due";

export const DEFAULT_TZ = "America/Sao_Paulo";
const COLS = "s.id, s.account_id, s.weekday, s.post_time, s.timezone, s.last_run_on";

/** Todos os horários, de todos os usuários: uso do worker. */
export async function listSlots(): Promise<Slot[]> {
  return query<Slot>(`select ${COLS} from vc_posting_slots s order by s.weekday, s.post_time`);
}

/** Horários das contas do usuário (painel). */
export async function listSlotsFor(userId: string): Promise<Slot[]> {
  return query<Slot>(
    `select ${COLS} from vc_posting_slots s join vc_accounts a on a.id = s.account_id
     where a.user_id = $1 order by s.weekday, s.post_time`,
    [userId],
  );
}

/** Só chame depois de conferir que a conta é do usuário. Horário repetido é ignorado. */
export async function addSlot(accountId: string, weekday: number, postTime: string) {
  await query(
    `insert into vc_posting_slots (account_id, weekday, post_time, timezone) values ($1, $2, $3, $4)
     on conflict (account_id, weekday, post_time) do nothing`,
    [accountId, weekday, postTime, DEFAULT_TZ],
  );
}

export async function removeSlot(userId: string, id: string) {
  await query("delete from vc_posting_slots s using vc_accounts a where s.id = $2 and a.id = s.account_id and a.user_id = $1", [
    userId,
    id,
  ]);
}

export async function markSlotRun(slot: Slot, now: Date) {
  await query("update vc_posting_slots set last_run_on = $2 where id = $1", [slot.id, localParts(now, slot.timezone).date]);
}
