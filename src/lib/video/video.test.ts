import { describe, expect, it } from "vitest";
import { buildAss, estimateTimings } from "./captions";
import { captionChunks, scriptTemplate, topicFrom, validateScript } from "./script";
import { alignWords } from "./tts";

describe("roteiro", () => {
  it("limpa hashtags e emojis do título do viral", () => {
    expect(topicFrom("GTA 6 é INSANO 🔥🔥 #gta6 #shorts")).toBe("GTA 6 é INSANO");
  });

  it("modelo exige completar os colchetes", () => {
    const tpl = scriptTemplate("GTA 6");
    expect(tpl).toContain("GTA 6");
    expect(validateScript(tpl)).toMatch(/colchetes/);
  });

  it("valida tamanho mínimo e máximo", () => {
    expect(validateScript("curto")).toMatch(/curto/);
    expect(validateScript("a".repeat(1600))).toMatch(/longo/);
    expect(validateScript("Este roteiro já está completo e tem tamanho suficiente.")).toBeNull();
  });

  it("quebra legendas em blocos curtos e no fim das frases", () => {
    const chunks = captionChunks("Para tudo! Você precisa ver isso agora mesmo".split(" "), 4);
    expect(chunks).toEqual([["Para", "tudo!"], ["Você", "precisa", "ver", "isso"], ["agora", "mesmo"]]);
  });
});

describe("tempo das palavras", () => {
  it("estima tempos que somam a duração total", () => {
    const words = estimateTimings("um dois três", 3);
    expect(words).toHaveLength(3);
    expect(words[0].start).toBe(0);
    expect(words.at(-1)!.end).toBeCloseTo(3);
  });

  it("casa roteiro com pontuação e marcações da voz", () => {
    const words = alignWords(
      "Para tudo! Você viu?",
      [
        { text: "Para", start: 0.05, end: 0.3 },
        { text: "tudo", start: 0.35, end: 0.8 },
        { text: "Você", start: 1.6, end: 1.9 },
        { text: "viu", start: 1.95, end: 2.2 },
      ],
      2.5,
    );
    expect(words.map((w) => w.text)).toEqual(["Para", "tudo!", "Você", "viu?"]);
    expect(words[2].start).toBe(1.6);
  });

  it("cai na estimativa quando a voz não casa", () => {
    const words = alignWords("abc def ghi", [{ text: "xyz", start: 0, end: 1 }], 3);
    expect(words.at(-1)!.end).toBeCloseTo(3);
  });
});

describe("legendas ASS", () => {
  it("gera cabeçalho vertical, gancho e destaque da palavra falada", () => {
    const ass = buildAss(estimateTimings("Olá {mundo} viral", 3), { hook: "Gancho", font: "Impact" });
    expect(ass).toContain("PlayResY: 1920");
    expect(ass).toContain("Hook,,0,0,0,,GANCHO");
    expect(ass).toContain("{\\c&H003D8AFF&}OLÁ");
    expect(ass).not.toContain("{MUNDO}");
  });
});
