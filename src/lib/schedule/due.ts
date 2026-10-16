/** Lógica pura da agenda (sem banco), para ser testável. */
export type Slot = {
  id: string;
  account_id: string;
  weekday: number; // 0 = domingo
  post_time: string; // "HH:MM" ou "HH:MM:SS"
  timezone: string;
  last_run_on: string | null; // "YYYY-MM-DD" no fuso da agenda
};

export const weekdays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** Janela de tolerância: se o PC ligar até X minutos depois do horário, ainda posta. */
export const GRACE_MINUTES = 30;

export function localParts(now: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return {
    weekday,
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function slotMinutes(postTime: string): number {
  const [h, m] = postTime.split(":").map(Number);
  return h * 60 + m;
}

/** O horário chegou hoje (no fuso da agenda), está dentro da tolerância e ainda não rodou hoje. */
export function isSlotDue(slot: Slot, now: Date): boolean {
  const local = localParts(now, slot.timezone);
  if (local.weekday !== slot.weekday) return false;
  if (slot.last_run_on === local.date) return false;
  const diff = local.minutes - slotMinutes(slot.post_time);
  return diff >= 0 && diff <= GRACE_MINUTES;
}

export function isValidTime(v: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}
