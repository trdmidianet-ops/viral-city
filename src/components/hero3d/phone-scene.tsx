"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useInView, useStillFrames, useWindowPointer } from "./pointer";

/**
 * Celular 3D contando o produto em 11 segundos: um vídeo longo (fita) passa na frente,
 * uma lâmina neon corta em 5 trechos com nota, e cada corte voa para a tela do celular.
 */

const LOOP = 11;
const SEG_W = 0.56;
const SEG_H = 0.4;
const GAP = 0.2;
const TAPE_Y = 0.15;
const TAPE_Z = 1.3;
const SCREEN = new THREE.Vector3(0, 0.1, 0.13);

const CLIPS = [
  { score: "9.4", hook: "O ERRO QUE CUSTA CARO", from: "#ff2e88", to: "#ff8a3d" },
  { score: "8.7", hook: "NINGUÉM TE CONTA ISSO", from: "#8b3dff", to: "#22d3ee" },
  { score: "9.1", hook: "FIZ ISSO POR 30 DIAS", from: "#ff8a3d", to: "#ffd166" },
  { score: "7.9", hook: "A VIRADA FOI AQUI", from: "#22d3ee", to: "#8b3dff" },
  { score: "8.8", hook: "ASSISTA ATÉ O FIM", from: "#ff2e88", to: "#8b3dff" },
];

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const span = (t: number, a: number, b: number) => ease((t - a) / (b - a));
const bladeX = (t: number) => -2.2 + 4.4 * span(t, 1.2, 2.8);
const flyStart = (i: number) => 3.3 + i * 0.9;
const DONE = 8.4;
const RESET = 10.2;

function fonts() {
  const css = getComputedStyle(document.body);
  return {
    display: css.getPropertyValue("--font-heading").trim() || "system-ui, sans-serif",
    body: css.getPropertyValue("--font-body").trim() || "system-ui, sans-serif",
  };
}

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** ShapeGeometry com UV de 0 a 1, para a textura ocupar a tela toda. */
function screenGeometry(w: number, h: number, r: number) {
  const g = new THREE.ShapeGeometry(roundedRect(w, h, r), 12);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  return g;
}

// ---------- texturas desenhadas em canvas ----------

function gradient(ctx: CanvasRenderingContext2D, w: number, h: number, from: string, to: string) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, from);
  g.addColorStop(1, to);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function segmentTexture(i: number, scored: boolean, f: ReturnType<typeof fonts>) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 184;
  const ctx = c.getContext("2d")!;
  const clip = CLIPS[i];
  gradient(ctx, 256, 184, clip.from, clip.to);
  // furos de filme em cima e embaixo
  ctx.fillStyle = "#0b0618";
  ctx.fillRect(0, 0, 256, 26);
  ctx.fillRect(0, 158, 256, 26);
  ctx.fillStyle = "rgba(246,238,254,0.85)";
  for (let x = 8; x < 256; x += 26) {
    ctx.fillRect(x, 8, 14, 10);
    ctx.fillRect(x, 166, 14, 10);
  }
  // onda de áudio
  ctx.fillStyle = "rgba(11,6,24,0.45)";
  for (let x = 14; x < 242; x += 9) {
    const h = 10 + Math.abs(Math.sin(x * 0.11 + i * 1.7)) * 46;
    ctx.fillRect(x, 92 - h / 2, 5, h);
  }
  ctx.font = `600 18px ${f.body}`;
  ctx.fillStyle = "#f6eefe";
  ctx.fillText(`${String(i * 7 + 3).padStart(2, "0")}:${String((i * 23) % 60).padStart(2, "0")}`, 12, 148);
  if (scored) {
    ctx.fillStyle = "#0b0618";
    ctx.beginPath();
    ctx.roundRect(150, 34, 96, 40, 20);
    ctx.fill();
    ctx.font = `800 28px ${f.display}`;
    ctx.fillStyle = "#ffd166";
    ctx.fillText(`★${clip.score}`, 160, 66);
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 250, 178);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  lines.push(line);
  return lines;
}

function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, p: number, color: string) {
  ctx.fillStyle = "rgba(246,238,254,0.18)";
  ctx.beginPath();
  ctx.roundRect(x, y, w, 10, 5);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(10, w * p), 10, 5);
  ctx.fill();
}

/** Desenha a tela do celular para o instante t do loop. */
function drawScreen(ctx: CanvasRenderingContext2D, t: number, f: ReturnType<typeof fonts>) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const playing = CLIPS.findLastIndex((_, i) => t >= flyStart(i) + 0.6);
  ctx.textAlign = "left";

  if (t >= DONE) {
    // resumo: cortes prontos e agendados
    gradient(ctx, W, H, "#140a2a", "#2a0f4a");
    ctx.font = `800 44px ${f.display}`;
    ctx.fillStyle = "#ffd166";
    ctx.fillText("5 CORTES", 36, 170);
    ctx.fillStyle = "#f6eefe";
    ctx.fillText("PRONTOS", 36, 222);
    CLIPS.forEach((clip, i) => {
      const y = 290 + i * 86;
      const g = ctx.createLinearGradient(36, 0, 110, 0);
      g.addColorStop(0, clip.from);
      g.addColorStop(1, clip.to);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(36, y, 52, 70, 10);
      ctx.fill();
      ctx.font = `600 20px ${f.body}`;
      ctx.fillStyle = "#f6eefe";
      ctx.fillText(clip.hook.slice(0, 18), 104, y + 30);
      ctx.font = `800 22px ${f.display}`;
      ctx.fillStyle = "#ffd166";
      ctx.fillText(`★ ${clip.score}`, 104, y + 60);
    });
    ctx.fillStyle = "#ff2e88";
    ctx.beginPath();
    ctx.roundRect(36, H - 128, W - 72, 64, 32);
    ctx.fill();
    ctx.font = `700 22px ${f.body}`;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText("Agendado no YouTube · 18h", W / 2, H - 88);
    return;
  }

  if (playing >= 0) {
    // corte tocando, com gancho, nota e legenda
    const clip = CLIPS[playing];
    const local = (t - flyStart(playing) - 0.6) / 0.9;
    gradient(ctx, W, H, clip.from, clip.to);
    ctx.fillStyle = "rgba(11,6,24,0.28)";
    ctx.beginPath();
    ctx.arc(W / 2, H * 0.42, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(246,238,254,0.9)";
    ctx.beginPath();
    ctx.moveTo(W / 2 - 34, H * 0.42 - 46);
    ctx.lineTo(W / 2 + 50, H * 0.42);
    ctx.lineTo(W / 2 - 34, H * 0.42 + 46);
    ctx.fill();

    ctx.font = `600 22px ${f.body}`;
    ctx.fillStyle = "#f6eefe";
    ctx.fillText(`Corte ${playing + 1}/5`, 32, 70);
    ctx.fillStyle = "#0b0618";
    ctx.beginPath();
    ctx.roundRect(W - 150, 38, 120, 48, 24);
    ctx.fill();
    ctx.font = `800 28px ${f.display}`;
    ctx.fillStyle = "#ffd166";
    ctx.fillText(`★${clip.score}`, W - 136, 74);

    ctx.font = `800 46px ${f.display}`;
    ctx.textAlign = "center";
    ctx.lineJoin = "round";
    ctx.lineWidth = 10;
    ctx.strokeStyle = "#0b0618";
    ctx.fillStyle = "#fff";
    wrap(ctx, clip.hook, W - 70).forEach((line, i) => {
      ctx.strokeText(line, W / 2, H * 0.7 + i * 54);
      ctx.fillText(line, W / 2, H * 0.7 + i * 54);
    });
    bar(ctx, 32, H - 54, W - 64, Math.min(1, Math.max(0, local)), "#ffd166");
    return;
  }

  // vídeo longo chegando: transcrição e análise da IA
  gradient(ctx, W, H, "#0b0618", "#1e1140");
  ctx.font = `800 30px ${f.display}`;
  ctx.fillStyle = "#f6eefe";
  ctx.fillText("VÍDEO LONGO", 36, 150);
  ctx.font = `600 22px ${f.body}`;
  ctx.fillStyle = "#b7a8d6";
  ctx.fillText("42:18 · seu canal", 36, 188);
  ctx.fillStyle = "rgba(255,46,136,0.75)";
  for (let x = 36; x < W - 36; x += 12) {
    const h = 14 + Math.abs(Math.sin(x * 0.07 + t * 5)) * 70;
    ctx.fillRect(x, 330 - h / 2, 7, h);
  }
  const cutting = t >= 1.2;
  ctx.font = `600 22px ${f.body}`;
  ctx.fillStyle = "#f6eefe";
  ctx.fillText(cutting ? "A IA está escolhendo" : "Transcrevendo a fala…", 36, 470);
  if (cutting) ctx.fillText("os melhores momentos…", 36, 500);
  bar(ctx, 36, 530, W - 72, cutting ? span(t, 1.2, 3.2) : span(t, 0, 1.2), cutting ? "#22d3ee" : "#ff2e88");
  ctx.font = `800 30px ${f.display}`;
  ctx.fillStyle = "#ffd166";
  CLIPS.forEach((clip, i) => {
    if (bladeX(t) > (i - 2) * SEG_W) ctx.fillText(`★${clip.score}`, 36 + (i % 3) * 112, 610 + Math.floor(i / 3) * 52);
  });
}

// ---------- cena ----------

function Phone({ pointer, still }: { pointer: React.RefObject<{ x: number; y: number }>; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const blade = useRef<THREE.Group>(null);
  const segments = useRef<(THREE.Mesh | null)[]>([]);
  const invalidate = useThree((s) => s.invalidate);

  const assets = useMemo(() => {
    const f = fonts();
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 836;
    const screenTex = new THREE.CanvasTexture(canvas);
    screenTex.colorSpace = THREE.SRGBColorSpace;
    const body = new THREE.ExtrudeGeometry(roundedRect(1.7, 3.42, 0.28), {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 4,
      curveSegments: 12,
    });
    body.translate(0, 0, -0.07);
    const rimShape = roundedRect(1.86, 3.58, 0.34);
    rimShape.holes.push(roundedRect(1.78, 3.5, 0.31));
    return {
      f,
      ctx: canvas.getContext("2d")!,
      screenTex,
      body,
      screen: screenGeometry(1.56, 3.26, 0.22),
      rim: new THREE.ShapeGeometry(rimShape, 12),
      plain: CLIPS.map((_, i) => segmentTexture(i, false, f)),
      scored: CLIPS.map((_, i) => segmentTexture(i, true, f)),
    };
  }, []);

  useStillFrames(still);

  // a fonte da marca pode chegar depois do primeiro quadro
  useEffect(() => {
    document.fonts?.ready.then(() => {
      Object.assign(assets.f, fonts());
      assets.scored.forEach((tex, i) => {
        const fresh = segmentTexture(i, true, assets.f);
        tex.image = fresh.image;
        tex.needsUpdate = true;
      });
      invalidate();
    });
  }, [assets, invalidate]);

  useFrame(({ clock }) => {
    const elapsed = clock.elapsedTime;
    const t = still ? 4.5 : elapsed % LOOP;
    const p = pointer.current ?? { x: 0, y: 0 };

    if (group.current) {
      group.current.rotation.y = -0.28 + p.x * 0.35 + (still ? 0 : Math.sin(elapsed * 0.6) * 0.06);
      group.current.rotation.x = -p.y * 0.18;
      group.current.position.y = still ? 0 : Math.sin(elapsed * 0.9) * 0.06;
    }
    if (blade.current) {
      blade.current.position.x = bladeX(t);
      blade.current.visible = t > 1.15 && t < 2.9;
    }

    segments.current.forEach((mesh, i) => {
      if (!mesh) return;
      const material = mesh.material as THREE.MeshBasicMaterial;
      const cut = ease((bladeX(t) - (i - 2) * SEG_W + 0.1) / 0.5);
      const spread = (i - 2) * (SEG_W + 0.02 + GAP * cut);
      const fly = span(t, flyStart(i), flyStart(i) + 0.65);
      const back = span(t, RESET, RESET + 0.7);
      const home = new THREE.Vector3(spread, TAPE_Y + Math.sin(elapsed * 2 + i) * 0.03 * cut, TAPE_Z);
      if (t >= RESET) {
        mesh.position.set((i - 2) * (SEG_W + 0.02), TAPE_Y, TAPE_Z);
        mesh.scale.setScalar(back);
        material.opacity = back;
        material.map = assets.plain[i];
        mesh.rotation.set(0, 0, 0);
      } else {
        mesh.position.lerpVectors(home, SCREEN, fly);
        mesh.position.z += Math.sin(fly * Math.PI) * 0.7;
        mesh.scale.setScalar(1 - fly * 0.75);
        material.opacity = 1 - span(fly, 0.7, 1);
        material.map = cut > 0.5 ? assets.scored[i] : assets.plain[i];
        mesh.rotation.set(0, 0, (i - 2) * 0.05 * cut * (1 - fly));
      }
      mesh.visible = material.opacity > 0.01;
    });

    drawScreen(assets.ctx, t, assets.f);
    assets.screenTex.needsUpdate = true;
  });

  return (
    <group ref={group}>
      <mesh position={[0, 0, -0.9]}>
        <planeGeometry args={[5, 6]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader="varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }"
          fragmentShader="varying vec2 vUv; void main(){ float d = length((vUv - 0.5) * vec2(1.0, 1.2)); vec3 c = mix(vec3(1.0,0.18,0.53), vec3(0.55,0.24,1.0), vUv.y); gl_FragColor = vec4(c, smoothstep(0.5, 0.0, d) * 0.55); }"
        />
      </mesh>
      <mesh geometry={assets.body}>
        <meshStandardMaterial color="#1a1030" metalness={0.75} roughness={0.32} />
      </mesh>
      <mesh geometry={assets.rim}>
        <meshBasicMaterial color="#ff2e88" toneMapped={false} />
      </mesh>
      <mesh geometry={assets.screen} position-z={0.115}>
        <meshBasicMaterial map={assets.screenTex} toneMapped={false} />
      </mesh>

      {CLIPS.map((_, i) => (
        <mesh key={i} ref={(m) => void (segments.current[i] = m)}>
          <boxGeometry args={[SEG_W, SEG_H, 0.03]} />
          <meshBasicMaterial map={assets.plain[i]} transparent toneMapped={false} />
        </mesh>
      ))}

      <group ref={blade} position={[0, TAPE_Y, TAPE_Z + 0.06]}>
        <mesh>
          <planeGeometry args={[0.035, 0.95]} />
          <meshBasicMaterial color="#fff2fb" toneMapped={false} />
        </mesh>
        <mesh>
          <planeGeometry args={[0.35, 1.1]} />
          <meshBasicMaterial color="#ff2e88" transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

export default function PhoneScene({ still = false }: { still?: boolean }) {
  const pointer = useWindowPointer();
  const { ref, visible } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className="h-full w-full">
      <Canvas
        dpr={[1, 2]}
        frameloop={still ? "demand" : visible ? "always" : "never"}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0, 8.4], fov: 32 }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[-3, 2.5, 3]} intensity={40} color="#ff2e88" />
        <pointLight position={[3, -1.5, 2.5]} intensity={28} color="#22d3ee" />
        <Phone pointer={pointer} still={still} />
      </Canvas>
    </div>
  );
}
