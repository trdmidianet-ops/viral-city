import * as THREE from "three";

/** Medidas e névoa compartilhadas pelas peças da cidade 3D (prédios, chão, palmeiras). */

export const PERIOD = 80; // trecho de cidade que se repete
export const COPIES = 4; // cópias do trecho, para o fim da avenida nunca aparecer
export const FOG_NEAR = 30;
export const FOG_FAR = 190;

// Névoa compartilhada por todos os materiais: no voo alto ela se afasta junto com a câmera
export const fogUniforms = {
  // valores crus (sem conversão de cor), iguais ao horizonte do céu: o chão some na névoa sem emenda
  uFog: { value: new THREE.Vector3(0.13, 0.04, 0.18) },
  uFogNear: { value: FOG_NEAR },
  uFogFar: { value: FOG_FAR },
};

export const fogChunk = /* glsl */ `
  uniform vec3 uFog;
  uniform float uFogNear;
  uniform float uFogFar;
  float fogFactor(vec3 world) {
    return smoothstep(uFogNear, uFogFar, length(world - cameraPosition));
  }
  vec3 applyFog(vec3 col, vec3 world) {
    return mix(col, uFog, fogFactor(world));
  }
`;

/** Onde fica cada palmeira no trecho que se repete. */
export type PalmSpot = { x: number; z: number; s: number; r: number };
