import { getAccount, getTokens, saveTokens, type Platform } from "@/lib/accounts/store";
import { providers } from "@/lib/oauth/providers";

/**
 * Com quanta antecedência renovar o token de cada rede. O do Instagram dura 60 dias e só pode
 * ser renovado depois de 24 h: renova quando faltar menos de 7 dias.
 */
const RENEW_BEFORE_MS: Record<Platform, number> = {
  youtube: 2 * 60_000,
  tiktok: 5 * 60_000,
  instagram: 7 * 24 * 3600_000,
};

/** Access token válido para a conta, renovando pelo provedor quando estiver perto de vencer. */
export async function freshAccessToken(accountId: string): Promise<string> {
  const account = await getAccount(accountId);
  const tokens = await getTokens(accountId);
  if (!account || !tokens) throw new Error("Conta sem tokens: reconecte a conta.");
  const expires = tokens.expiresAt ? Date.parse(tokens.expiresAt) : 0;
  const renewBefore = RENEW_BEFORE_MS[account.platform];
  // tokens sem data (raro) ficam como estão; o provedor avisa se não valer mais
  if (!tokens.expiresAt || expires - Date.now() > renewBefore) return tokens.accessToken;
  try {
    const renewed = await providers[account.platform].refresh(tokens);
    await saveTokens(accountId, renewed);
    return renewed.accessToken;
  } catch (err) {
    // ainda válido: usa o atual e tenta renovar de novo na próxima postagem
    if (expires > Date.now() + 60_000) return tokens.accessToken;
    throw err;
  }
}
