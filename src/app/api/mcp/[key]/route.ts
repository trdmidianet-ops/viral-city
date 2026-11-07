import { userForToken } from "@/lib/api-tokens";
import { isDbConfigured } from "@/lib/db";
import { handleMcpPost } from "@/lib/mcp/server";

/** MCP com a chave no endereço (para conectores que não aceitam cabeçalho, como o claude.ai). */
export async function POST(req: Request, { params }: { params: Promise<{ key: string }> }) {
  if (!isDbConfigured()) return new Response("Banco não configurado.", { status: 503 });
  const userId = await userForToken((await params).key);
  if (!userId) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Chave inválida." } }, { status: 401 });
  return handleMcpPost(req, userId);
}

export function GET() {
  return new Response("Use POST (MCP Streamable HTTP).", { status: 405, headers: { Allow: "POST" } });
}
