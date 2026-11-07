import { describe, expect, it } from "vitest";
import { costForVariations } from "@/lib/coins/pricing";
import { cleanHeadlines, fallbackHeadlines, parseHeadlines } from "./headlines";
import { TEMPLATES, buildTemplateAss, headlineSize, planVariations, templateVideoFilter, variationParams } from "./templates";

describe("planejamento das versões", () => {
  it("reveza templates e manchetes, cobrindo combinações diferentes", () => {
    const plan = planVariations(["perfil", "tweet-escuro"], ["A", "B", "C"], 6);
    expect(plan.map((p) => p.position)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(plan.map((p) => p.headline)).toEqual(["A", "B", "C", "A", "B", "C"]);
    const pairs = new Set(plan.map((p) => `${p.template}|${p.headline}`));
    expect(pairs.size).toBe(6);
  });

  it("sem manchetes ainda gera as versões (texto vazio)", () => {
    expect(planVariations(["manchete"], [], 2).map((p) => p.headline)).toEqual(["", ""]);
  });

  it("a mesma posição gera sempre a mesma edição, e a primeira é a original", () => {
    expect(variationParams(0)).toEqual({ zoom: 1, speed: 1, offset: 0 });
    expect(variationParams(7)).toEqual(variationParams(7));
    const distinct = new Set(Array.from({ length: 10 }, (_, i) => JSON.stringify(variationParams(i))));
    expect(distinct.size).toBeGreaterThan(5);
  });

  it("custa 2 CityCoins por versão", () => {
    expect(costForVariations(1)).toBe(2);
    expect(costForVariations(30)).toBe(60);
  });
});

describe("templates", () => {
  const opts = { headline: "Olha isso {aqui}", cta: "segue a página", name: "Portal GTA 6", handle: "@portalgta6", verified: true, hasAvatar: false, duration: 12.5, font: "Impact" };

  it("todo template gera um filtro que termina em [base] e um ASS com o texto", () => {
    for (const t of TEMPLATES) {
      for (const withAvatar of [false, true]) {
        const filter = templateVideoFilter(t.id, { zoom: 1.06, speed: 1.05, offset: 0 }, withAvatar);
        expect(filter.endsWith("[base]")).toBe(true);
        expect(filter).toContain("pad=1080:1920");
        expect(filter).toContain("setpts=PTS/1.05");
      }
      const ass = buildTemplateAss(t.id, opts);
      expect(ass).toContain("PlayResY: 1920");
      expect(ass).toMatch(/OLHA ISSO AQUI|Olha isso aqui/);
      expect(ass).not.toContain("{aqui}");
      expect(ass).toContain("0:00:12.50");
    }
  });

  it("os templates de página mostram o perfil com nome, @ e selo", () => {
    const ass = buildTemplateAss("perfil", opts);
    expect(ass).toContain("Portal GTA 6");
    expect(ass).toContain("@portalgta6");
    expect(ass).toContain("&H00F09B1D"); // azul do selo
    expect(buildTemplateAss("perfil", { ...opts, verified: false })).not.toContain("&H00F09B1D");
    expect(buildTemplateAss("manchete", opts)).not.toContain("@portalgta6");
  });

  it("sem foto desenha a inicial; com foto, a foto entra no filtro em círculo", () => {
    expect(buildTemplateAss("tweet-claro", opts)).toMatch(/}P$/m);
    expect(buildTemplateAss("tweet-claro", { ...opts, hasAvatar: true })).not.toMatch(/}P$/m);
    expect(templateVideoFilter("perfil", { zoom: 1, speed: 1, offset: 0 }, true)).toContain("hypot(");
  });

  it("só o template com chamada mostra o texto de baixo", () => {
    expect(buildTemplateAss("perfil-cta", opts)).toContain("segue a página");
    expect(buildTemplateAss("perfil", opts)).not.toContain("segue a página");
  });

  it("textos longos ficam menores", () => {
    expect(headlineSize("curta", 96)).toBe(96);
    expect(headlineSize("x".repeat(80), 96)).toBeLessThan(70);
  });
});

describe("manchetes", () => {
  it("limpa a lista digitada: marcadores, vazias e repetidas", () => {
    expect(cleanHeadlines("- Primeira\n\n2) Segunda\nprimeira\n   ")).toEqual(["Primeira", "Segunda"]);
  });

  it("lê a resposta da IA mesmo com texto em volta", () => {
    expect(parseHeadlines('Aqui vai: {"headlines":["Um","Dois","Um"]} pronto')).toEqual(["Um", "Dois"]);
    expect(parseHeadlines("sem json")).toEqual([]);
  });

  it("sem IA, varia o assunto com fórmulas de gancho", () => {
    const list = fallbackHeadlines("o mapa novo de GTA 6", 4);
    expect(list).toHaveLength(4);
    expect(list[0]).toBe("o mapa novo de GTA 6");
    expect(fallbackHeadlines("", 3)).toEqual([]);
  });
});
