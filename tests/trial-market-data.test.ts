import { describe, expect, it } from "vitest";

import {
  isPublicPreviewModeEnabled,
  isTrialMarketDataEnabled,
} from "@/config/trial-market-data";

describe("trial market data gate", () => {
  it("only enables trial data in development with an explicit flag", () => {
    expect(
      isTrialMarketDataEnabled({
        NODE_ENV: "development",
        TRIAL_MARKET_DATA_ENABLED: "true",
      }),
    ).toBe(true);
    expect(
      isTrialMarketDataEnabled({
        NODE_ENV: "development",
        TRIAL_MARKET_DATA_ENABLED: "false",
      }),
    ).toBe(false);
  });

  it("keeps trial data off in production unless public preview is explicit", () => {
    expect(
      isTrialMarketDataEnabled({
        NODE_ENV: "production",
        TRIAL_MARKET_DATA_ENABLED: "true",
      }),
    ).toBe(false);
    expect(
      isTrialMarketDataEnabled({
        NODE_ENV: "production",
        TRIAL_MARKET_DATA_ENABLED: "true",
        PUBLIC_PREVIEW_MODE_ENABLED: "true",
      }),
    ).toBe(true);
    expect(
      isTrialMarketDataEnabled({
        NODE_ENV: "production",
        TRIAL_MARKET_DATA_ENABLED: "false",
        PUBLIC_PREVIEW_MODE_ENABLED: "true",
      }),
    ).toBe(false);
  });

  it("requires an explicit public preview flag", () => {
    expect(isPublicPreviewModeEnabled({})).toBe(false);
    expect(
      isPublicPreviewModeEnabled({ PUBLIC_PREVIEW_MODE_ENABLED: "true" }),
    ).toBe(true);
  });
});
