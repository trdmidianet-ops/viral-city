"use client";

import { createAuthClient } from "better-auth/react";
import { useState } from "react";

const authClient = createAuthClient();

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      await authClient.requestPasswordReset({
        email,
        redirectTo: "/login/nova-senha",
      });
      // Sempre mostramos "sucesso" para não revelar se o e-mail existe
      setSent(true);
    } catch {
      setError("Não foi possível enviar o e-mail agora. Tente de novo em instantes.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="mt-6 rounded-lg border border-cyan/30 bg-cyan/10 p-4 text-sm text-cyan text-center leading-relaxed">
        Se esse e-mail estiver cadastrado, você receberá um link em instantes.
        <br />
        <span className="text-muted text-xs mt-1 block">Verifique também a caixa de spam.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <label className="block text-sm">
        <span className="text-muted">E-mail</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="mt-1 w-full rounded-lg border border-line bg-night/60 px-3 py-2.5 outline-none focus:border-pink"
        />
      </label>

      {error && <p className="text-sm text-pink">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="btn-sunset w-full rounded-full py-3 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Enviar link de recuperação"}
      </button>
    </form>
  );
}
