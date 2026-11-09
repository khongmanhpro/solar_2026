import { resolveContactChannels, type ContactChannels } from "@/lib/contact-channels";
import { services } from "@/server/container";

// Header/footer contact links. A settings outage must never break the page,
// so fall back to "no contact links" instead of throwing.
export async function getSiteContact(): Promise<ContactChannels> {
  try {
    return resolveContactChannels(await services.settings.get());
  } catch {
    return { zaloHref: null, phoneHref: null, hotlineLabel: null };
  }
}
