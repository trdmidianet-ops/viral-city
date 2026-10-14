import { describe, expect, it } from "vitest";
import { engagementRate, formatDuration, parseDuration, timeAgo, viewsPerHour } from "./metrics";
import { niches, parseFilters } from "./niches";

describe("parseDuration", () => {
  it("converte formatos ISO 8601 do YouTube", () => {
    expect(parseDuration("PT45S")).toBe(45);
    expect(parseDuration("PT1M5S")).toBe(65);
    expect(parseDuration("PT2H3M")).toBe(7380);
    expect(parseDuration("P1DT1S")).toBe(86401);
    expect(parseDuration("P0D")).toBe(0);
  });
  it("retorna 0 para valores inválidos", () => {
    expect(parseDuration("")).toBe(0);
    expect(parseDuration("abc")).toBe(0);
  });
});

describe("formatDuration", () => {
  it("formata m:ss e h:mm:ss", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(7380)).toBe("2:03:00");
  });
});

describe("métricas", () => {
  const now = Date.parse("2026-10-14T12:00:00Z");
  it("calcula views por hora com mínimo de 1 hora", () => {
    expect(viewsPerHour(1000, "2026-10-14T02:00:00Z", now)).toBe(100);
    expect(viewsPerHour(500, "2026-10-14T11:59:00Z", now)).toBe(500);
  });
  it("calcula engajamento em %", () => {
    expect(engagementRate(1000, 40, 10)).toBe(5);
    expect(engagementRate(0, 10, 10)).toBe(0);
  });
  it("descreve o tempo desde a publicação", () => {
    expect(timeAgo("2026-10-14T11:30:00Z", now)).toBe("agora");
    expect(timeAgo("2026-10-14T07:00:00Z", now)).toBe("há 5 h");
    expect(timeAgo("2026-10-12T12:00:00Z", now)).toBe("há 2 dias");
  });
});

describe("parseFilters", () => {
  it("usa padrões quando não há parâmetros", () => {
    const f = parseFilters({});
    expect(f).toMatchObject({ region: "BR", format: "shorts", period: "7d", sort: "views" });
    expect(f.niche).toBe(niches[0]);
  });
  it("aceita valores válidos e ignora inválidos", () => {
    const f = parseFilters({ regiao: "US", nicho: "games", formato: "x", ordem: ["velocidade"] });
    expect(f.region).toBe("US");
    expect(f.niche.id).toBe("games");
    expect(f.format).toBe("shorts");
    expect(f.sort).toBe("velocidade");
    expect(parseFilters({ regiao: "ZZ" }).region).toBe("BR");
  });
});
