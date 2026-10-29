"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { INTRO_EVENT, isIntroDone } from "./intro";

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

const runsCity = (s: Support) => s.webgl && s.strong;

/**
 * Avenida neon no fundo do hero. Com "reduzir movimento" ela anda mais devagar;
 * em celular ou PC fraco fica só o pôr do sol em SVG que já está por baixo.
 */
export function HeroCity() {
  const support = useSupport();
  const [ready, setReady] = useState(false);
  // Sem cidade 3D, volta o pôr do sol em SVG (que fica escondido em telas grandes)
  useEffect(() => {
    if (support && !runsCity(support)) document.documentElement.classList.add("vc-no-3d");
  }, [support]);
  if (!support || !runsCity(support)) return null;
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
    >
      <CityScene calm={support.reducedMotion} onReady={() => setReady(true)} />
    </div>
  );
}

/**
 * Conteúdo do hero que entra depois do voo do drone. Sem cidade 3D (celular, PC fraco),
 * aparece na hora. O CSS (.vc-reveal) garante que ele apareça mesmo se o JS falhar.
 */
export function HeroReveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const support = detect();
    if (!runsCity(support) || isIntroDone()) {
      setShown(true);
      return;
    }
    const show = () => setShown(true);
    window.addEventListener(INTRO_EVENT, show);
    const safety = setTimeout(show, 9000);
    return () => {
      window.removeEventListener(INTRO_EVENT, show);
      clearTimeout(safety);
    };
  }, []);
  return (
    <div className={`vc-reveal ${shown ? "is-shown" : ""} ${className ?? ""}`} style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}>
      {children}
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
        <span className="font-heading text-xl font-extrabold leading-tight tracking-tight text-white">5 CORTES PRONTOS</span>
        <span className="num mt-2 font-heading font-bold text-sun">★ 9.4</span>
      </div>
    </div>
  );
}
