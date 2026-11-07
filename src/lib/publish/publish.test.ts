import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("./tokens", () => ({ freshAccessToken: vi.fn(async () => "tok") }));

import { instagramCaption, publishInstagramReel } from "./instagram";
import { pickPrivacy, publishTiktok, tiktokChunks } from "./tiktok";

const MB = 1024 * 1024;
let video: string;

beforeAll(async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "vc-publish-"));
  video = path.join(dir, "v.mp4");
  await writeFile(video, Buffer.alloc(1234, 1));
});
afterEach(() => vi.unstubAllGlobals());

/** fetch falso: responde cada chamada pela ordem da lista e guarda o que foi pedido. */
function fakeFetch(replies: unknown[]) {
  const calls: { url: string; init?: RequestInit }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      const body = replies.shift();
      return new Response(JSON.stringify(body ?? {}), { status: 200 });
    }),
  );
  return calls;
}

describe("TikTok", () => {
  it("divide o arquivo em pedaços aceitos pela API", () => {
    expect(tiktokChunks(3 * MB)).toEqual({ chunkSize: 3 * MB, count: 1, ranges: [[0, 3 * MB - 1]] });
    const big = tiktokChunks(25 * MB + 7);
    expect(big.count).toBe(2);
    expect(big.ranges.at(-1)![1]).toBe(25 * MB + 6);
    expect(big.ranges[1][0]).toBe(10 * MB);
  });

  it("usa a privacidade mais aberta que a conta permite", () => {
    expect(pickPrivacy(["SELF_ONLY"])).toBe("SELF_ONLY");
    expect(pickPrivacy(["SELF_ONLY", "PUBLIC_TO_EVERYONE"])).toBe("PUBLIC_TO_EVERYONE");
  });

  it("publica: consulta a conta, inicia, envia o arquivo e confere o status", async () => {
    const calls = fakeFetch([
      { data: { privacy_level_options: ["SELF_ONLY"], creator_username: "viralcity" }, error: { code: "ok" } },
      { data: { publish_id: "p1", upload_url: "https://upload.tiktok/x" }, error: { code: "ok" } },
      {},
      { data: { status: "PUBLISH_COMPLETE", publicaly_available_post_id: [987] }, error: { code: "ok" } },
    ]);
    const r = await publishTiktok({ accountId: "a", filePath: video, title: "olha isso", pollMs: 0 });
    expect(r).toEqual({ id: "987", url: "https://www.tiktok.com/@viralcity/video/987", privacy: "SELF_ONLY" });
    const init = JSON.parse(String(calls[1].init?.body));
    expect(init.post_info.privacy_level).toBe("SELF_ONLY");
    expect(init.source_info).toMatchObject({ source: "FILE_UPLOAD", video_size: 1234, total_chunk_count: 1 });
    expect((calls[2].init?.headers as Record<string, string>)["Content-Range"]).toBe("bytes 0-1233/1234");
  });

  it("mostra o motivo quando o TikTok recusa", async () => {
    fakeFetch([{ data: {}, error: { code: "spam_risk_too_many_posts", message: "limite de posts do dia" } }]);
    await expect(publishTiktok({ accountId: "a", filePath: video, title: "x", pollMs: 0 })).rejects.toThrow(/limite de posts/);
  });
});

describe("Instagram", () => {
  it("tira o #shorts da legenda", () => {
    expect(instagramCaption("Título", "Olha isso\n\n#shorts")).toBe("Olha isso");
    expect(instagramCaption("Título", "")).toBe("Título");
  });

  it("publica o Reels: contêiner, envio do arquivo, processamento e publicação", async () => {
    const calls = fakeFetch([
      { id: "c1", uri: "https://rupload.facebook.com/ig-api-upload/v23.0/c1" },
      { success: true },
      { status_code: "IN_PROGRESS" },
      { status_code: "FINISHED" },
      { id: "m1" },
      { permalink: "https://www.instagram.com/reel/abc/" },
    ]);
    const r = await publishInstagramReel({ accountId: "a", igUserId: "17841", filePath: video, caption: "olha", pollMs: 0 });
    expect(r).toEqual({ id: "m1", url: "https://www.instagram.com/reel/abc/" });
    expect(calls[0].url).toContain("/17841/media");
    expect(JSON.parse(String(calls[0].init?.body))).toMatchObject({ media_type: "REELS", upload_type: "resumable", caption: "olha" });
    expect((calls[1].init?.headers as Record<string, string>).file_size).toBe("1234");
    expect(calls[4].url).toContain("/17841/media_publish");
  });

  it("para com erro se o Instagram não processar o vídeo", async () => {
    fakeFetch([{ id: "c1" }, { success: true }, { status_code: "ERROR", status: "formato inválido" }]);
    await expect(publishInstagramReel({ accountId: "a", igUserId: "1", filePath: video, caption: "x", pollMs: 0 })).rejects.toThrow(/formato inválido/);
  });
});
