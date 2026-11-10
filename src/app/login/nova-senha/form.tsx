"use client";

import { createAuthClient } from "better-auth/react";
import { useState, use } from "react";
import { useRouter } from "next/navigation";

const authClient = createAuthClient();

export function ResetPasswordForm({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token } = use(searchParams);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="mt-6 rounded-lg border border-pink/30 bg-pink/10 p-4 text-sm text-pink text-center">
        Link inválido ou expirado.{" "}
        <a href="/login/esqueci-senha" className="underline">
          Solicitar novo link
        </a>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setPending(true);
    try {
      const res = await authClient.resetPassword({ newPassword: password, token: token! });
      if (res.error) {
        setError("Link expirado ou inválido. Solicite um novo link.");
      } else {
        setDone(true);
        setTimeout(() => router.push("/login"), 2500);
      }
    } catch {
      setError("Não foi possível redefinir a senha agora. Tente de novo.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="mt-6 rounded-lg border border-cyan/30 bg-cyan/10 p-4 text-sm text-cyan text-center">
        Senha redefinida com sucesso! Redirecionando para o login…
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <label className="block text-sm">
        <span className="text-muted">Nova senha</span>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className="mt-1 w-full rounded-lg border border-line bg-night/60 px-3 py-2.5 outline-none focus:border-pink"
        />
      </label>
      <label className="block text-sm">
        <span className="text-muted">Confirmar nova senha</span>
        <input
          type="password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          className="mt-1 w-full rounded-lg border border-line bg-night/60 px-3 py-2.5 outline-none focus:border-pink"
        />
      </label>

      {error && <p className="text-sm text-pink">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="btn-sunset w-full rounded-full py-3 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Salvar nova senha"}
      </button>
    </form>
  );
}
