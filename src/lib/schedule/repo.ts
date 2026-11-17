import { query, queryOne } from "@/lib/db";
import { localParts, type Slot } from "./due";

export const DEFAULT_TZ = "America/Sao_Paulo";
const COLS = "s.id, s.account_id, s.user_id, s.weekday, s.post_time, s.timezone, s.last_run_on";

/** Todos os horários, de todos os usuários: uso do worker. */
export async function listSlots(): Promise<Slot[]> {
  return query<Slot>(`select ${COLS} from vc_posting_slots s order by s.weekday, s.post_time`);
}

/** Lembretes (horários sem conta) de todos os usuários: uso do worker no Railway. */
export async function listReminderSlots(): Promise<Slot[]> {
  return query<Slot>(`select ${COLS} from vc_posting_slots s where s.account_id is null order by s.weekday, s.post_time`);
}

/** Horários do usuário (lembretes e os das contas conectadas): painel. */
export async function listSlotsFor(userId: string): Promise<Slot[]> {
  return query<Slot>(`select ${COLS} from vc_posting_slots s where s.user_id = $1 order by s.weekday, s.post_time`, [userId]);
}

/** Horário de postagem automática de uma conta. Só chame depois de conferir que a conta é do usuário. */
export async function addSlot(userId: string, accountId: string, weekday: number, postTime: string) {
  await query(
    `insert into vc_posting_slots (user_id, account_id, weekday, post_time, timezone) values ($1, $2, $3, $4, $5)
     on conflict (account_id, weekday, post_time) do nothing`,
    [userId, accountId, weekday, postTime, DEFAULT_TZ],
  );
}

/** Lembrete de postagem (sem conta). Horário repetido é ignorado. */
export async function addReminderSlot(userId: string, weekday: number, postTime: string) {
  await query(
    `insert into vc_posting_slots (user_id, account_id, weekday, post_time, timezone) values ($1, null, $2, $3, $4)
     on conflict (user_id, weekday, post_time) where account_id is null do nothing`,
    [userId, weekday, postTime, DEFAULT_TZ],
  );
}

export async function removeSlot(userId: string, id: string) {
  await query("delete from vc_posting_slots where id = $2 and user_id = $1", [userId, id]);
}

export async function markSlotRun(slot: Slot, now: Date) {
  await query("update vc_posting_slots set last_run_on = $2 where id = $1", [slot.id, localParts(now, slot.timezone).date]);
}

/**
 * Marca que o horário rodou hoje, só se ainda não tinha rodado. Devolve true para quem marcou
 * primeiro: dois workers ao mesmo tempo nunca mandam o mesmo lembrete duas vezes.
 */
export async function claimSlotRun(slot: Slot, now: Date): Promise<boolean> {
  const date = localParts(now, slot.timezone).date;
  const row = await queryOne<{ id: string }>(
    "update vc_posting_slots set last_run_on = $2 where id = $1 and last_run_on is distinct from $2::date returning id",
    [slot.id, date],
  );
  return Boolean(row);
}
