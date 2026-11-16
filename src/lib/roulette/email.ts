import { Resend } from "resend";
import { SPIN_TTL_DAYS } from "./rules";

/**
 * E-mail "Você ganhou um giro", enviado pelo worker quando concede o giro de inatividade.
 * Fica fora de lib/email.ts porque aquele arquivo é só do servidor Next (server-only) e este
 * roda no worker. Requer RESEND_API_KEY no ambiente do worker; sem ela, só registra no log.
 */

const FROM = "Viral City <noreply@viralcity.com.br>";
const APP_URL = (process.env.APP_URL ?? "https://viralcity.app").replace(/\/$/, "");

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function spinEmailHtml(name: string): string {
  const hello = name.trim() ? `Oi, ${escapeHtml(name.trim().split(/\s+/)[0])}!` : "Oi!";
  const url = `${APP_URL}/painel/roleta`;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#0b0618;color:#f6eefe;padding:40px 20px;margin:0">
  <div style="max-width:480px;margin:0 auto">
    <h1 style="font-size:24px;font-weight:700;margin:0 0 8px">Viral City</h1>
    <p style="color:#b7a8d6;margin:0 0 32px;font-size:14px">Você ganhou um giro na roleta</p>
    <p style="margin:0 0 24px;line-height:1.6">
      ${hello} Tem um giro grátis esperando por você.<br>
      Cada giro paga de 5 a 500 CityCoins, direto na sua carteira, para usar nos seus próximos cortes.
    </p>
    <a href="${url}"
       style="display:inline-block;background:linear-gradient(90deg,#ff2e88,#ff8a3d);color:#0b0618;text-decoration:none;padding:14px 28px;border-radius:9999px;font-weight:700;font-size:15px">
      Girar agora
    </a>
    <p style="margin:32px 0 0;font-size:13px;color:#b7a8d6;line-height:1.6">
      O giro vale por ${SPIN_TTL_DAYS} dias. Giros não são vendidos e os CityCoins valem só dentro da Viral City.
    </p>
    <hr style="border:none;border-top:1px solid #2a2a3a;margin:32px 0">
    <p style="font-size:12px;color:#b7a8d6;margin:0">
      Viral City · <a href="${APP_URL}" style="color:#ff2e88;text-decoration:none">${APP_URL.replace(/^https?:\/\//, "")}</a>
    </p>
  </div>
</body>
</html>`;
}

/** Devolve true se o e-mail foi entregue ao Resend. */
export async function sendSpinEmail(email: string, name: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[roleta] e-mail de giro não enviado (sem RESEND_API_KEY)");
    return false;
  }
  const { error } = await new Resend(apiKey).emails.send({
    from: FROM,
    to: email,
    subject: "Você ganhou um giro na roleta — Viral City",
    html: spinEmailHtml(name),
  });
  if (error) throw new Error(error.message);
  return true;
}
