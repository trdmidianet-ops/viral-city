import { describe, expect, it } from "vitest";
import { maskEmail, normalizeCode, suggestCode } from "./referrals";

describe("cupons", () => {
  it("normaliza o que a pessoa digita", () => {
    expect(normalizeCode(" torres 10 ")).toBe("TORRES10");
    expect(normalizeCode("joão-10")).toBe("JOAO10");
    expect(normalizeCode("ab")).toBeNull();
    expect(normalizeCode("")).toBeNull();
  });

  it("sugere um cupom a partir do nome ou e-mail", () => {
    expect(suggestCode("torres@gmail.com")).toBe("TORRES10");
    expect(suggestCode("ana.silva123@gmail.com")).toBe("ANASILVA10");
    expect(suggestCode("jo@x.com")).toBe("VIRAL10");
    expect(suggestCode("ab123@x.com")).toBe("ABCITY10");
  });

  it("mascara o e-mail dos indicados", () => {
    expect(maskEmail("ana.silva@gmail.com")).toBe("an•••@gmail.com");
  });
});
