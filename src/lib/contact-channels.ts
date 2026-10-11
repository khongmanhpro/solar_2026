import type { CalculationSettings } from "@/types/solar";

const PLACEHOLDER_ZALO_URLS = new Set(["https://zalo.me/", "https://zalo.me"]);

export interface ContactChannels {
  zaloHref: string | null;
  phoneHref: string | null;
  hotlineLabel: string | null;
}

// Hide contact links that still carry seed placeholders so customers never
// tap a dead Zalo link or dial "0000 000 000".
export function resolveContactChannels(
  settings: Pick<CalculationSettings, "zaloUrl" | "hotline">,
): ContactChannels {
  const zaloUrl = settings.zaloUrl.trim();
  const zaloHref =
    zaloUrl && !PLACEHOLDER_ZALO_URLS.has(zaloUrl) ? zaloUrl : null;

  const digits = settings.hotline.replace(/[^\d+]/g, "");
  const hasRealHotline = digits.replace(/\D/g, "").length >= 8 && !/^\+?0+$/.test(digits);

  return {
    zaloHref,
    phoneHref: hasRealHotline ? `tel:${digits}` : null,
    hotlineLabel: hasRealHotline ? settings.hotline.trim() : null,
  };
}
