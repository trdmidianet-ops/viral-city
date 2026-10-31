"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";

/**
 * Compila todos os shaders da cena antes do primeiro quadro. Sem isso, cada material é
 * compilado na primeira vez que aparece na tela, e o voo do drone dá um "soluço".
 * Coloque por último dentro do <Canvas>, depois dos objetos da cena.
 */
export function WarmUp() {
  const { gl, scene, camera } = useThree();
  useLayoutEffect(() => {
    gl.compile(scene, camera);
  }, [gl, scene, camera]);
  return null;
}

/**
 * Resolução adaptativa: se o PC não aguenta 45 quadros por segundo, baixa a resolução
 * da cena até ficar fluido; se sobra fôlego por um tempo, sobe de novo (até `max`).
 */
export function AdaptiveDpr({ max, min = 0.75 }: { max: number; min?: number }) {
  const setDpr = useThree((s) => s.setDpr);
  const acc = useRef({ time: 0, frames: 0, dpr: max, good: 0 });
  useFrame((_, dt) => {
    const a = acc.current;
    a.time += Math.min(dt, 0.25);
    a.frames++;
    if (a.time < 1.5) return;
    const fps = a.frames / a.time;
    a.time = 0;
    a.frames = 0;
    if (fps < 45 && a.dpr > min) {
      a.dpr = Math.max(min, a.dpr - 0.25);
      a.good = 0;
      setDpr(a.dpr);
    } else if (fps > 57 && a.dpr < max && ++a.good >= 3) {
      a.dpr = Math.min(max, a.dpr + 0.25);
      a.good = 0;
      setDpr(a.dpr);
    }
  });
  return null;
}
