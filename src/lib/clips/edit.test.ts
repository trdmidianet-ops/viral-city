import { describe, expect, it } from "vitest";
import { buildAss } from "@/lib/video/captions";
import { editedLength, parseClipEdit, type ClipEditInput } from "./edit";

const base: ClipEditInput = {
  start: "10",
  end: "40.5",
  hook: "  Olha   isso  ",
  hookPosition: "top",
  framing: "blur",
  captions: true,
  captionColor: "yellow",
  speed: "1.25",
};

describe("editor de clipes", () => {
  it("aceita um corte válido e limpa o texto", () => {
    const r = parseClipEdit(base, 600);
    expect("patch" in r && r.patch).toMatchObject({ start_seconds: 10, end_seconds: 40.5, hook: "Olha isso", speed: 1.25, caption_color: "yellow" });
  });

  it("aceita vírgula como separador decimal", () => {
    const r = parseClipEdit({ ...base, start: "10,25" }, 600);
    expect("patch" in r && r.patch.start_seconds).toBe(10.25);
  });

  it("recusa trechos curtos, longos, invertidos ou fora do vídeo", () => {
    expect(parseClipEdit({ ...base, end: "11" }, 600)).toHaveProperty("error");
    expect(parseClipEdit({ ...base, end: "400" }, 600)).toHaveProperty("error");
    expect(parseClipEdit({ ...base, start: "50" }, 600)).toHaveProperty("error");
    expect(parseClipEdit({ ...base, end: "700" }, 600)).toHaveProperty("error");
    expect(parseClipEdit({ ...base, start: "-1" }, 600)).toHaveProperty("error");
  });

  it("recusa opções fora da lista", () => {
    expect(parseClipEdit({ ...base, speed: "3" }, 600)).toHaveProperty("error");
    expect(parseClipEdit({ ...base, framing: "zoom" }, 600)).toHaveProperty("error");
    expect(parseClipEdit({ ...base, captionColor: "roxo" }, 600)).toHaveProperty("error");
    expect(parseClipEdit({ ...base, hookPosition: "bottom" }, 600)).toHaveProperty("error");
  });

  it("calcula a duração final com a velocidade", () => {
    expect(editedLength(10, 40, 1.5)).toBe(20);
  });
});

describe("legendas com estilo do editor", () => {
  const words = [
    { text: "olha", start: 0, end: 0.4 },
    { text: "isso", start: 0.5, end: 0.9 },
  ];
  it("usa a cor escolhida na palavra falada", () => {
    const ass = buildAss(words, { hook: "Gancho", hookUntil: 5, font: "Impact", captions: true, highlight: "cyan" });
    expect(ass).toContain("&H00EED322&");
    expect(ass).not.toContain("&H003D8AFF&");
  });
  it("tira o gancho quando a posição é 'sem texto' e centraliza no 'meio'", () => {
    expect(buildAss(words, { hook: "Gancho", hookUntil: 5, font: "Impact", captions: false, hookPosition: "none" })).not.toContain("GANCHO");
    const middle = buildAss(words, { hook: "Gancho", hookUntil: 5, font: "Impact", captions: false, hookPosition: "middle" });
    expect(middle).toContain("GANCHO");
    expect(middle).toMatch(/Style: Hook,Impact,76,.*,5,90,90,0,1/);
  });
});
