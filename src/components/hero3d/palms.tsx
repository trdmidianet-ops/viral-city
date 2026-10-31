"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { COPIES, PERIOD, fogChunk, fogUniforms, type PalmSpot } from "./city-shared";
import { PALM_VARIANTS, palmGeometry } from "./palm-geometry";

/**
 * Palmeiras "tropical neon" da avenida: tronco grosso com escamas, folhas longas com
 * folíolos finos, folhas secas, cocos, contraluz do pôr do sol, pontas em neon, luz ciano
 * na base e balanço do vento. Três modelos, cada um desenhado de uma vez (instancing).
 */

const palmMaterial = () =>
  new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, ...fogUniforms },
    vertexShader: /* glsl */ `
      attribute float aKind;
      attribute float aSway;
      attribute float aEdge;
      uniform float uTime;
      varying float vKind;
      varying float vEdge;
      varying vec3 vWorld;
      varying vec3 vN;
      void main() {
        vec3 p = position;
        // vento: a copa balança devagar, cada palmeira no seu ritmo
        float ph = float(gl_InstanceID) * 1.7;
        float k = aSway * aSway;
        p.x += (sin(uTime * 1.2 + ph) * 0.12 + sin(uTime * 2.3 + ph * 1.3) * 0.05) * k;
        p.z += cos(uTime * 0.9 + ph) * 0.08 * k;
        // pontas das folhas tremem um pouco mais
        float leaf = step(0.5, aKind) * (1.0 - step(1.5, aKind));
        p.y += sin(uTime * 3.1 + ph + position.x * 1.7 + position.z) * 0.06 * aEdge * leaf;
        vKind = aKind;
        vEdge = aEdge;
        vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      varying float vKind;
      varying float vEdge;
      varying vec3 vWorld;
      varying vec3 vN;
      ${fogChunk}
      void main() {
        vec3 n = normalize(vN);
        if (!gl_FrontFacing) n = -n;
        vec3 V = normalize(cameraPosition - vWorld);
        vec3 sunDir = normalize(vec3(0.0, 0.18, -1.0));
        vec3 col;
        if (vKind < 0.5) {
          // tronco: esquenta do lado do sol, com anéis e luz ciano subindo da base
          float sunSide = clamp(dot(n, sunDir) * 0.5 + 0.5, 0.0, 1.0);
          col = mix(vec3(0.12, 0.06, 0.13), vec3(0.45, 0.2, 0.22), sunSide * sunSide);
          float rw = fwidth(vEdge * 18.0);
          float ring = abs(fract(vEdge * 18.0) - 0.5);
          col *= 0.78 + 0.22 * smoothstep(0.1 - rw, 0.1 + rw, ring);
          col += vec3(0.13, 0.83, 0.93) * 0.55 * (1.0 - smoothstep(0.0, 2.6, vWorld.y));
        } else if (vKind < 1.5) {
          // folha: verde-azulado, contraluz rosa do pôr do sol e pontas em neon
          col = mix(vec3(0.08, 0.52, 0.38), vec3(0.03, 0.24, 0.22), vEdge * 0.7);
          float rim = pow(1.0 - abs(dot(V, n)), 2.5);
          float back = smoothstep(-0.1, 0.9, dot(-V, sunDir));
          // contraluz: com o sol atrás, a folha fica translúcida, verde-dourada
          col += vec3(0.45, 0.55, 0.12) * 0.3 * back * (1.0 - 0.6 * vEdge);
          col += vec3(1.0, 0.32, 0.5) * rim * 0.35;
          // pontas dos folíolos em neon rosa
          col = mix(col, vec3(1.0, 0.22, 0.62), smoothstep(0.55, 1.0, vEdge) * 0.85);
          col += vec3(0.1, 0.5, 0.55) * 0.15 * max(-n.y, 0.0);
        } else if (vKind < 2.5) {
          // coco
          col = vec3(0.32, 0.18, 0.1) + vec3(1.0, 0.4, 0.3) * 0.25 * pow(1.0 - abs(dot(V, n)), 2.0);
        } else {
          // folha seca: palha queimada pelo sol, com a mesma contraluz quente
          col = mix(vec3(0.42, 0.25, 0.11), vec3(0.2, 0.1, 0.06), vEdge);
          col += vec3(1.0, 0.45, 0.3) * 0.3 * pow(1.0 - abs(dot(V, n)), 2.5);
        }
        gl_FragColor = vec4(applyFog(col, vWorld), 1.0);
      }`,
  });

/** Círculo de luz ciano no chão, na base de cada palmeira (luz de rua à noite). */
const poolMaterial = () =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { ...fogUniforms },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld;
      ${fogChunk}
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float a = pow(1.0 - smoothstep(0.0, 1.0, d), 1.6);
        gl_FragColor = vec4(vec3(0.13, 0.83, 0.93), a * 0.6 * (1.0 - fogFactor(vWorld)));
      }`,
  });

export function Palms({ items }: { items: PalmSpot[] }) {
  const palms = useRef<(THREE.InstancedMesh | null)[]>([]);
  const pools = useRef<THREE.InstancedMesh>(null);
  const geometries = useMemo(() => PALM_VARIANTS.map(palmGeometry), []);
  const material = useMemo(palmMaterial, []);
  const pool = useMemo(poolMaterial, []);
  const poolGeometry = useMemo(() => new THREE.PlaneGeometry(3.4, 3.4).rotateX(-Math.PI / 2), []);
  const count = items.length * COPIES;
  // cada palmeira usa um dos três modelos, alternando ao longo da avenida
  const perVariant = PALM_VARIANTS.map((_, v) => items.filter((_, i) => i % PALM_VARIANTS.length === v).length * COPIES);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const pos = new THREE.Vector3();
    const scale = new THREE.Vector3();
    let i = 0;
    const next = PALM_VARIANTS.map(() => 0);
    for (let c = 0; c < COPIES; c++) {
      items.forEach((p, k) => {
        const v = k % PALM_VARIANTS.length;
        pos.set(p.x, 0, p.z - c * PERIOD);
        q.setFromEuler(e.set(0, p.r, 0));
        palms.current[v]?.setMatrixAt(next[v]++, m.compose(pos, q, scale.setScalar(p.s)));
        pools.current?.setMatrixAt(i++, m.makeTranslation(p.x, 0.03, p.z - c * PERIOD));
      });
    }
    palms.current.forEach((mesh) => mesh && (mesh.instanceMatrix.needsUpdate = true));
    if (pools.current) pools.current.instanceMatrix.needsUpdate = true;
  }, [items]);

  useFrame(({ clock }) => (material.uniforms.uTime.value = clock.elapsedTime));

  return (
    <>
      <instancedMesh ref={pools} args={[poolGeometry, pool, count]} frustumCulled={false} renderOrder={1} />
      {geometries.map((g, v) => (
        <instancedMesh
          key={v}
          ref={(mesh) => void (palms.current[v] = mesh)}
          args={[g, material, perVariant[v]]}
          frustumCulled={false}
        />
      ))}
    </>
  );
}
