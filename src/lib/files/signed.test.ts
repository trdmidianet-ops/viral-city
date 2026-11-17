import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signedFileUrl, verifyFileUrl } from "./signed";

const ID = "0f8d6c2e-1a2b-4c3d-8e9f-001122334455";

function parse(url: string) {
  const u = new URL(url);
  const [, , kind, id] = u.pathname.split("/");
  return { kind, id, exp: u.searchParams.get("exp") ?? undefined, dl: u.searchParams.get("dl") ?? undefined, sig: u.searchParams.get("sig") ?? undefined };
}

describe("links assinados de vídeo", () => {
  beforeEach(() => {
    process.env.WORKER_URL = "https://worker.exemplo.app/";
    process.env.WORKER_SECRET = "segredo-de-teste";
  });
  afterEach(() => {
    delete process.env.WORKER_URL;
    delete process.env.WORKER_SECRET;
  });

  it("monta o link no worker e ele confere", () => {
    const url = signedFileUrl("clip", ID, { now: 1_000_000_000_000 });
    expect(url.startsWith(`https://worker.exemplo.app/files/clip/${ID}?`)).toBe(true);
    expect(verifyFileUrl(parse(url), { now: 1_000_000_000_000 })).toBe(true);
  });

  it("recusa link vencido", () => {
    const url = signedFileUrl("clip", ID, { now: 1_000_000_000_000, ttlSeconds: 60 });
    expect(verifyFileUrl(parse(url), { now: 1_000_000_000_000 + 61_000 })).toBe(false);
  });

  it("recusa link adulterado: outro vídeo, outro tipo ou download ligado à mão", () => {
    const p = parse(signedFileUrl("clip", ID, { now: 1_000_000_000_000 }));
    const now = 1_000_000_000_000;
    expect(verifyFileUrl({ ...p, id: "1f8d6c2e-1a2b-4c3d-8e9f-001122334455" }, { now })).toBe(false);
    expect(verifyFileUrl({ ...p, kind: "source" }, { now })).toBe(false);
    expect(verifyFileUrl({ ...p, dl: "1" }, { now })).toBe(false);
    expect(verifyFileUrl({ ...p, sig: "x" }, { now })).toBe(false);
  });

  it("recusa tudo quando o worker não tem segredo", () => {
    const p = parse(signedFileUrl("variation", ID, { now: 1_000_000_000_000 }));
    expect(verifyFileUrl(p, { now: 1_000_000_000_000, secret: "" })).toBe(false);
  });
});
