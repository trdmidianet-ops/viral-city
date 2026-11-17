import { Resend } from "resend";
import { queryOne } from "@/lib/db";
import { isSlotDue } from "./due";
import { claimSlotRun, listReminderSlots } from "./repo";

/**
 * Lembrete da agenda: no horário marcado, avisa por e-mail que há corte pronto para postar,
 * com link direto para a página Postar. Roda no worker do Railway (fica fora de lib/email.ts,
 * que é só do servidor Next). Sem RESEND_API_KEY, só registra no log.
 */

const FROM = "Viral City <noreply@viralcity.com.br>";
const appUrl = () => (process.env.APP_URL ?? "https://viralcity.app").replace(/\/$/, "");
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function reminderEmailHtml(name: string, title: string, waiting: number): string {
  const first = name.trim().split(/\s+/)[0];
  const hello = first ? `Oi, ${escapeHtml(first)}!` : "Oi!";
  const more = waiting > 1 ? ` Você tem ${waiting} cortes esperando.` : "";
  const base = appUrl();
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#0b0618;color:#f6eefe;padding:40px 20px;margin:0">
  <div style="max-width:480px;margin:0 auto">
    <h1 style="font-size:24px;font-weight:700;margin:0 0 8px">Viral City</h1>
    <p style="color:#b7a8d6;margin:0 0 32px;font-size:14px">Hora de postar</p>
    <p style="margin:0 0 12px;line-height:1.6">${hello} Chegou o horário que você marcou na agenda.${more}</p>
    <p style="margin:0 0 24px;line-height:1.6;font-weight:600">“${escapeHtml(title)}”</p>
    <a href="${base}/painel/postar"
       style="display:inline-block;background:linear-gradient(90deg,#ff2e88,#ff8a3d);color:#0b0618;text-decoration:none;padding:14px 28px;border-radius:9999px;font-weight:700;font-size:15px">
      Postar agora
    </a>
    <p style="margin:32px 0 0;font-size:13px;color:#b7a8d6;line-height:1.6">
      No celular, um toque abre o YouTube, o Instagram ou o TikTok com o vídeo pronto.<br>
      Para parar estes lembretes, remova o horário em <a href="${base}/painel/agenda" style="color:#ff2e88">Agenda</a>.
    </p>
  </div>
</body>
</html>`;
}

async function sendReminder(email: string, name: string, title: string, waiting: number): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[agenda] lembrete não enviado (sem RESEND_API_KEY)");
    return false;
  }
  const { error } = await new Resend(apiKey).emails.send({
    from: FROM,
    to: email,
    subject: `Hora de postar: ${title.slice(0, 80)}`,
    html: reminderEmailHtml(name, title, waiting),
  });
  if (error) throw new Error(error.message);
  return true;
}

type Waiting = { email: string; name: string; title: string | null; waiting: number };

/**
 * Passa pelos lembretes que venceram agora. Cada horário roda uma vez por dia; sem corte pronto,
 * não manda nada. Devolve quantos e-mails saíram.
 */
export async function runDueReminders(now = new Date()): Promise<number> {
  let sent = 0;
  for (const slot of await listReminderSlots()) {
    if (!isSlotDue(slot, now)) continue;
    if (!(await claimSlotRun(slot, now))) continue;
    const info = await queryOne<Waiting>(
      `select u."email" as email, u."name" as name,
              (select v.title from vc_videos v where v.user_id = u."id" and v.status = 'ready' and v.local_path is not null
                order by v.created_at limit 1) as title,
              (select count(*)::int from vc_videos v where v.user_id = u."id" and v.status = 'ready' and v.local_path is not null) as waiting
         from "user" u where u."id" = $1`,
      [slot.user_id],
    );
    if (!info?.title) continue;
    try {
      if (await sendReminder(info.email, info.name ?? "", info.title, info.waiting)) sent++;
    } catch (err) {
      console.warn("[agenda] lembrete falhou:", err instanceof Error ? err.message : err);
    }
  }
  return sent;
}

