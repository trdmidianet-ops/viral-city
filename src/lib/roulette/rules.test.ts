import { describe, expect, it } from "vitest";
import {
  JACKPOT_COINS,
  JACKPOT_FALLBACK_COINS,
  PRIZES,
  TOTAL_WEIGHT,
  approvalsSpinKey,
  expectedCoins,
  odds,
  prizeForRoll,
} from "./rules";

describe("regras da roleta", () => {
  it("as chances somam 100%", () => {
    expect(TOTAL_WEIGHT).toBe(1000);
    expect(odds().reduce((sum, o) => sum + o.percent, 0)).toBeCloseTo(100, 6);
  });

  it("quanto maior o prêmio, menor a chance", () => {
    for (let i = 1; i < PRIZES.length; i++) {
      expect(PRIZES[i].coins).toBeGreaterThan(PRIZES[i - 1].coins);
      expect(PRIZES[i].weight).toBeLessThan(PRIZES[i - 1].weight);
    }
  });

  it("o prêmio médio é 19,9 CityCoins", () => {
    expect(expectedCoins()).toBeCloseTo(19.9, 6);
  });

  it("o prêmio máximo e o substituto existem na tabela", () => {
    const coins = PRIZES.map((p) => p.coins as number);
    expect(Math.max(...coins)).toBe(JACKPOT_COINS);
    expect(coins).toContain(JACKPOT_FALLBACK_COINS);
  });

  it("cada faixa do sorteio cai no prêmio certo", () => {
    expect(prizeForRoll(0)).toBe(5);
    expect(prizeForRoll(279)).toBe(5);
    expect(prizeForRoll(280)).toBe(10);
    expect(prizeForRoll(519)).toBe(10);
    expect(prizeForRoll(520)).toBe(15);
    expect(prizeForRoll(994)).toBe(100);
    expect(prizeForRoll(995)).toBe(500);
    expect(prizeForRoll(999)).toBe(500);
  });

  it("percorrendo todos os sorteios, cada prêmio sai exatamente o seu peso", () => {
    const seen = new Map<number, number>();
    for (let roll = 0; roll < TOTAL_WEIGHT; roll++) {
      const prize = prizeForRoll(roll);
      seen.set(prize, (seen.get(prize) ?? 0) + 1);
    }
    for (const p of PRIZES) expect(seen.get(p.coins)).toBe(p.weight);
  });

  it("a cada 5 cortes aprovados sai uma chave nova de giro", () => {
    expect(approvalsSpinKey(0)).toBeNull();
    expect(approvalsSpinKey(4)).toBeNull();
    expect(approvalsSpinKey(5)).toBe("cuts:5");
    expect(approvalsSpinKey(9)).toBe("cuts:5");
    expect(approvalsSpinKey(10)).toBe("cuts:10");
    expect(approvalsSpinKey(-3)).toBeNull();
  });

  it("recusa sorteio fora da faixa", () => {
    expect(() => prizeForRoll(-1)).toThrow();
    expect(() => prizeForRoll(1000)).toThrow();
    expect(() => prizeForRoll(1.5)).toThrow();
  });
});
