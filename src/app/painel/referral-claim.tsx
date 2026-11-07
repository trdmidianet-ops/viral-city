"use client";

import { useEffect, useState } from "react";
import { Gift, X } from "lucide-react";
import { readRefCookie } from "@/components/ref-capture";
import { claimReferralAction } from "./indique/actions";

/** Quem entrou por um link de indicação (inclusive pelo Google) recebe o cupom ao chegar no painel. */
export function ReferralClaim() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const code = readRefCookie();
    if (!code) return;
    claimReferralAction(code)
      .then(setMessage)
      .catch(() => {});
  }, []);

  if (!message) return null;
  return (
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-sun/40 bg-sun/10 px-4 py-3 text-sm text-sun">
      <Gift size={18} className="shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={() => setMessage(null)} aria-label="Fechar" className="text-sun/70 hover:text-sun">
        <X size={16} />
      </button>
    </div>
  );
}
