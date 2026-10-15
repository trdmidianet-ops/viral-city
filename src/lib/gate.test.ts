import { describe, expect, it } from "vitest";
import { gateToken, safeNext } from "./gate";

describe("gate", () => {
  it("gera token estável e diferente por senha", async () => {
    const a = await gateToken("senha-1");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await gateToken("senha-1")).toBe(a);
    expect(await gateToken("senha-2")).not.toBe(a);
  });

  it("só redireciona para rotas do painel", () => {
    expect(safeNext("/painel/contas")).toBe("/painel/contas");
    expect(safeNext("/painel")).toBe("/painel");
    expect(safeNext("https://malicioso.com")).toBe("/painel");
    expect(safeNext("//malicioso.com")).toBe("/painel");
    expect(safeNext("/painel/../login")).toBe("/painel");
    expect(safeNext(undefined)).toBe("/painel");
  });
});
