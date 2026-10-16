import { describe, expect, it } from "vitest";
import { isSlotDue, isValidTime, localParts, type Slot } from "./due";

// 2026-10-16 é sexta-feira. 21:10 UTC = 18:10 em Brasília (UTC-3)
const now = new Date("2026-10-16T21:10:00Z");
const slot = (patch: Partial<Slot> = {}): Slot => ({
  id: "s",
  account_id: "a",
  weekday: 5,
  post_time: "18:00:00",
  timezone: "America/Sao_Paulo",
  last_run_on: null,
  ...patch,
});

describe("agenda", () => {
  it("converte para o fuso da agenda", () => {
    expect(localParts(now, "America/Sao_Paulo")).toEqual({ weekday: 5, date: "2026-10-16", minutes: 18 * 60 + 10 });
  });

  it("posta quando chega o horário, dentro da tolerância", () => {
    expect(isSlotDue(slot(), now)).toBe(true);
  });

  it("não posta antes do horário nem depois da tolerância", () => {
    expect(isSlotDue(slot({ post_time: "18:30" }), now)).toBe(false);
    expect(isSlotDue(slot({ post_time: "17:00" }), now)).toBe(false);
  });

  it("não posta em outro dia da semana", () => {
    expect(isSlotDue(slot({ weekday: 4 }), now)).toBe(false);
  });

  it("não repete no mesmo dia", () => {
    expect(isSlotDue(slot({ last_run_on: "2026-10-16" }), now)).toBe(false);
    expect(isSlotDue(slot({ last_run_on: "2026-10-09" }), now)).toBe(true);
  });

  it("valida horário HH:MM", () => {
    expect(isValidTime("18:00")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
    expect(isValidTime("8:00")).toBe(false);
  });
});
