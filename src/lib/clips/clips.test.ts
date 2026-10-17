import { describe, expect, it } from "vitest";
import { buildAss } from "@/lib/video/captions";
import { directDownloadUrl } from "./acquire";
import { isInsideData, uploadPath } from "./local-files";
import { buildPrompt, fallbackClips, parseClips, toSegments, wordsInRange } from "./pick";
import { framingFilter } from "./render";
import type { Word } from "./repo";

/** Gera uma fala falsa: `n` frases de 6 palavras, uma a cada 3 segundos. */
function speech(n: number): Word[] {
  const words: Word[] = [];
  for (let i = 0; i < n; i++) {
    const base = i * 3;
    const text = i % 7 === 0 ? ["Você", "sabia", "desse", "segredo", "incrível", "agora?"] : ["isso", "aqui", "é", "uma", "frase", "normal."];
    text.forEach((t, j) => words.push({ text: t, start: base + j * 0.4, end: base + j * 0.4 + 0.35 }));
  }
  return words;
}

describe("segmentos", () => {
  it("quebra a fala em frases", () => {
    const segs = toSegments(speech(4));
    expect(segs).toHaveLength(4);
    expect(segs[0].text).toBe("Você sabia desse segredo incrível agora?");
    expect(segs[1].start).toBe(3);
  });
});

describe("resposta da IA", () => {
  it("aceita JSON com texto em volta, ordena por nota e marca o melhor", () => {
    const raw = 'Aqui está:\n{"clips":[{"start":10,"end":40,"score":70,"hook":"A","reason":"r"},{"start":50,"end":95,"score":92,"hook":"B","reason":"r"}]}';
    const clips = parseClips(raw, 600);
    expect(clips.map((c) => c.hook)).toEqual(["B", "A"]);
    expect(clips[0]).toMatchObject({ is_best: true, position: 1, score: 92 });
    expect(clips[1].is_best).toBe(false);
  });

  it("descarta cortes curtos, sobrepostos e fora do vídeo; limita a duração", () => {
    const raw = JSON.stringify({
      clips: [
        { start: 0, end: 5, score: 99, hook: "curto", reason: "" },
        { start: 20, end: 200, score: 80, hook: "longo", reason: "" },
        { start: 30, end: 60, score: 70, hook: "sobreposto", reason: "" },
        { start: 590, end: 700, score: 60, hook: "fim", reason: "" },
      ],
    });
    const clips = parseClips(raw, 620);
    expect(clips.map((c) => c.hook)).toEqual(["longo", "fim"]);
    expect(clips[0].end_seconds - clips[0].start_seconds).toBeLessThanOrEqual(75);
    expect(clips[1].end_seconds).toBe(620);
  });

  it("monta o prompt com transcrição, nicho e virais de referência", () => {
    const p = buildPrompt({
      title: "Live",
      duration: 300,
      language: "portuguese",
      segments: toSegments(speech(2)),
      niche: "Games",
      referenceTitle: "Viral X",
      trendingTitles: ["Viral Y"],
    });
    expect(p).toContain("[0.0-2.4] Você sabia");
    expect(p).toContain("nicho: Games");
    expect(p).toContain("- Viral X");
    expect(p).toContain('{"clips":[');
  });
});

describe("plano B sem IA", () => {
  it("escolhe até 5 cortes sem sobreposição, com nota e um destaque", () => {
    const words = speech(120); // 6 minutos
    const clips = fallbackClips(toSegments(words), 360);
    expect(clips.length).toBe(5);
    expect(clips.filter((c) => c.is_best)).toHaveLength(1);
    for (const a of clips) {
      expect(a.end_seconds - a.start_seconds).toBeGreaterThanOrEqual(15);
      for (const b of clips) if (a !== b) expect(a.start_seconds < b.end_seconds && a.end_seconds > b.start_seconds).toBe(false);
    }
  });
});

describe("legendas do corte", () => {
  it("usa só as palavras do trecho, com tempo relativo", () => {
    const w = wordsInRange(speech(10), 9, 15);
    expect(w[0]).toMatchObject({ text: "isso", start: 0 });
    expect(w.every((x) => x.end <= 6.3)).toBe(true);
  });

  it("mostra o gancho no topo o corte inteiro e respeita legendas desligadas", () => {
    const ass = buildAss(speech(1), { hook: "Olha isso", hookUntil: 30, font: "Impact", captions: false });
    expect(ass).toContain("0:00:30.00,Hook,,0,0,0,,OLHA ISSO");
    expect(ass).not.toContain("Caption,,");
  });
});

describe("enquadramento", () => {
  it("gera filtros para os 3 formatos terminando em [base]", () => {
    for (const f of ["center", "blur", "split"] as const) expect(framingFilter(f)).toMatch(/\[base\]$/);
    expect(framingFilter("split")).toContain("vstack");
  });
});

describe("links e arquivos", () => {
  it("converte links do Drive e Dropbox e recusa YouTube", () => {
    expect(directDownloadUrl("https://drive.google.com/file/d/ABC_123/view?usp=sharing")).toBe(
      "https://drive.usercontent.google.com/download?id=ABC_123&export=download&confirm=t",
    );
    expect(directDownloadUrl("https://www.dropbox.com/s/x/video.mp4?dl=0")).toContain("dl=1");
    expect(() => directDownloadUrl("https://youtu.be/abc")).toThrow(/YouTube/);
    expect(() => directDownloadUrl("file:///c:/x.mp4")).toThrow();
  });

  it("só aceita IDs de upload válidos e arquivos dentro de .data", () => {
    expect(uploadPath("../../etc/passwd")).toBeNull();
    expect(uploadPath("123e4567-e89b-12d3-a456-426614174000.mp4")).toContain("uploads");
    expect(isInsideData(".data/clips/x/final.mp4")).toBe(true);
    expect(isInsideData("C:/Windows/win.ini")).toBe(false);
  });
});
