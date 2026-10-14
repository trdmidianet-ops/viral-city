"use client";

import { useActionState } from "react";
import { signIn, signUp, type AuthState } from "./actions";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    mode === "signup" ? signUp : signIn,
    {},
  );

  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block text-sm">
        <span className="text-muted">E-mail</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-lg border border-line bg-night/60 px-3 py-2.5 outline-none focus:border-pink"
        />
      </label>
      <label className="block text-sm">
        <span className="text-muted">Senha</span>
        <input
          name="password"
          type="password"
          required
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          className="mt-1 w-full rounded-lg border border-line bg-night/60 px-3 py-2.5 outline-none focus:border-pink"
        />
      </label>

      {state.error && <p className="text-sm text-pink">{state.error}</p>}
      {state.message && <p className="text-sm text-cyan">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="btn-sunset w-full rounded-full py-3 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Aguarde…" : mode === "signup" ? "Criar conta" : "Entrar"}
      </button>
    </form>
  );
}
