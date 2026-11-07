import { userForToken } from "@/lib/api-tokens";
import { isDbConfigured } from "@/lib/db";
import { handleMcpPost } from "@/lib/mcp/server";

/** MCP da Viral City com a chave no cabeçalho: Authorization: Bearer vc_… */
export async function POST(req: Request) {
  if (!isDbConfigured()) return new Response("Banco não configurado.", { status: 503 });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const userId = token ? await userForToken(token) : null;
  if (!userId) {
    return Response.json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Chave inválida. Crie uma em Configurações › Claude." } },
      { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="viral-city"' } },
    );
  }
  return handleMcpPost(req, userId);
}

export function GET() {
  return new Response("Use POST (MCP Streamable HTTP).", { status: 405, headers: { Allow: "POST" } });
}
