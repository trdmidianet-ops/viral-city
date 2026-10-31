"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { COPIES, FOG_FAR, FOG_NEAR, PERIOD, fogChunk, fogUniforms, type PalmSpot } from "./city-shared";
import { announceIntroDone } from "./intro";
import { Palms } from "./palms";
import { AdaptiveDpr, WarmUp } from "./perf";
import { Sky } from "./sky";
import { seeded, useInView, useWindowPointer } from "./pointer";

/**
 * Avenida neon em 3D: a página abre com um voo de drone sobre a cidade que desce e entra
 * na avenida; depois a câmera "dirige" rumo ao pôr do sol entre prédios, palmeiras e
 * outdoors verticais passando Shorts. Tudo gerado em código, sem assets.
 */

const FOG = "#4a1752";
const SPEED = 7; // unidades por segundo
const INTRO_SECONDS = 6.5;

// ---------- chão com grade ----------

function Floor({ speed }: { speed: number }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uOffset: { value: 0 }, ...fogUniforms },
        vertexShader: /* glsl */ `
          varying vec3 vWorld;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vWorld = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uOffset;
          varying vec3 vWorld;
          ${fogChunk}
          float gridLine(float v, float size) {
            float f = abs(fract(v / size - 0.5) - 0.5) * size;
            float w = fwidth(v);
            float line = 1.0 - smoothstep(0.0, w * 1.5, f);
            // ao longe as linhas ficam menores que um pixel: usa a média, sem moiré nem cintilar
            return mix(line, 0.12, smoothstep(0.12, 0.45, w / size));
          }
          void main() {
            // a grade anda junto com os prédios, em direção à câmera (+z)
            vec2 p = vec2(vWorld.x, vWorld.z - uOffset);
            vec3 col = vec3(0.07, 0.024, 0.16);
            float g = max(gridLine(p.x, 4.0), gridLine(p.y, 4.0));
            col = mix(col, vec3(1.0, 0.18, 0.53), g * 0.8);
            // faixas laterais da avenida em ciano e faixa central tracejada
            float ew = fwidth(vWorld.x);
            float edge = 1.0 - smoothstep(0.05, 0.18 + ew * 1.5, abs(abs(vWorld.x) - 3.8));
            col = mix(col, vec3(0.13, 0.83, 0.93), edge);
            // faixa tracejada com bordas suaves (onda triangular contínua, sem serrilhado)
            float dw = fwidth(p.y / 6.0);
            float dash = smoothstep(0.25 - dw, 0.25 + dw, abs(fract(p.y / 6.0 + 0.25) - 0.5));
            dash = mix(dash, 0.5, smoothstep(0.15, 0.45, dw)) * (1.0 - smoothstep(0.06, 0.14 + ew * 1.5, abs(vWorld.x)));
            col = mix(col, vec3(1.0, 0.82, 0.4), dash * 0.9);
            // reflexo do sol no asfalto
            col += vec3(1.0, 0.3, 0.45) * 0.18 * exp(-abs(vWorld.x) / 10.0) * smoothstep(-20.0, -200.0, vWorld.z);
            gl_FragColor = vec4(applyFog(col, vWorld), 1.0);
          }`,
      }),
    [],
  );
  useFrame(({ clock }) => (material.uniforms.uOffset.value = (clock.elapsedTime * speed) % 24));
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, -300]} material={material}>
      <planeGeometry args={[6000, 6000]} />
    </mesh>
  );
}

// ---------- layout da cidade (um trecho que se repete) ----------

type Building = { x: number; z: number; w: number; d: number; h: number; side: number; base?: number };
type Billboard = { x: number; y: number; z: number; side: number; hue: number };

function useCityLayout() {
  return useMemo(() => {
    const rand = seeded(7);
    const buildings: Building[] = [];
    const billboards: Billboard[] = [];
    const palms: PalmSpot[] = [];

    for (const side of [-1, 1]) {
      // fileira da frente
      for (let z = -2; z > -PERIOD; ) {
        const w = 3 + rand() * 3;
        const d = 3.5 + rand() * 3;
        const h = 5 + rand() * 18;
        const x = side * (6.5 + w / 2 + rand() * 1.5);
        buildings.push({ x, z: z - d / 2, w, d, h, side });
        // topo escalonado e antena em parte dos prédios
        if (h > 11 && rand() > 0.4) {
          const th = 2 + rand() * h * 0.25;
          buildings.push({ x, z: z - d / 2, w: w * 0.62, d: d * 0.62, h: th, side, base: h });
          if (rand() > 0.5) buildings.push({ x, z: z - d / 2, w: 0.14, d: 0.14, h: 2.5 + rand() * 3, side, base: h + th });
        }
        if (h > 13 && rand() > 0.35) {
          billboards.push({ x: x - side * (w / 2 + 0.06), y: h * 0.55, z: z - d / 2, side, hue: rand() });
        }
        z -= d + 0.6 + rand() * 1.5;
      }
      // fileira de trás, mais alta
      for (let z = -1; z > -PERIOD; ) {
        const w = 4 + rand() * 5;
        const d = 4 + rand() * 5;
        buildings.push({ x: side * (17 + w / 2 + rand() * 6), z: z - d / 2, w, d, h: 12 + rand() * 28, side });
        z -= d + 1 + rand() * 3;
      }
      // quarteirões ao redor, que aparecem na vista aérea do drone
      for (let x = 44; x < 210; ) {
        const w = 6 + rand() * 6;
        for (let z = -2; z > -PERIOD; ) {
          const d = 6 + rand() * 5;
          if (rand() > 0.15) {
            buildings.push({ x: side * (x + w / 2), z: z - d / 2, w, d, h: 6 + rand() * rand() * 48, side });
          }
          z -= d + 3 + rand() * 3;
        }
        x += w + 4 + rand() * 4;
      }
      for (let z = -4; z > -PERIOD; z -= 10) {
        palms.push({ x: side * (4.6 + rand() * 0.6), z: z - rand() * 2, s: 0.85 + rand() * 0.4, r: rand() * Math.PI * 2 });
      }
    }
    return { buildings, billboards, palms };
  }, []);
}

function Buildings({ items }: { items: Building[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = items.length * COPIES;
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { ...fogUniforms },
        vertexShader: /* glsl */ `
          varying vec3 vWorld;
          varying vec3 vLocal;
          varying vec3 vN;
          varying float vId;
          varying float vTop;
          varying vec3 vCenter;
          varying vec3 vHalf;
          void main() {
            vec4 inst = instanceMatrix * vec4(position, 1.0);
            vLocal = inst.xyz;
            vN = normal;
            vId = float(gl_InstanceID);
            vTop = instanceMatrix[3].y + instanceMatrix[1].y * 0.5;
            vCenter = instanceMatrix[3].xyz;
            vHalf = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz)) * 0.5;
            vec4 w = modelMatrix * inst;
            vWorld = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          varying vec3 vLocal;
          varying vec3 vWorld;
          varying vec3 vN;
          varying float vId;
          varying float vTop;
          varying vec3 vCenter;
          varying vec3 vHalf;
          ${fogChunk}
          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          void main() {
            // fachadas viradas para a avenida pegam a luz roxa do pôr do sol
            float facing = abs(vN.x) > 0.5 ? 1.0 : 0.8;
            vec3 base = mix(vec3(0.09, 0.04, 0.18), vec3(0.2, 0.07, 0.3), smoothstep(0.0, 30.0, vLocal.y)) * facing;
            vec3 col = base;
            float tint = hash(vec2(vId, 3.7));
            vec3 neon = tint > 0.66 ? vec3(0.13, 0.83, 0.93) : (tint > 0.33 ? vec3(1.0, 0.18, 0.53) : vec3(0.55, 0.24, 1.0));
            if (abs(vN.y) < 0.5) {
              vec2 uv = abs(vN.x) > 0.5 ? vec2(vLocal.z, vLocal.y) : vec2(vLocal.x, vLocal.y);
              vec2 g = uv / vec2(0.75, 0.95);
              vec2 cell = floor(g);
              vec2 f = fract(g);
              vec2 fw = fwidth(g);
              // janela com borda suave (sem serrilhado)
              vec2 lo = smoothstep(vec2(0.22, 0.28) - fw, vec2(0.22, 0.28) + fw, f);
              vec2 hi = 1.0 - smoothstep(vec2(0.78, 0.72) - fw, vec2(0.78, 0.72) + fw, f);
              float win = lo.x * lo.y * hi.x * hi.y;
              float h = hash(cell + vId * 17.13);
              vec3 wc = h > 0.93 ? vec3(0.13, 0.83, 0.93) : (h > 0.8 ? vec3(1.0, 0.18, 0.53) : vec3(1.0, 0.78, 0.45));
              col = mix(base, wc, win * step(0.66, h) * 0.7);
              // longe demais (janela menor que um pixel): usa o brilho médio em vez de piscar
              col = mix(col, mix(base, vec3(1.0, 0.72, 0.5), 0.07), smoothstep(0.3, 0.75, max(fw.x, fw.y)));
              // faixa neon no topo e brilho da rua na base
              col = mix(col, neon, (1.0 - smoothstep(0.0, 0.35, vTop - vLocal.y)) * step(0.4, tint));
              col += vec3(0.35, 0.06, 0.3) * 0.3 * (1.0 - smoothstep(0.0, 6.0, vLocal.y));
              // quinas com neon nos prédios de uma das cores
              float across = abs(vN.x) > 0.5 ? vHalf.z - abs(vLocal.z - vCenter.z) : vHalf.x - abs(vLocal.x - vCenter.x);
              float cw = max(0.12, fwidth(across) * 1.5);
              col = mix(col, neon, (1.0 - smoothstep(0.0, cw, across)) * step(0.66, tint) * 0.9 * clamp(0.18 / cw, 0.35, 1.0));
              // faixas de andar
              float bw = fwidth(vLocal.y / 5.0);
              col *= 1.0 - 0.3 * smoothstep(0.46 - bw, 0.5, abs(fract(vLocal.y / 5.0) - 0.5)) * (1.0 - smoothstep(0.03, 0.1, bw));
            } else if (vN.y > 0.5) {
              // telhado (o que o drone vê de cima): tom mais claro e contorno neon
              float edge = min(vHalf.x - abs(vLocal.x - vCenter.x), vHalf.z - abs(vLocal.z - vCenter.z));
              col = vec3(0.17, 0.07, 0.28);
              col = mix(col, neon, (1.0 - smoothstep(0.0, max(0.35, fwidth(edge) * 1.5), edge)) * 0.85);
              // casa de máquinas/claraboia acesa em alguns telhados
              col = mix(col, vec3(1.0, 0.78, 0.45), step(0.8, tint) * (1.0 - smoothstep(0.0, 0.25, max(abs(vLocal.x - vCenter.x), abs(vLocal.z - vCenter.z)) - min(vHalf.x, vHalf.z) * 0.35)) * 0.6);
            }
            gl_FragColor = vec4(applyFog(col, vWorld), 1.0);
          }`,
      }),
    [],
  );

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    let i = 0;
    for (let c = 0; c < COPIES; c++) {
      for (const b of items) {
        m.makeScale(b.w, b.h, b.d).setPosition(b.x, (b.base ?? 0) + b.h / 2, b.z - c * PERIOD);
        mesh.setMatrixAt(i++, m);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [items]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} material={material} frustumCulled={false}>
      <boxGeometry />
    </instancedMesh>
  );
}

// ---------- outdoors verticais (Shorts) ----------

const billboardMaterial = (hue: number) =>
  new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uHue: { value: hue }, ...fogUniforms },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uHue;
      varying vec2 vUv;
      varying vec3 vWorld;
      ${fogChunk}
      void main() {
        vec3 a = mix(vec3(1.0, 0.18, 0.53), vec3(0.13, 0.83, 0.93), step(0.5, uHue));
        vec3 b = mix(vec3(1.0, 0.54, 0.24), vec3(0.55, 0.24, 1.0), step(0.5, uHue));
        float t = fract(uTime * 0.12 + uHue);
        vec3 col = mix(a, b, smoothstep(0.0, 1.0, vUv.y + sin(t * 6.283) * 0.25)) * 0.75;
        // "legenda" piscando e barra de progresso
        float cap = step(0.36, vUv.y) * step(vUv.y, 0.44) * step(0.15, vUv.x) * step(vUv.x, 0.85);
        col = mix(col, vec3(1.0), cap * step(0.35, fract(uTime * 0.7 + uHue)));
        float bar = step(0.06, vUv.y) * step(vUv.y, 0.08) * step(0.08, vUv.x) * step(vUv.x, 0.08 + 0.84 * t);
        col = mix(col, vec3(1.0, 0.82, 0.4), bar);
        // moldura neon
        float de = min(min(vUv.x, 1.0 - vUv.x) / 0.04, min(vUv.y, 1.0 - vUv.y) / 0.025);
        float edge = 1.0 - smoothstep(1.0 - fwidth(de), 1.0 + fwidth(de), de);
        col = mix(col, vec3(1.0, 0.9, 1.0), edge);
        gl_FragColor = vec4(applyFog(col * 1.25, vWorld), 1.0);
      }`,
  });

function Billboards({ items }: { items: Billboard[] }) {
  const materials = useMemo(() => items.map((b) => billboardMaterial(b.hue)), [items]);
  useFrame(({ clock }) => materials.forEach((m) => (m.uniforms.uTime.value = clock.elapsedTime)));
  return (
    <>
      {Array.from({ length: COPIES }, (_, c) =>
        items.map((b, i) => (
          <mesh
            key={`${c}-${i}`}
            position={[b.x, b.y, b.z - c * PERIOD]}
            rotation-y={(-b.side * Math.PI) / 2}
            material={materials[i]}
          >
            <planeGeometry args={[2.6, 4.6]} />
          </mesh>
        )),
      )}
    </>
  );
}

// ---------- montagem ----------

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Trajeto do drone: do alto, de lado, desce em curva até a altura de quem está na rua. */
const flightPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-90, 170, 110),
  new THREE.Vector3(-45, 95, 45),
  new THREE.Vector3(-2, 30, 22), // já sobre a avenida, acima das palmeiras e longe das fachadas
  new THREE.Vector3(0, 2.2, 8),
]);
const flightLook = new THREE.CatmullRomCurve3([
  new THREE.Vector3(20, 60, -260),
  new THREE.Vector3(8, 4, -150),
  new THREE.Vector3(0, 3, -80),
  new THREE.Vector3(0, 4, -80),
]);

/** calm: com "reduzir movimento", a avenida anda mais devagar e a câmera não segue o mouse. */
function City({ pointer, calm }: { pointer: React.RefObject<{ x: number; y: number }>; calm: boolean }) {
  const group = useRef<THREE.Group>(null);
  const layout = useCityLayout();
  const look = useMemo(() => new THREE.Vector3(), []);
  // tempo do voo somado quadro a quadro (com teto): um quadro lento não faz a câmera "pular"
  const intro = useRef({ elapsed: 0, announced: false });
  const announce = () => {
    if (intro.current.announced) return;
    intro.current.announced = true;
    announceIntroDone();
  };

  const speed = calm ? SPEED * 0.4 : SPEED;

  useFrame(({ camera, clock, scene }, dt) => {
    if (group.current) group.current.position.z = (clock.elapsedTime * speed) % PERIOD;

    // voo de abertura (o relógio começa no primeiro quadro desenhado)
    intro.current.elapsed += Math.min(dt, 1 / 20);
    const t = Math.min(1, intro.current.elapsed / INTRO_SECONDS);

    if (t < 1) {
      const u = ease(t);
      flightPath.getPoint(u, camera.position);
      camera.lookAt(flightLook.getPoint(u, look));
      const height = camera.position.y - 2.2;
      fogUniforms.uFogNear.value = FOG_NEAR + height * 1.2;
      fogUniforms.uFogFar.value = FOG_FAR + height * 2.4;
      if (scene.fog instanceof THREE.Fog) {
        scene.fog.near = fogUniforms.uFogNear.value;
        scene.fog.far = fogUniforms.uFogFar.value;
      }
      if (t > 0.72) announce();
      return;
    }
    announce();
    fogUniforms.uFogNear.value = FOG_NEAR;
    fogUniforms.uFogFar.value = FOG_FAR;
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.near = FOG_NEAR;
      scene.fog.far = FOG_FAR;
    }

    const p = calm ? { x: 0, y: 0 } : (pointer.current ?? { x: 0, y: 0 });
    const k = 1 - Math.exp(-dt * 2.5);
    camera.position.x += (p.x * 1.6 - camera.position.x) * k;
    camera.position.y += (2.2 + p.y * 0.7 - camera.position.y) * k;
    look.set(p.x * 4, 4 + p.y * 2, -80);
    camera.lookAt(look);
  });

  return (
    <>
      <fog attach="fog" args={[FOG, FOG_NEAR, FOG_FAR]} />
      <Sky />
      <Floor speed={speed} />
      <group ref={group}>
        <Buildings items={layout.buildings} />
        <Palms items={layout.palms} />
        <Billboards items={layout.billboards} />
      </group>
    </>
  );
}

export default function CityScene({ onReady, calm = false }: { onReady?: () => void; calm?: boolean }) {
  const pointer = useWindowPointer();
  const { ref, visible } = useInView<HTMLDivElement>();
  const [dpr] = useState(() => Math.min(window.devicePixelRatio || 1, 1.5));
  return (
    <div ref={ref} className="absolute inset-0">
      <Canvas
        dpr={dpr}
        frameloop={visible ? "always" : "never"}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [-90, 170, 110], fov: 55, near: 0.1, far: 2000 }}
        onCreated={() => requestAnimationFrame(() => onReady?.())}
      >
        <City pointer={pointer} calm={calm} />
        <AdaptiveDpr max={dpr} />
        <WarmUp />
      </Canvas>
    </div>
  );
}
