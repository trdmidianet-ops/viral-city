import { spawn } from "node:child_process";

/**
 * Chama o Claude pelo Claude Code instalado no PC (`claude -p`), usando a assinatura
 * do usuário. O roteiro vai pela entrada padrão; a resposta volta em JSON.
 * Para o SaaS, trocar por uma chamada à API com chave (ANTHROPIC_API_KEY).
 */
export function askClaude(prompt: string, cwd: string, timeoutMs = 5 * 60_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "claude",
      ["-p", "Siga exatamente as instruções recebidas pela entrada padrão.", "--output-format", "json", "--max-turns", "1"],
      { cwd, windowsHide: true },
    );
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error("O Claude demorou demais para responder."));
    }, timeoutMs);
    proc.stdout.on("data", (d) => (out += d));
    proc.stderr.on("data", (d) => (err += d));
    proc.on("error", () => {
      clearTimeout(timer);
      reject(new Error("Claude Code não encontrado no PC."));
    });
    proc.on("close", () => {
      clearTimeout(timer);
      try {
        const res = JSON.parse(out) as { is_error?: boolean; result?: string };
        if (res.is_error || !res.result) throw new Error(res.result || "resposta vazia");
        resolve(res.result);
      } catch (e) {
        reject(new Error(`Claude indisponível: ${(e as Error).message || err.slice(-200)}`));
      }
    });
    proc.stdin.end(prompt);
  });
}
