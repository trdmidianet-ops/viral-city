import { describe, expect, it } from "vitest";
import { costForDuration, parseAmount, purchaseError, quote, type UsdRates } from "./pricing";

const rates: UsdRates = { usd: 1, brl: 5.5884, eur: 0.89381, gbp: 0.7492 };

describe("costForDuration", () => {
  it("cobra 2 CityCoins por minuto, arredondando para cima", () => {
    expect(costForDuration(30 * 60)).toBe(60);
    expect(costForDuration(30 * 60 + 1)).toBe(62);
  });
  it("tem mínimo de 20", () => {
    expect(costForDuration(0)).toBe(20);
    expect(costForDuration(5 * 60)).toBe(20);
    expect(costForDuration(11 * 60)).toBe(22);
  });
});

describe("quote", () => {
  it("US$ 1 vira 100 CityCoins", () => {
    expect(quote(100, "usd", rates)).toMatchObject({ usdCents: 100, coins: 100 });
  });
  it("converte real, euro e libra para centavos de dólar, arredondando para baixo", () => {
    expect(quote(5000, "brl", rates).coins).toBe(894); // R$ 50 ÷ 5,5884 = US$ 8,947…
    expect(quote(1000, "eur", rates).coins).toBe(1118); // € 10 ÷ 0,89381 = US$ 11,188…
    expect(quote(1000, "gbp", rates).coins).toBe(1334); // £ 10 ÷ 0,7492 = US$ 13,347…
  });
  it("valor exato não perde centavo por erro de ponto flutuante", () => {
    expect(quote(2794, "brl", { ...rates, brl: 5.588 }).coins).toBe(500);
  });
  it("recusa cotação inválida", () => {
    expect(() => quote(100, "brl", { ...rates, brl: 0 })).toThrow();
  });
});

describe("purchaseError", () => {
  it("exige mínimo de US$ 1 e máximo de US$ 1.000", () => {
    expect(purchaseError(quote(99, "usd", rates))).toMatch(/mínima/);
    expect(purchaseError(quote(100, "usd", rates))).toBeNull();
    expect(purchaseError(quote(100_001, "usd", rates))).toMatch(/máxima/);
    expect(purchaseError(quote(500, "brl", rates))).toMatch(/mínima/); // R$ 5 ≈ US$ 0,89
  });
});

describe("parseAmount", () => {
  it("aceita vírgula ou ponto como decimal e separador de milhar", () => {
    expect(parseAmount("25")).toBe(2500);
    expect(parseAmount("25,5")).toBe(2550);
    expect(parseAmount("25.50")).toBe(2550);
    expect(parseAmount("R$ 1.000,00")).toBe(100000);
    expect(parseAmount("1,000.00")).toBe(100000);
    expect(parseAmount("1.000")).toBe(100000);
  });
  it("recusa valor vazio ou estranho", () => {
    expect(parseAmount("")).toBeNaN();
    expect(parseAmount("abc")).toBeNaN();
  });
});
