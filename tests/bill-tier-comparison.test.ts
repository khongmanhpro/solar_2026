import { describe, expect, it } from "vitest";

import { QD1279_RESIDENTIAL_TARIFF } from "@/config/electricity-tariffs";
import { compareBillTiers } from "@/lib/bill-tier-comparison";

const baseInput = {
  electricityTariffVersion: QD1279_RESIDENTIAL_TARIFF.version,
  tariffBillingContext: { householdQuotaMultiplier: 1 },
  monthlyConsumptionKwh: 450,
  vatRate: 0.08,
};

describe("compareBillTiers", () => {
  it("removes the most expensive tiers first", () => {
    const comparison = compareBillTiers(baseInput, 150)!;
    const [tier1, tier2, tier3, tier4, tier5, tier6] = comparison.rows;

    expect(tier6.beforeKwh).toBeCloseTo(50, 9);
    expect(tier6.afterKwh).toBe(0);
    expect(tier5.afterKwh).toBe(0);
    expect(tier4.afterKwh).toBe(0);
    expect(tier3.afterKwh).toBeCloseTo(50, 9);
    expect(tier1.afterKwh).toBeCloseTo(tier1.beforeKwh, 9);
    expect(tier2.afterKwh).toBeCloseTo(tier2.beforeKwh, 9);
  });

  it("totals match the tariff with VAT and never increase after solar", () => {
    const comparison = compareBillTiers(baseInput, 200)!;
    const expectedBefore =
      (50 * 1984 + 50 * 2050 + 100 * 2380 + 100 * 2998 + 100 * 3350 + 50 * 3460) * 1.08;

    expect(comparison.totalBeforeVnd).toBeCloseTo(expectedBefore, 6);
    expect(comparison.totalAfterVnd).toBeLessThan(comparison.totalBeforeVnd);
    for (const row of comparison.rows) {
      expect(row.afterKwh).toBeLessThanOrEqual(row.beforeKwh + 1e-9);
    }
  });

  it("scales tier widths for multi-household quotas", () => {
    const comparison = compareBillTiers(
      { ...baseInput, tariffBillingContext: { householdQuotaMultiplier: 2 } },
      450,
    )!;
    expect(comparison.rows[0].toKwh).toBe(100);
    expect(comparison.rows[5].beforeKwh).toBe(0);
  });

  it("clamps grid use to consumption and returns null without a tariff contract", () => {
    const comparison = compareBillTiers(baseInput, 10_000)!;
    expect(comparison.totalAfterVnd).toBeCloseTo(comparison.totalBeforeVnd, 6);
    expect(compareBillTiers({ ...baseInput, electricityTariffVersion: undefined }, 100)).toBeNull();
    expect(compareBillTiers({ ...baseInput, electricityTariffVersion: "missing" }, 100)).toBeNull();
  });
});
