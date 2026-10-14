import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { decrypt, encrypt } from "./crypto";
import { getTokens, listAccounts, removeAccount, upsertAccount } from "./store";

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "viral-city-"));
  process.env.DATA_DIR = dir;
  process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("crypto", () => {
  it("criptografa e descriptografa", () => {
    const secret = "token-super-secreto";
    const box = encrypt(secret);
    expect(box).not.toContain(secret);
    expect(decrypt(box)).toBe(secret);
  });
  it("recusa dado adulterado", () => {
    const box = Buffer.from(encrypt("abc"), "base64");
    box[box.length - 1] ^= 1;
    expect(() => decrypt(box.toString("base64"))).toThrow();
  });
});

describe("store", () => {
  const profile = { platform: "youtube" as const, externalId: "UC123", name: "Canal A", scopes: ["s"] };

  it("começa vazio", async () => {
    expect(await listAccounts()).toEqual([]);
  });

  it("guarda conta sem expor tokens e com tokens criptografados no disco", async () => {
    const acc = await upsertAccount(profile, { accessToken: "AT-1", refreshToken: "RT-1" });
    expect(acc).not.toHaveProperty("tokens");
    const raw = await readFile(path.join(dir, "accounts.json"), "utf8");
    expect(raw).not.toContain("AT-1");
    expect(await getTokens(acc.id)).toEqual({ accessToken: "AT-1", refreshToken: "RT-1" });
  });

  it("reconectar a mesma conta atualiza em vez de duplicar", async () => {
    const [before] = await listAccounts();
    const again = await upsertAccount({ ...profile, name: "Canal A (novo nome)" }, { accessToken: "AT-2" });
    expect(again.id).toBe(before.id);
    expect(again.connectedAt).toBe(before.connectedAt);
    expect(await listAccounts()).toHaveLength(1);
    expect((await getTokens(again.id))?.accessToken).toBe("AT-2");
  });

  it("permite várias contas e filtra por plataforma", async () => {
    await upsertAccount({ ...profile, externalId: "UC999", name: "Canal B" }, { accessToken: "x" });
    await upsertAccount({ ...profile, platform: "tiktok", externalId: "open1", name: "TT" }, { accessToken: "y" });
    expect(await listAccounts("youtube")).toHaveLength(2);
    expect(await listAccounts("tiktok")).toHaveLength(1);
  });

  it("remove conta", async () => {
    const [first] = await listAccounts("tiktok");
    expect(await removeAccount(first.id)).toBe(true);
    expect(await removeAccount(first.id)).toBe(false);
    expect(await listAccounts("tiktok")).toHaveLength(0);
  });
});
