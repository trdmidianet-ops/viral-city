import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/better-auth";

/** Rotas do Better Auth (login, cadastro, sessão, retorno do Google…) em /api/auth/*. */
export const GET = (req: Request) => toNextJsHandler(auth()).GET(req);
export const POST = (req: Request) => toNextJsHandler(auth()).POST(req);
