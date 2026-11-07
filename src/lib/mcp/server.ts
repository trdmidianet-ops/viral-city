import { TOOLS, ToolError } from "./tools";

/**
 * Servidor MCP mínimo (transporte Streamable HTTP, sem sessão): cada POST traz uma
 * mensagem JSON-RPC e recebe a resposta em JSON. Basta para o Claude listar e chamar
 * as ferramentas da Viral City.
 */

export const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

type RpcRequest = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

const ok = (id: RpcRequest["id"], result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result });
const fail = (id: RpcRequest["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

/** Responde uma mensagem JSON-RPC. null = notificação (sem resposta). */
export async function handleRpc(msg: RpcRequest, userId: string): Promise<object | null> {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return fail(msg?.id, -32600, "Requisição inválida.");
  const isNotification = msg.id === undefined || msg.id === null;

  switch (msg.method) {
    case "initialize": {
      const asked = String(msg.params?.protocolVersion ?? "");
      return ok(msg.id, {
        protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "viral-city", title: "Viral City", version: "1.0.0" },
        instructions:
          "Viral City transforma vídeos longos em Shorts. Use listar_cortes para achar um corte, criar_scale para gerar versões com templates e manchetes, ver_lote para acompanhar e aprovar_versoes para mandar para a Agenda. O custo é em CityCoins (ver_saldo).",
      });
    }
    case "ping":
      return ok(msg.id, {});
    case "tools/list":
      return ok(msg.id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case "tools/call": {
      const name = String(msg.params?.name ?? "");
      const tool = TOOLS.find((t) => t.name === name);
      if (!tool) return fail(msg.id, -32602, `Ferramenta desconhecida: ${name}`);
      const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
      try {
        const data = await tool.run(userId, typeof args === "object" && args ? args : {});
        return ok(msg.id, { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: { resultado: data } });
      } catch (err) {
        const message = err instanceof ToolError ? err.message : "Erro interno ao executar a ferramenta.";
        if (!(err instanceof ToolError)) console.error("[mcp]", name, err);
        return ok(msg.id, { content: [{ type: "text", text: message }], isError: true });
      }
    }
    default:
      if (isNotification) return null; // notifications/initialized e outras: só confirmamos
      return fail(msg.id, -32601, `Método não suportado: ${msg.method}`);
  }
}

/** Trata o POST HTTP do MCP já autenticado. */
export async function handleMcpPost(req: Request, userId: string): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(fail(null, -32700, "JSON inválido."), { status: 400 });
  }
  if (Array.isArray(body)) {
    const replies = (await Promise.all(body.slice(0, 20).map((m) => handleRpc(m as RpcRequest, userId)))).filter(Boolean);
    return replies.length ? Response.json(replies) : new Response(null, { status: 202 });
  }
  const reply = await handleRpc(body as RpcRequest, userId);
  return reply ? Response.json(reply) : new Response(null, { status: 202 });
}
