import { describe, expect, it } from "vitest";

import {
  billingPeriodIndex,
  getCurrentBillingPeriod,
  isRecentBillingPeriod,
} from "@/lib/billing-period";

describe("billing period", () => {
  it("dùng tháng theo múi giờ Việt Nam ở ranh giới đầu tháng", () => {
    expect(getCurrentBillingPeriod(new Date("2026-07-31T17:30:00.000Z"))).toBe(
      "2026-08",
    );
  });

  it("xử lý đúng kỳ liên năm và cửa sổ dữ liệu gần đây", () => {
    expect(billingPeriodIndex("2026-01") - billingPeriodIndex("2025-12")).toBe(1);
    const now = new Date("2026-07-22T12:00:00.000Z");
    expect(isRecentBillingPeriod("2026-05", 2, now)).toBe(true);
    expect(isRecentBillingPeriod("2026-04", 2, now)).toBe(false);
  });
});
