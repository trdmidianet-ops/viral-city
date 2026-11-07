"use client";

import { useEffect } from "react";

export const REF_COOKIE = "vc_ref";

/** Lê o cupom guardado no navegador (vindo de um link de indicação). */
export function readRefCookie(): string {
  const m = document.cookie.match(new RegExp(`(?:^|; )${REF_COOKIE}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : "";
}

export function writeRefCookie(code: string) {
  const clean = code.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 20);
  if (clean.length >= 3) document.cookie = `${REF_COOKIE}=${clean}; Max-Age=${30 * 24 * 3600}; Path=/; SameSite=Lax`;
}

/** Guarda por 30 dias o cupom de links como /?cupom=TORRES10 (ou ?ref=). */
export function RefCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("cupom") ?? params.get("ref");
    if (code) writeRefCookie(code);
  }, []);
  return null;
}
