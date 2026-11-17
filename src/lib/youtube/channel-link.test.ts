import { describe, expect, it } from "vitest";
import { isLinkedOnly, LINKED_SCOPE, parseChannelInput, verificationCode } from "./channel-link";

const UC = "UC1234567890abcdefghijkl";

describe("canal pelo link", () => {
  it("entende os jeitos comuns de colar o canal", () => {
    expect(parseChannelInput("https://www.youtube.com/@viralcity")).toEqual({ handle: "viralcity" });
    expect(parseChannelInput("youtube.com/@viral.city?sub_confirmation=1")).toEqual({ handle: "viral.city" });
    expect(parseChannelInput("https://m.youtube.com/@viralcity/videos")).toEqual({ handle: "viralcity" });
    expect(parseChannelInput("@viralcity")).toEqual({ handle: "viralcity" });
    expect(parseChannelInput(`https://youtube.com/channel/${UC}`)).toEqual({ channelId: UC });
    expect(parseChannelInput(UC)).toEqual({ channelId: UC });
  });

  it("recusa o que não é link de canal", () => {
    expect(parseChannelInput("https://www.youtube.com/watch?v=abcdefghijk")).toBeNull();
    expect(parseChannelInput("https://youtu.be/abcdefghijk")).toBeNull();
    expect(parseChannelInput("https://malicioso.com/@viralcity")).toBeNull();
    expect(parseChannelInput("qualquer coisa")).toBeNull();
  });

  it("o código é estável por conta e canal, e muda se qualquer um mudar", () => {
    const a = verificationCode("user-1", UC, "segredo");
    expect(a).toMatch(/^VIRALCITY-[A-HJ-NP-Z2-9]{8}$/);
    expect(verificationCode("user-1", UC, "segredo")).toBe(a);
    expect(verificationCode("user-2", UC, "segredo")).not.toBe(a);
    expect(verificationCode("user-1", "UC0000000000abcdefghijkl", "segredo")).not.toBe(a);
    expect(verificationCode("user-1", UC, "outro")).not.toBe(a);
  });

  it("marca as contas ligadas pelo link", () => {
    expect(isLinkedOnly([LINKED_SCOPE])).toBe(true);
    expect(isLinkedOnly(["https://www.googleapis.com/auth/youtube.upload"])).toBe(false);
  });
});
