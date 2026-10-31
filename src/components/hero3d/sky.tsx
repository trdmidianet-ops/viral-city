"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Cúpula de céu que acompanha a câmera: o pôr do sol fica sempre no horizonte, na direção
 * da avenida (-z), seja vendo da rua ou do alto. Cores calculadas pela direção do olhar.
 */
export function Sky() {
  const ref = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          varying vec3 vDir;
          void main() {
            vec3 dir = normalize(vDir);
            float e = asin(clamp(dir.y, -1.0, 1.0)); // elevação, em radianos
            float a = atan(dir.x, -dir.z);            // ângulo a partir da avenida
            vec3 col = mix(vec3(0.13, 0.04, 0.18), vec3(0.16, 0.06, 0.29), smoothstep(0.0, 0.28, e));
            col = mix(col, vec3(0.043, 0.024, 0.094), smoothstep(0.25, 0.75, e));

            vec2 p = vec2(a, e);
            vec2 c = vec2(0.0, 0.085);
            float r = 0.25;
            float d = length(p - c);
            col += vec3(1.0, 0.18, 0.53) * 0.55 * exp(-max(d - r, 0.0) / 0.13);

            float t = clamp((e - (c.y - r)) / (2.0 * r), 0.0, 1.0);
            vec3 sun = mix(vec3(1.0, 0.18, 0.53), vec3(1.0, 0.54, 0.24), smoothstep(0.0, 0.55, t));
            sun = mix(sun, vec3(1.0, 0.82, 0.4), smoothstep(0.55, 1.0, t));
            // listras na metade de baixo, que engrossam perto do horizonte
            float below = clamp((c.y - e) / r, 0.0, 1.0);
            float bands = fract((e - uTime * 0.005) / 0.021);
            // listras e borda do sol com antisserrilhado pela derivada de tela
            float bw = fwidth(e / 0.021);
            float th = below * 0.55;
            float gap = (1.0 - smoothstep(th - bw, th + bw, bands)) * smoothstep(0.0, bw, bands) * step(0.02, below);
            float fd = fwidth(d);
            float inside = 1.0 - smoothstep(r - fd, r + fd, d);
            col = mix(col, sun, inside * (1.0 - gap) * step(0.0, e + 0.01));
            // abaixo do horizonte, a mesma cor da névoa: o chão some nela sem emenda
            col = mix(col, vec3(0.13, 0.04, 0.18), smoothstep(0.0, -0.02, e));
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    [],
  );
  useFrame(({ camera }, dt) => {
    material.uniforms.uTime.value += dt;
    ref.current?.position.copy(camera.position);
  });
  return (
    <mesh ref={ref} material={material} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[1000, 48, 24]} />
    </mesh>
  );
}
