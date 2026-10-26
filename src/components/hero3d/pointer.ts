"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";

/**
 * Posição do mouse na janela, de -1 a 1 nos dois eixos.
 * As cenas ficam atrás do conteúdo (sem eventos de ponteiro), por isso ouvimos a janela.
 */
export function useWindowPointer() {
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return pointer;
}

/** Só anima enquanto o elemento está na tela, para não gastar bateria. */
export function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
}

/**
 * No modo parado (frameloop "demand"), redesenha algumas vezes até o canvas ganhar
 * tamanho e as texturas carregarem. Precisa ficar dentro do <Canvas>.
 */
export function useStillFrames(still: boolean) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!still) return;
    const id = setInterval(invalidate, 150);
    const stop = setTimeout(() => clearInterval(id), 2500);
    return () => {
      clearInterval(id);
      clearTimeout(stop);
    };
  }, [still, invalidate]);
}

/** Pseudoaleatório com semente: a cidade sai igual em todo carregamento. */
export function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
