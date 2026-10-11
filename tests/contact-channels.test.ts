import { describe, expect, it } from "vitest";

import { DEFAULT_CALCULATION_SETTINGS } from "@/config/defaults";
import { resolveContactChannels } from "@/lib/contact-channels";

describe("resolveContactChannels", () => {
  it("hides seed placeholder Zalo and hotline values", () => {
    expect(resolveContactChannels(DEFAULT_CALCULATION_SETTINGS)).toEqual({
      zaloHref: null,
      phoneHref: null,
      hotlineLabel: null,
    });
  });

  it("returns real contact links", () => {
    expect(
      resolveContactChannels({
        zaloUrl: "https://zalo.me/0912345678",
        hotline: "0912 345 678",
      }),
    ).toEqual({
      zaloHref: "https://zalo.me/0912345678",
      phoneHref: "tel:0912345678",
      hotlineLabel: "0912 345 678",
    });
  });
});
