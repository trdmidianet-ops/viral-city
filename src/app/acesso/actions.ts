"use server";

import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GATE_COOKIE, gatePassword, gateToken, safeNext } from "@/lib/gate";

export type GateState = { error?: string };

export async function unlock(_: GateState, formData: FormData): Promise<GateState> {
  const expected = gatePassword();
  const given = String(formData.get("password") ?? "");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
    await new Promise((r) => setTimeout(r, 600)); // freia tentativas de adivinhar
    return { error: "Senha incorreta." };
  }

  (await cookies()).set(GATE_COOKIE, await gateToken(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(safeNext(formData.get("next")));
}
