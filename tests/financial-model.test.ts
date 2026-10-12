import { describe, expect, it } from "vitest";

import { CALCULATION_CONSTANTS } from "@/config/defaults";
import {
  calculateLifetimeFinance,
  generationFactorForYear,
} from "@/lib/financial-model";

const finance = CALCULATION_CONSTANTS.finance;
const base = {
  priceVnd: 100_000_000,
  horizonYears: 20,
  annualSavingsAtGenerationFactor: (factor: number) => 20_000_000 * factor,
  maintenanceRatePerYear: 0,
  systemType: "grid-tied" as const,
  capacityKwp: 5.75,
  batteryCapacityKwh: 0,
};

describe("generationFactorForYear", () => {
  it("follows first-year then linear degradation", () => {
    expect(generationFactorForYear(1)).toBe(1);
    expect(generationFactorForYear(2)).toBeCloseTo(1 - finance.degradationFirstYear, 12);
    expect(generationFactorForYear(10)).toBeCloseTo(
      1 - finance.degradationFirstYear - finance.degradationPerYear * 8,
      12,
    );
    expect(generationFactorForYear(1_000)).toBe(0);
  });
});

describe("calculateLifetimeFinance", () => {
  it("escalates savings, degrades output and schedules replacements", () => {
    const result = calculateLifetimeFinance(base);
    const inverterCost =
      (base.capacityKwp / finance.assumedDcAcRatio) * finance.inverterReplacementVndPerKw["grid-tied"];

    expect(result.cashFlow).toHaveLength(21);
    expect(result.yearlyNetCashFlowVnd[0]).toBeCloseTo(20_000_000, 3);
    expect(result.yearlyNetCashFlowVnd[1]).toBeCloseTo(
      20_000_000 * generationFactorForYear(2) * (1 + finance.tariffEscalationRate),
      3,
    );
    expect(result.replacementCostsVnd).toEqual([
      { year: finance.inverterReplacementYear, item: "inverter", costVnd: inverterCost },
    ]);
    const year = finance.inverterReplacementYear;
    expect(result.yearlyNetCashFlowVnd[year - 1]).toBeCloseTo(
      20_000_000 * generationFactorForYear(year) * (1 + finance.tariffEscalationRate) ** (year - 1) -
        inverterCost,
      3,
    );
  });

  it("adds battery replacement for hybrids and drops replacements beyond the horizon", () => {
    const hybrid = calculateLifetimeFinance({
      ...base,
      systemType: "hybrid",
      batteryCapacityKwh: 16,
    });
    expect(hybrid.replacementCostsVnd.map((item) => item.item).sort()).toEqual(["battery", "inverter"]);

    const short = calculateLifetimeFinance({ ...base, horizonYears: 10, systemType: "hybrid", batteryCapacityKwh: 16 });
    expect(short.replacementCostsVnd).toEqual([]);
  });

  it("interpolates payback inside the crossing year", () => {
    const result = calculateLifetimeFinance({
      ...base,
      annualSavingsAtGenerationFactor: () => 40_000_000,
    });
    const flows = result.yearlyNetCashFlowVnd;
    const afterTwo = -base.priceVnd + flows[0] + flows[1];
    expect(result.breakEvenYear).toBe(3);
    expect(result.paybackYears).toBeCloseTo(2 + -afterTwo / flows[2], 10);
  });

  it("charges escalating maintenance and reports NPV/IRR consistently", () => {
    const withMaintenance = calculateLifetimeFinance({ ...base, maintenanceRatePerYear: 0.01 });
    const without = calculateLifetimeFinance(base);
    expect(without.yearlyNetCashFlowVnd[0] - withMaintenance.yearlyNetCashFlowVnd[0]).toBeCloseTo(1_000_000, 3);
    expect(withMaintenance.npvVnd).toBeLessThan(without.npvVnd);

    // NPV at the IRR is ~0 by definition.
    const irr = without.irr!;
    const npvAtIrr = without.yearlyNetCashFlowVnd.reduce(
      (total, flow, index) => total + flow / (1 + irr) ** (index + 1),
      -base.priceVnd,
    );
    expect(Math.abs(npvAtIrr)).toBeLessThan(1);
  });

  it("returns null payback and IRR when the system never pays back", () => {
    const result = calculateLifetimeFinance({
      ...base,
      annualSavingsAtGenerationFactor: () => 1_000_000,
    });
    expect(result.paybackYears).toBeNull();
    expect(result.breakEvenYear).toBeNull();
    expect(result.npvVnd).toBeLessThan(0);
    expect(result.irr === null || result.irr < 0).toBe(true);
  });

  it("never lets negative savings estimates create value", () => {
    const result = calculateLifetimeFinance({
      ...base,
      annualSavingsAtGenerationFactor: () => -5_000_000,
    });
    expect(result.yearlyNetCashFlowVnd.slice(0, 5).every((flow) => flow === 0)).toBe(true);
  });
});

describe("course-calibrated assumptions and tariff sensitivity", () => {
  it("replaces lithium battery at year 10 and degrades 0.6%/yr after year 1", () => {
    expect(finance.batteryReplacementYear).toBe(10);
    expect(CALCULATION_CONSTANTS.battery.depthOfDischarge).toBe(0.8);
    expect(generationFactorForYear(11)).toBeCloseTo(1 - 0.01 - 0.006 * 9, 12);
  });

  it("pays back sooner when electricity prices grow faster", () => {
    const base_ = calculateLifetimeFinance(base);
    const fast = calculateLifetimeFinance({
      ...base,
      tariffEscalationRate: CALCULATION_CONSTANTS.finance.highTariffEscalationRate,
    });
    expect(fast.paybackYears!).toBeLessThan(base_.paybackYears!);
    expect(fast.npvVnd).toBeGreaterThan(base_.npvVnd);
  });
});
