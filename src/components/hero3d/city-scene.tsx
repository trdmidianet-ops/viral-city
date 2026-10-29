"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { announceIntroDone } from "./intro";
import { Sky } from "./sky";
import { seeded, useInView, useWindowPointer } from "./pointer";

/**
 * Avenida neon em 3D: a página abre com um voo de drone sobre a cidade que desce e entra
 * na avenida; depois a câmera "dirige" rumo ao pôr do sol entre prédios, palmeiras e
 * outdoors verticais passando Shorts. Tudo gerado em código, sem assets.
 */

const FOG = "#4a1752";
const PERIOD = 80; // trecho de cidade que se repete
const COPIES = 4; // cópias do trecho, para o fim da avenida nunca aparecer
const SPEED = 7; // unidades por segundo
const FOG_NEAR = 30;
const FOG_FAR = 190;
const INTRO_SECONDS = 6.5;

// Névoa compartilhada por todos os materiais: no voo alto ela se afasta junto com a câmera
const fogUniforms = {
  // valores crus (sem conversão de cor), iguais ao horizonte do céu: o chão some na névoa sem emenda
  uFog: { value: new THREE.Vector3(0.13, 0.04, 0.18) },
  uFogNear: { value: FOG_NEAR },
  uFogFar: { value: FOG_FAR },
};

const fogChunk = /* glsl */ `
  uniform vec3 uFog;
  uniform float uFogNear;
  uniform float uFogFar;
  vec3 applyFog(vec3 col, vec3 world) {
    float d = length(world - cameraPosition);
    return mix(col, uFog, smoothstep(uFogNear, uFogFar, d));
  }
`;

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
            return 1.0 - smoothstep(0.0, fwidth(v) * 1.5, f);
          }
          void main() {
            vec2 p = vec2(vWorld.x, vWorld.z + uOffset);
            vec3 col = vec3(0.07, 0.024, 0.16);
            float g = max(gridLine(p.x, 4.0), gridLine(p.y, 4.0));
            col = mix(col, vec3(1.0, 0.18, 0.53), g * 0.8);
            // faixas laterais da avenida em ciano e faixa central tracejada
            float edge = 1.0 - smoothstep(0.05, 0.18, abs(abs(vWorld.x) - 3.8));
            col = mix(col, vec3(0.13, 0.83, 0.93), edge);
            float dash = step(0.5, fract(p.y / 6.0)) * (1.0 - smoothstep(0.06, 0.14, abs(vWorld.x)));
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
    const palms: { x: number; z: number; s: number; r: number }[] = [];

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
              vec2 size = vec2(0.75, 0.95);
              vec2 cell = floor(uv / size);
              vec2 f = fract(uv / size);
              float win = step(0.22, f.x) * step(f.x, 0.78) * step(0.28, f.y) * step(f.y, 0.72);
              float h = hash(cell + vId * 17.13);
              vec3 wc = h > 0.93 ? vec3(0.13, 0.83, 0.93) : (h > 0.8 ? vec3(1.0, 0.18, 0.53) : vec3(1.0, 0.78, 0.45));
              col = mix(base, wc, win * step(0.66, h) * 0.7);
              // faixa neon no topo e brilho da rua na base
              col = mix(col, neon, (1.0 - smoothstep(0.0, 0.35, vTop - vLocal.y)) * step(0.4, tint));
              col += vec3(0.35, 0.06, 0.3) * 0.3 * (1.0 - smoothstep(0.0, 6.0, vLocal.y));
              // quinas com neon nos prédios de uma das cores
              float across = abs(vN.x) > 0.5 ? vHalf.z - abs(vLocal.z - vCenter.z) : vHalf.x - abs(vLocal.x - vCenter.x);
              col = mix(col, neon, (1.0 - smoothstep(0.0, 0.12, across)) * step(0.66, tint) * 0.9);
              // faixas de andar
              col *= 1.0 - 0.3 * smoothstep(0.46, 0.5, abs(fract(vLocal.y / 5.0) - 0.5));
            } else if (vN.y > 0.5) {
              // telhado (o que o drone vê de cima): tom mais claro e contorno neon
              float edge = min(vHalf.x - abs(vLocal.x - vCenter.x), vHalf.z - abs(vLocal.z - vCenter.z));
              col = vec3(0.17, 0.07, 0.28);
              col = mix(col, neon, (1.0 - smoothstep(0.0, 0.35, edge)) * 0.85);
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

function palmGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const trunk = new THREE.CylinderGeometry(0.07, 0.15, 6, 6);
  trunk.translate(0, 3, 0);
  parts.push(trunk);
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.ConeGeometry(0.22, 2.6, 4);
    leaf.translate(0, 1.3, 0);
    leaf.scale(1, 1, 0.25);
    leaf.rotateZ(-1.75 - (i % 2) * 0.35);
    leaf.rotateY((i / 7) * Math.PI * 2);
    leaf.translate(0, 6, 0);
    parts.push(leaf);
  }
  return mergeGeometries(parts.map((p) => p.toNonIndexed()));
}

function Palms({ items }: { items: { x: number; z: number; s: number; r: number }[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(palmGeometry, []);
  const count = items.length * COPIES;

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    let i = 0;
    for (let c = 0; c < COPIES; c++) {
      for (const p of items) {
        q.setFromEuler(new THREE.Euler(0, p.r, Math.sign(p.x) * 0.06));
        m.compose(new THREE.Vector3(p.x, 0, p.z - c * PERIOD), q, new THREE.Vector3(p.s, p.s, p.s));
        mesh.setMatrixAt(i++, m);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [items]);

  return (
    <instancedMesh ref={ref} args={[geometry, undefined, count]} frustumCulled={false}>
      <meshBasicMaterial color="#0b0618" fog />
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
        float edge = max(step(vUv.x, 0.04) + step(0.96, vUv.x), step(vUv.y, 0.025) + step(0.975, vUv.y));
        col = mix(col, vec3(1.0, 0.9, 1.0), min(edge, 1.0));
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
  const intro = useRef({ start: -1, announced: false });
  const announce = () => {
    if (intro.current.announced) return;
    intro.current.announced = true;
    announceIntroDone();
  };

  const speed = calm ? SPEED * 0.4 : SPEED;

  useFrame(({ camera, clock, scene }, dt) => {
    if (group.current) group.current.position.z = (clock.elapsedTime * speed) % PERIOD;

    // voo de abertura (o relógio começa no primeiro quadro desenhado)
    const now = clock.elapsedTime;
    if (intro.current.start < 0) intro.current.start = now;
    const t = Math.min(1, (now - intro.current.start) / INTRO_SECONDS);

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
      </Canvas>
    </div>
  );
}
