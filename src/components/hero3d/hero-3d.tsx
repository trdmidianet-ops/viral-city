"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// As cenas só baixam no navegador, depois que a página já apareceu.
const CityScene = dynamic(() => import("./city-scene"), { ssr: false });
const PhoneScene = dynamic(() => import("./phone-scene"), { ssr: false });

type Support = { webgl: boolean; reducedMotion: boolean; strong: boolean };

function detect(): Support {
  let webgl = false;
  try {
    webgl = !!document.createElement("canvas").getContext("webgl2");
  } catch {}
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cores = navigator.hardwareConcurrency ?? 8;
  const strong = window.innerWidth >= 768 && cores > 4;
  return { webgl, reducedMotion, strong };
}

function useSupport() {
  const [support, setSupport] = useState<Support | null>(null);
  useEffect(() => setSupport(detect()), []);
  return support;
}

/**
 * Avenida neon no fundo do hero. Com "reduzir movimento" ela anda mais devagar;
 * em celular ou PC fraco fica só o pôr do sol em SVG que já está por baixo.
 */
export function HeroCity() {
  const support = useSupport();
  const [ready, setReady] = useState(false);
  if (!support?.webgl || !support.strong) return null;
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}
    >
      <CityScene calm={support.reducedMotion} onReady={() => setReady(true)} />
    </div>
  );
}

/** Celular 3D mostrando o vídeo longo virando 5 cortes. */
export function HeroPhone() {
  const support = useSupport();
  if (!support) return null;
  if (!support.webgl) return <PhoneFallback />;
  return (
    <div role="img" aria-label="Animação: um vídeo longo é cortado em 5 Shorts com nota e enviado ao celular" className="h-full w-full">
      <PhoneScene still={support.reducedMotion} />
    </div>
  );
}

function PhoneFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex aspect-[9/19] h-[85%] flex-col justify-end rounded-[2.2rem] border-4 border-pink bg-gradient-to-br from-pink to-orange p-5 shadow-[0_0_60px_rgba(255,46,136,0.5)]">
        <span className="font-display text-xl leading-tight text-white">5 CORTES PRONTOS</span>
        <span className="mt-2 font-display text-sun">★ 9.4</span>
      </div>
    </div>
  );
}
