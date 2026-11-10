import "server-only";

/**
 * Envio de e-mails transacionais via Resend.
 * Requer RESEND_API_KEY no ambiente.
 */

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  // importação dinâmica para não quebrar se a chave não estiver presente
  const { Resend } = require("resend");
  return new Resend(apiKey);
}

const FROM = "Viral City <noreply@viralcity.com.br>";

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const resend = getResend();
  if (!resend) {
    // Em desenvolvimento, loga a URL para facilitar teste
    console.log("[email] reset password URL (sem RESEND_API_KEY):", resetUrl);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Redefinir senha — Viral City",
    html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head><meta charset="utf-8"></head>
      <body style="font-family:sans-serif;background:#0a0a0f;color:#e2e2e8;padding:40px 20px;margin:0">
        <div style="max-width:480px;margin:0 auto">
          <h1 style="font-size:24px;font-weight:700;margin:0 0 8px">Viral City</h1>
          <p style="color:#9898aa;margin:0 0 32px;font-size:14px">Redefinição de senha</p>

          <p style="margin:0 0 24px;line-height:1.6">
            Recebemos um pedido para redefinir a senha da sua conta.<br>
            Clique no botão abaixo para escolher uma nova senha:
          </p>

          <a href="${resetUrl}"
             style="display:inline-block;background:linear-gradient(135deg,#ff2e88,#8b3dff);color:#fff;text-decoration:none;padding:14px 28px;border-radius:9999px;font-weight:600;font-size:15px">
            Redefinir minha senha
          </a>

          <p style="margin:32px 0 0;font-size:13px;color:#9898aa;line-height:1.6">
            O link expira em 1 hora.<br>
            Se você não solicitou isso, pode ignorar este e-mail com segurança.
          </p>

          <hr style="border:none;border-top:1px solid #2a2a3a;margin:32px 0">
          <p style="font-size:12px;color:#666;margin:0">
            Viral City · <a href="https://viralcity.com.br" style="color:#ff2e88;text-decoration:none">viralcity.com.br</a>
          </p>
        </div>
      </body>
      </html>
    `,
  });
}
