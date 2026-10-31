import * as THREE from "three";
import { seeded } from "./pointer";

/**
 * Geometria das palmeiras, gerada em código. São três modelos (altura, inclinação e copa
 * diferentes) para a avenida não parecer copiada e colada.
 *
 * Cada vértice carrega:
 * - aKind: 0 tronco, 1 folha, 2 coco, 3 folha seca
 * - aSway: quanto balança no vento (0 na base → 1 na copa)
 * - aEdge: no tronco, a altura (para os anéis); na folha, 0 na nervura → 1 na ponta do folíolo
 */

export type PalmVariant = { seed: number; height: number; lean: number; fronds: number; dead: number };

export const PALM_VARIANTS: PalmVariant[] = [
  { seed: 23, height: 6.6, lean: 0.9, fronds: 14, dead: 3 },
  { seed: 57, height: 5.3, lean: 0.35, fronds: 12, dead: 2 },
  { seed: 91, height: 7.8, lean: 1.5, fronds: 15, dead: 4 },
];

type Builder = { pos: number[]; kind: number[]; sway: number[]; edge: number[] };

function tri(b: Builder, pts: THREE.Vector3[], kind: number, sway: number[], edge: number[]) {
  pts.forEach((p, i) => {
    b.pos.push(p.x, p.y, p.z);
    b.kind.push(kind);
    b.sway.push(sway[i]);
    b.edge.push(edge[i]);
  });
}

const trunkAt = (v: PalmVariant, t: number) => new THREE.Vector3(v.lean * t * t, v.height * t, 0);

/** Tronco grosso na base (com "pé" alargado), afinando para cima, com escamas em anéis. */
function addTrunk(b: Builder, v: PalmVariant) {
  const rings = 16;
  const sides = 9;
  const ring = (k: number) => {
    const t = k / rings;
    const c = trunkAt(v, t);
    // base alargada + afinamento + escamas (anéis alternados um pouco mais grossos)
    const r = (0.15 + 0.08 * (1 - t) + 0.14 * Math.exp(-t * 10)) * (1 + 0.07 * (k % 2));
    return Array.from({ length: sides }, (_, j) => {
      const a = (j / sides) * Math.PI * 2;
      return new THREE.Vector3(c.x + Math.cos(a) * r, c.y, c.z + Math.sin(a) * r);
    });
  };
  for (let k = 0; k < rings; k++) {
    const lo = ring(k);
    const hi = ring(k + 1);
    const t0 = k / rings;
    const t1 = (k + 1) / rings;
    for (let j = 0; j < sides; j++) {
      const n = (j + 1) % sides;
      tri(b, [lo[j], hi[j], lo[n]], 0, [t0 * t0, t1 * t1, t0 * t0], [t0, t1, t0]);
      tri(b, [lo[n], hi[j], hi[n]], 0, [t0 * t0, t1 * t1, t1 * t1], [t0, t1, t1]);
    }
  }
}

/**
 * Uma folha: nervura em arco que sobe pouco e cai na ponta, com folíolos longos e finos
 * dos dois lados, pendurados em V (como as palmeiras de verdade).
 */
function addFrond(
  b: Builder,
  crown: THREE.Vector3,
  f: { angle: number; len: number; lift: number; droop: number; kind?: number },
) {
  const steps = 18;
  const L = 2.9 * f.len;
  const cos = Math.cos(f.angle);
  const sin = Math.sin(f.angle);
  const at = (t: number, side = 0, out = 0, down = 0) => {
    const x = L * t + out;
    const y = f.lift * t - f.droop * t * t - down;
    return new THREE.Vector3(crown.x + x * cos - side * sin, crown.y + y, crown.z + x * sin + side * cos);
  };
  const kind = f.kind ?? 1;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const ll = 0.85 * f.len * Math.sin(Math.PI * (0.08 + 0.92 * t)) * (1 - 0.35 * t);
    const b0 = at(t - 0.35 / steps);
    const b1 = at(t + 0.35 / steps);
    for (const side of [-1, 1]) {
      // folíolo estreito: largo na nervura, fino na ponta, pendurado para baixo e para a frente
      const tip0 = at(t + 0.15 / steps, side * ll, ll * 0.35, ll * 0.75);
      const tip1 = at(t + 0.35 / steps, side * ll, ll * 0.35, ll * 0.75);
      tri(b, [b0, b1, tip1], kind, [1, 1, 1], [0, 0, 1]);
      tri(b, [b0, tip1, tip0], kind, [1, 1, 1], [0, 1, 1]);
    }
  }
}

function addCoconuts(b: Builder, crown: THREE.Vector3) {
  const base = new THREE.IcosahedronGeometry(0.17, 0).toNonIndexed();
  const p = base.attributes.position;
  for (const [dx, dz] of [
    [-0.12, 0.14],
    [0.16, 0.05],
    [0.0, -0.17],
  ]) {
    for (let i = 0; i < p.count; i += 3) {
      const pts = [0, 1, 2].map(
        (k) => new THREE.Vector3(p.getX(i + k) + crown.x + dx, p.getY(i + k) + crown.y - 0.3, p.getZ(i + k) + crown.z + dz),
      );
      tri(b, pts, 2, [1, 1, 1], [0, 0, 0]);
    }
  }
}

export function palmGeometry(v: PalmVariant) {
  const b: Builder = { pos: [], kind: [], sway: [], edge: [] };
  const rand = seeded(v.seed);
  const crown = trunkAt(v, 1);
  addTrunk(b, v);
  // copa irregular: folhas de tamanhos, alturas e quedas diferentes
  for (let i = 0; i < v.fronds; i++) {
    addFrond(b, crown, {
      angle: (i / v.fronds) * Math.PI * 2 + (rand() - 0.5) * 0.6,
      len: 0.75 + rand() * 0.5,
      lift: 0.3 + rand() * 0.65,
      droop: 2.2 + rand() * 1.5,
    });
  }
  // folhas novas, mais curtas e para cima
  for (let i = 0; i < 3; i++) {
    addFrond(b, crown, { angle: (i / 3) * Math.PI * 2 + rand(), len: 0.45 + rand() * 0.2, lift: 1.6, droop: 0.9 });
  }
  // folhas secas penduradas embaixo da copa
  const low = crown.clone().add(new THREE.Vector3(0, -0.25, 0));
  for (let i = 0; i < v.dead; i++) {
    addFrond(b, low, { angle: rand() * Math.PI * 2, len: 0.6 + rand() * 0.25, lift: -0.6, droop: 2.4 + rand(), kind: 3 });
  }
  addCoconuts(b, crown);

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(b.pos, 3));
  g.setAttribute("aKind", new THREE.Float32BufferAttribute(b.kind, 1));
  g.setAttribute("aSway", new THREE.Float32BufferAttribute(b.sway, 1));
  g.setAttribute("aEdge", new THREE.Float32BufferAttribute(b.edge, 1));
  g.computeVertexNormals();
  return g;
}
