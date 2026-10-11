import { describe, expect, it } from "vitest";

import { batteryUpgradeValue, estimateBackup } from "@/lib/backup-planner";
import {
  annuityPayment,
  cardInstalmentOption,
  cashOption,
  loanOption,
} from "@/lib/payment-options";

describe("payment options", () => {
  it("computes the textbook annuity and the 0% fallback", () => {
    // 100M over 12 months at 12%/year -> 8,884,879 VND/month.
    expect(annuityPayment(100_000_000, 0.12, 12)).toBeCloseTo(8_884_878.8, 0);
    expect(annuityPayment(120_000_000, 0, 12)).toBe(10_000_000);
    expect(annuityPayment(0, 0.1, 12)).toBe(0);
  });

  it("cash keeps the full monthly saving", () => {
    expect(cashOption(56_000_000, 1_650_000)).toMatchObject({
      upfrontVnd: 56_000_000,
      monthlyPaymentVnd: 0,
      financingCostVnd: 0,
      netMonthlyDuringTermVnd: 1_650_000,
    });
  });

  it("card instalment spreads price plus conversion fee with nothing upfront", () => {
    const option = cardInstalmentOption(60_000_000, 1_000_000, { months: 12, conversionFeeRate: 0.02 });
    expect(option.upfrontVnd).toBe(0);
    expect(option.monthlyPaymentVnd).toBeCloseTo(5_100_000, 6);
    expect(option.financingCostVnd).toBeCloseTo(1_200_000, 6);
    expect(option.netMonthlyDuringTermVnd).toBeCloseTo(-4_100_000, 6);
  });

  it("loan respects down payment, rate and term; full down payment means no loan", () => {
    const loan = loanOption(110_000_000, 1_250_000, { downPaymentRate: 0.3, annualInterestRate: 0.1, years: 5 });
    expect(loan.upfrontVnd).toBeCloseTo(33_000_000, 6);
    expect(loan.termMonths).toBe(60);
    expect(loan.monthlyPaymentVnd).toBeCloseTo(annuityPayment(77_000_000, 0.1, 60), 6);
    expect(loan.financingCostVnd).toBeGreaterThan(0);

    const noLoan = loanOption(110_000_000, 1_250_000, { downPaymentRate: 1, annualInterestRate: 0.1, years: 5 });
    expect(noLoan.monthlyPaymentVnd).toBe(0);
    expect(noLoan.termMonths).toBe(0);
    expect(noLoan.financingCostVnd).toBeCloseTo(0, 6);
  });

  it("clamps nonsensical inputs instead of producing NaN", () => {
    const option = loanOption(50_000_000, 1_000_000, {
      downPaymentRate: Number.NaN,
      annualInterestRate: -1,
      years: 0,
    });
    for (const value of Object.values(option)) {
      if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
    }
  });
});

describe("backup planner", () => {
  it("estimates outage hours from usable battery energy and flags inverter overload", () => {
    const estimate = estimateBackup(16, 5.84, 310);
    expect(estimate.usableKwh).toBeCloseTo(14.4, 6);
    expect(estimate.hours).toBeCloseTo((14.4 * 0.9) / 0.31, 6);
    expect(estimate.exceedsInverter).toBe(false);
    expect(estimateBackup(16, 5.84, 6_000).exceedsInverter).toBe(true);
    expect(estimateBackup(16, 5.84, 0).hours).toBeNull();
    expect(estimateBackup(0, 5.84, 300).hours).toBeNull();
  });

  it("isolates the battery's own payback against a grid-tied alternative", () => {
    expect(
      batteryUpgradeValue(
        { priceVnd: 110_000_000, monthlySavingsVnd: 1_250_000 },
        { priceVnd: 56_000_000, monthlySavingsVnd: 710_000 },
      ),
    ).toEqual({
      extraPriceVnd: 54_000_000,
      extraMonthlySavingsVnd: 540_000,
      standalonePaybackYears: 54_000_000 / (540_000 * 12),
    });
    expect(
      batteryUpgradeValue(
        { priceVnd: 110_000_000, monthlySavingsVnd: 700_000 },
        { priceVnd: 56_000_000, monthlySavingsVnd: 710_000 },
      ).standalonePaybackYears,
    ).toBeNull();
  });
});
