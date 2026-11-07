import { describe, expect, it } from "vitest";
import { hashToken, isTokenShaped } from "@/lib/api-tokens";
import { handleRpc } from "./server";

const call = (method: string, params?: Record<string, unknown>, id: number | undefined = 1) => handleRpc({ jsonrpc: "2.0", id, method, params }, "user_x");

describe("servidor MCP", () => {
  it("responde o initialize com a versão pedida e a capacidade de ferramentas", async () => {
    const r = (await call("initialize", { protocolVersion: "2025-03-26" })) as { result: { protocolVersion: string; capabilities: object; serverInfo: { name: string } } };
    expect(r.result.protocolVersion).toBe("2025-03-26");
    expect(r.result.capabilities).toHaveProperty("tools");
    expect(r.result.serverInfo.name).toBe("viral-city");
    const other = (await call("initialize", { protocolVersion: "1999-01-01" })) as { result: { protocolVersion: string } };
    expect(other.result.protocolVersion).toBe("2025-06-18");
  });

  it("lista as ferramentas com esquema de entrada", async () => {
    const r = (await call("tools/list")) as { result: { tools: { name: string; inputSchema: { type: string } }[] } };
    const names = r.result.tools.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(["ver_saldo", "listar_cortes", "criar_scale", "ver_lote", "aprovar_versoes", "ver_agenda"]));
    expect(r.result.tools.every((t) => t.inputSchema.type === "object")).toBe(true);
  });

  it("chama uma ferramenta e devolve o resultado em texto", async () => {
    const r = (await call("tools/call", { name: "listar_templates", arguments: {} })) as { result: { content: { text: string }[]; isError?: boolean } };
    expect(r.result.isError).toBeUndefined();
    expect(JSON.parse(r.result.content[0].text).map((t: { id: string }) => t.id)).toContain("perfil");
  });

  it("trata erros: ferramenta e método desconhecidos, requisição inválida e notificações", async () => {
    expect(await call("tools/call", { name: "apagar_tudo" })).toMatchObject({ error: { code: -32602 } });
    expect(await call("resources/list")).toMatchObject({ error: { code: -32601 } });
    expect(await handleRpc({ method: "ping" }, "u")).toMatchObject({ error: { code: -32600 } });
    expect(await handleRpc({ jsonrpc: "2.0", method: "notifications/initialized" }, "u")).toBeNull();
    expect(await call("ping")).toMatchObject({ result: {} });
  });

  it("valida os argumentos antes de mexer no banco", async () => {
    const r = (await call("tools/call", { name: "ver_lote", arguments: { lote_id: "nao-e-uuid" } })) as { result: { content: { text: string }[]; isError: boolean } };
    expect(r.result.isError).toBe(true);
    expect(r.result.content[0].text).toBe("Lote não encontrado.");
  });
});

describe("chaves do Claude", () => {
  it("reconhece o formato da chave e guarda só o hash", () => {
    expect(isTokenShaped(`vc_${"a".repeat(43)}`)).toBe(true);
    expect(isTokenShaped("vc_curta")).toBe(false);
    expect(isTokenShaped("Bearer x")).toBe(false);
    expect(hashToken("vc_x")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken("vc_x")).not.toContain("vc_x");
  });
});
