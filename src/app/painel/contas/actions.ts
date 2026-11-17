"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOwnedAccount, removeAccount, setAccountLogo, upsertAccount } from "@/lib/accounts/store";
import { requireUserId } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { LINKED_SCOPE, fetchChannel, parseChannelInput, verificationCode } from "@/lib/youtube/channel-link";

export type ChannelLinkState = {
  error?: string;
  /** Canal encontrado, esperando o código na descrição. */
  pending?: { channelId: string; title: string; avatarUrl?: string; code: string };
};

/** Passo 1: acha o canal pelo link e mostra o código para colar na descrição. */
export async function findChannelAction(_: ChannelLinkState, form: FormData): Promise<ChannelLinkState> {
  const userId = await requireUserId();
  if (!isDbConfigured()) return { error: "Banco de dados não configurado." };
  const ref = parseChannelInput(String(form.get("channel") ?? "").slice(0, 300));
  if (!ref) return { error: "Cole o link do canal, como youtube.com/@seucanal." };
  try {
    const channel = await fetchChannel(ref);
    if (!channel) return { error: "Não achamos esse canal no YouTube. Confira o link." };
    return {
      pending: { channelId: channel.id, title: channel.title, avatarUrl: channel.avatarUrl, code: verificationCode(userId, channel.id) },
    };
  } catch (err) {
    console.error("[canal-link] busca", err);
    return { error: "Não foi possível consultar o YouTube agora. Tente de novo em instantes." };
  }
}

/** Passo 2: confere o código na descrição e liga o canal à conta. */
export async function verifyChannelAction(prev: ChannelLinkState, form: FormData): Promise<ChannelLinkState> {
  const userId = await requireUserId();
  const channelId = String(form.get("channelId") ?? "");
  if (!/^UC[\w-]{22}$/.test(channelId)) return { error: "Canal inválido. Comece de novo." };
  const code = verificationCode(userId, channelId);
  let title = "";
  try {
    const channel = await fetchChannel({ channelId });
    if (!channel) return { ...prev, error: "Não achamos mais esse canal no YouTube." };
    if (!channel.description.includes(code)) {
      return {
        ...prev,
        error: "O código ainda não apareceu na descrição. Salve a descrição no YouTube Studio e tente de novo em 1 minuto.",
      };
    }
    title = channel.title;
    await upsertAccount(
      userId,
      { platform: "youtube", externalId: channel.id, name: channel.title, handle: channel.handle, avatarUrl: channel.avatarUrl, scopes: [LINKED_SCOPE] },
      { accessToken: "" },
    );
  } catch (err) {
    if (err instanceof Error && err.message.includes("outra conta")) return { ...prev, error: err.message };
    console.error("[canal-link] verificação", err);
    return { ...prev, error: "Não foi possível verificar agora. Tente de novo em instantes." };
  }
  revalidatePath("/painel/contas");
  redirect(`/painel/contas?conectado=${encodeURIComponent(title)}&verificado=1`);
}

const UUID = /^[0-9a-f-]{36}$/i;
const MAX_LOGO = 300 * 1024;

export async function disconnectAccount(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;
  await removeAccount(userId, id);
  revalidatePath("/painel/contas");
}

/** Salva (ou remove) a logo do canal usada nos cortes. PNG ou JPG até 300 KB. */
export async function saveLogoAction(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id) || !(await getOwnedAccount(userId, id))) return;

  if (formData.get("remove") === "1") {
    await setAccountLogo(userId, id, null);
  } else {
    const file = formData.get("logo");
    if (!(file instanceof File) || !file.size || file.size > MAX_LOGO) return;
    const bytes = Buffer.from(await file.arrayBuffer());
    const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (!isPng && !isJpg) return;
    await setAccountLogo(userId, id, `data:image/${isPng ? "png" : "jpeg"};base64,${bytes.toString("base64")}`);
  }
  revalidatePath("/painel/contas");
}
