import { describe, expect, it } from "vitest";

import { backupPowerWarning, batteryUpgradeValue, estimateBackup } from "@/lib/backup-planner";
import { packagePowerLimits } from "@/lib/package-power";
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
  const hybrid = { batteryCapacityKwh: 16, capacityKwp: 5.84 };

  it("estimates outage hours from usable battery energy and flags overload", () => {
    const estimate = estimateBackup(hybrid, 310);
    expect(estimate.usableKwh).toBeCloseTo(12.8, 6); // 16 kWh x 80% DoD
    expect(estimate.hours).toBeCloseTo((12.8 * 0.9) / 0.31, 6);
    expect(estimate.exceedsBackupPower).toBe(false);
    expect(estimateBackup(hybrid, 6_000).exceedsBackupPower).toBe(true);
    expect(estimateBackup(hybrid, 0).hours).toBeNull();
    expect(estimateBackup({ ...hybrid, batteryCapacityKwh: 0 }, 300).hours).toBeNull();
  });

  it("uses the real inverter rating instead of guessing from kWp", () => {
    // 5.84 kWp / 1.15 ≈ 5.1 kW was the old guess for a 6 kW inverter.
    const estimate = estimateBackup({ ...hybrid, inverterAcKw: 6 }, 5_500);
    expect(estimate.backupKw).toBe(6);
    expect(estimate.backupKwSource).toBe("inverter-rating");
    expect(estimate.exceedsBackupPower).toBe(false);
    const unknown = estimateBackup(hybrid, 5_500);
    expect(unknown.backupKw).toBeCloseTo(5.84 / 1.15, 6);
    expect(unknown.backupKwSource).toBe("estimated");
  });

  it("limits backup to min(EPS rating, battery discharge power)", () => {
    expect(estimateBackup({ ...hybrid, inverterAcKw: 5, backupOutputKw: 3 }, 3_500)).toMatchObject({
      backupKw: 3,
      backupKwSource: "datasheet",
      exceedsBackupPower: true,
    });
    expect(
      packagePowerLimits({ capacityKwp: 7.2, inverterAcKw: 6, batteryPowerKw: 4.8, backupOutputKw: 6 })
        .backupKw,
    ).toBe(4.8);
    expect(packagePowerLimits({ capacityKwp: 7.2, inverterAcKw: 6 }).batteryPowerKw).toBe(6);
  });

  it("words the overload warning by how certain the power figure is", () => {
    expect(backupPowerWarning(3, "datasheet")).toContain("công suất dự phòng của gói (3 kW)");
    expect(backupPowerWarning(6, "inverter-rating")).toContain("kỹ sư xác nhận khi khảo sát");
    expect(backupPowerWarning(5.08, "estimated")).toContain("ước tính (~5,1 kW)");
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
