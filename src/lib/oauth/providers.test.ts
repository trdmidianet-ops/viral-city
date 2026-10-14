import { beforeEach, describe, expect, it } from "vitest";
import { getProvider, isConfigured, providers, redirectUri } from "./providers";

beforeEach(() => {
  process.env.APP_URL = "https://exemplo.trycloudflare.com/";
  process.env.GOOGLE_CLIENT_ID = "gid";
  process.env.GOOGLE_CLIENT_SECRET = "gsecret";
  process.env.TIKTOK_CLIENT_KEY = "tkey";
  process.env.TIKTOK_CLIENT_SECRET = "tsecret";
  delete process.env.INSTAGRAM_APP_ID;
  delete process.env.INSTAGRAM_APP_SECRET;
});

describe("providers", () => {
  it("só aceita plataformas conhecidas", () => {
    expect(getProvider("youtube")?.label).toBe("YouTube");
    expect(getProvider("toString")).toBeNull();
    expect(getProvider("facebook")).toBeNull();
  });

  it("detecta configuração pelas variáveis de ambiente", () => {
    expect(isConfigured(providers.youtube)).toBe(true);
    expect(isConfigured(providers.instagram)).toBe(false);
  });

  it("monta o redirect a partir do APP_URL sem barra dupla", () => {
    expect(redirectUri(providers.tiktok)).toBe("https://exemplo.trycloudflare.com/api/oauth/tiktok/callback");
  });

  it("URL do Google pede acesso offline, escolha de conta e state", () => {
    const url = new URL(providers.youtube.authUrl({ state: "abc", redirectUri: "https://x/cb" }));
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toContain("select_account");
    expect(url.searchParams.get("state")).toBe("abc");
    expect(url.searchParams.get("scope")).toContain("youtube.upload");
  });

  it("URL do TikTok usa client_key e escopo de postagem", () => {
    const url = new URL(providers.tiktok.authUrl({ state: "s", redirectUri: "https://x/cb" }));
    expect(url.searchParams.get("client_key")).toBe("tkey");
    expect(url.searchParams.get("scope")).toContain("video.publish");
  });

  it("falha claro quando falta configuração", () => {
    expect(() => providers.instagram.authUrl({ state: "s", redirectUri: "https://x/cb" })).toThrow(/INSTAGRAM_APP_ID/);
  });
});
