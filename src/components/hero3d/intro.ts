/**
 * Sinal entre a cidade 3D e o resto do hero: quando o drone está chegando na rua,
 * a cena avisa e o título e o celular aparecem. Arquivo leve de propósito (sem three.js),
 * para não puxar a cena para o carregamento inicial da página.
 */
export const INTRO_EVENT = "vc:intro-done";

type IntroWindow = Window & { __vcIntroDone?: boolean };

export function announceIntroDone() {
  (window as IntroWindow).__vcIntroDone = true;
  window.dispatchEvent(new Event(INTRO_EVENT));
}

export const isIntroDone = () => Boolean((window as IntroWindow).__vcIntroDone);
