import type { Platform, Tokens } from "@/lib/accounts/store";

export type Profile = {
  externalId: string;
  name: string;
  handle?: string;
  avatarUrl?: string;
  scopes: string[];
};

export type Provider = {
  platform: Platform;
  label: string;
  /** Variáveis de ambiente necessárias para o OAuth. */
  env: [string, string];
  /** Exige redirect HTTPS público (TikTok e Instagram não aceitam http://localhost). */
  needsHttps: boolean;
  authUrl(params: { state: string; redirectUri: string }): string;
  exchange(params: { code: string; redirectUri: string }): Promise<{ profile: Profile; tokens: Tokens }>;
  refresh(tokens: Tokens): Promise<Tokens>;
};

export class OAuthError extends Error {}

function cfg(name: string): string {
  const v = process.env[name];
  if (!v) throw new OAuthError(`${name} não configurada.`);
  return v;
}

const expiresIn = (seconds?: number) =>
  seconds ? new Date(Date.now() + seconds * 1000).toISOString() : undefined;

async function json<T>(res: Response, what: string): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    const detail = body.error_description ?? body.error?.message ?? body.error_message ?? body.error ?? res.status;
    throw new OAuthError(`${what}: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
  }
  return body as T;
}

// ---------- YouTube (Google OAuth 2.0) ----------
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];

type GoogleToken = { access_token: string; refresh_token?: string; expires_in: number; scope: string };

const youtube: Provider = {
  platform: "youtube",
  label: "YouTube",
  env: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  needsHttps: false,
  authUrl: ({ state, redirectUri }) =>
    `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: cfg("GOOGLE_CLIENT_ID"),
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPES.join(" "),
      access_type: "offline",
      include_granted_scopes: "true",
      // select_account deixa escolher outra conta/canal a cada conexão
      prompt: "consent select_account",
      state,
    })}`,
  async exchange({ code, redirectUri }) {
    const t = await json<GoogleToken>(
      await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        body: new URLSearchParams({
          code,
          client_id: cfg("GOOGLE_CLIENT_ID"),
          client_secret: cfg("GOOGLE_CLIENT_SECRET"),
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      }),
      "Token do Google",
    );
    const ch = await json<{ items?: { id: string; snippet: { title: string; customUrl?: string; thumbnails: Record<string, { url: string }> } }[] }>(
      await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
        headers: { Authorization: `Bearer ${t.access_token}` },
      }),
      "Canal do YouTube",
    );
    const channel = ch.items?.[0];
    if (!channel) throw new OAuthError("Essa conta Google não tem canal no YouTube.");
    return {
      profile: {
        externalId: channel.id,
        name: channel.snippet.title,
        handle: channel.snippet.customUrl,
        avatarUrl: (channel.snippet.thumbnails.default ?? channel.snippet.thumbnails.medium)?.url,
        scopes: t.scope.split(" "),
      },
      tokens: { accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: expiresIn(t.expires_in) },
    };
  },
  async refresh(tokens) {
    if (!tokens.refreshToken) throw new OAuthError("Sem refresh token: reconecte a conta.");
    const t = await json<GoogleToken>(
      await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        body: new URLSearchParams({
          client_id: cfg("GOOGLE_CLIENT_ID"),
          client_secret: cfg("GOOGLE_CLIENT_SECRET"),
          refresh_token: tokens.refreshToken,
          grant_type: "refresh_token",
        }),
      }),
      "Renovar token do Google",
    );
    return { accessToken: t.access_token, refreshToken: tokens.refreshToken, expiresAt: expiresIn(t.expires_in) };
  },
};

// ---------- TikTok (Login Kit v2 + Content Posting API) ----------
type TiktokToken = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  open_id: string;
  scope: string;
};

async function tiktokToken(body: Record<string, string>, what: string) {
  return json<TiktokToken>(
    await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_key: cfg("TIKTOK_CLIENT_KEY"), client_secret: cfg("TIKTOK_CLIENT_SECRET"), ...body }),
    }),
    what,
  );
}

const tiktok: Provider = {
  platform: "tiktok",
  label: "TikTok",
  env: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
  needsHttps: true,
  authUrl: ({ state, redirectUri }) =>
    `https://www.tiktok.com/v2/auth/authorize/?${new URLSearchParams({
      client_key: cfg("TIKTOK_CLIENT_KEY"),
      response_type: "code",
      scope: "user.info.basic,video.publish,video.upload",
      redirect_uri: redirectUri,
      state,
    })}`,
  async exchange({ code, redirectUri }) {
    const t = await tiktokToken({ code, grant_type: "authorization_code", redirect_uri: redirectUri }, "Token do TikTok");
    const info = await json<{ data: { user: { open_id: string; display_name: string; avatar_url?: string } } }>(
      await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url", {
        headers: { Authorization: `Bearer ${t.access_token}` },
      }),
      "Perfil do TikTok",
    );
    const user = info.data.user;
    return {
      profile: { externalId: t.open_id, name: user.display_name, avatarUrl: user.avatar_url, scopes: t.scope.split(",") },
      tokens: { accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: expiresIn(t.expires_in) },
    };
  },
  async refresh(tokens) {
    if (!tokens.refreshToken) throw new OAuthError("Sem refresh token: reconecte a conta.");
    const t = await tiktokToken({ grant_type: "refresh_token", refresh_token: tokens.refreshToken }, "Renovar token do TikTok");
    return { accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: expiresIn(t.expires_in) };
  },
};

// ---------- Instagram (API com login do Instagram, contas Business/Criador) ----------
const instagram: Provider = {
  platform: "instagram",
  label: "Instagram",
  env: ["INSTAGRAM_APP_ID", "INSTAGRAM_APP_SECRET"],
  needsHttps: true,
  authUrl: ({ state, redirectUri }) =>
    `https://www.instagram.com/oauth/authorize?${new URLSearchParams({
      client_id: cfg("INSTAGRAM_APP_ID"),
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "instagram_business_basic,instagram_business_content_publish",
      state,
    })}`,
  async exchange({ code, redirectUri }) {
    const short = await json<{ access_token: string; user_id: number | string; permissions?: string[] }>(
      await fetch("https://api.instagram.com/oauth/access_token", {
        method: "POST",
        body: new URLSearchParams({
          client_id: cfg("INSTAGRAM_APP_ID"),
          client_secret: cfg("INSTAGRAM_APP_SECRET"),
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code,
        }),
      }),
      "Token do Instagram",
    );
    // Troca o token curto (1h) por um longo (60 dias)
    const long = await json<{ access_token: string; expires_in: number }>(
      await fetch(
        `https://graph.instagram.com/access_token?${new URLSearchParams({
          grant_type: "ig_exchange_token",
          client_secret: cfg("INSTAGRAM_APP_SECRET"),
          access_token: short.access_token,
        })}`,
      ),
      "Token longo do Instagram",
    );
    const me = await json<{ user_id?: string; id: string; username: string; name?: string; profile_picture_url?: string }>(
      await fetch(
        `https://graph.instagram.com/me?fields=user_id,username,name,profile_picture_url&access_token=${encodeURIComponent(long.access_token)}`,
      ),
      "Perfil do Instagram",
    );
    return {
      profile: {
        externalId: String(me.user_id ?? me.id),
        name: me.name || me.username,
        handle: `@${me.username}`,
        avatarUrl: me.profile_picture_url,
        scopes: short.permissions ?? [],
      },
      tokens: { accessToken: long.access_token, expiresAt: expiresIn(long.expires_in) },
    };
  },
  async refresh(tokens) {
    const t = await json<{ access_token: string; expires_in: number }>(
      await fetch(
        `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(tokens.accessToken)}`,
      ),
      "Renovar token do Instagram",
    );
    return { accessToken: t.access_token, expiresAt: expiresIn(t.expires_in) };
  },
};

export const providers: Record<Platform, Provider> = { youtube, tiktok, instagram };

export function getProvider(platform: string): Provider | null {
  return Object.hasOwn(providers, platform) ? providers[platform as Platform] : null;
}

export function isConfigured(p: Provider): boolean {
  return p.env.every((name) => Boolean(process.env[name]));
}

export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function redirectUri(p: Provider): string {
  return `${appUrl()}/api/oauth/${p.platform}/callback`;
}
