import { describe, expect, it } from "vitest";

import {
  DEFAULT_CALCULATION_SETTINGS,
  DEFAULT_SOLAR_PACKAGES,
} from "@/config/defaults";
import {
  calculateSolarPackage,
  createCashFlow,
  findBreakEvenYear,
} from "@/lib/solar-calculator";
import type {
  CalculationSettings,
  SolarCalculationInput,
  SolarPackage,
} from "@/types/solar";

const defaultSettings: CalculationSettings = {
  ...DEFAULT_CALCULATION_SETTINGS,
};

const standardInput: SolarCalculationInput = {
  monthlyBill: 2_000_000,
  electricityType: "residential",
  province: "ho-chi-minh",
  daytimeUsageLevel: "high",
  roofAreaM2: 25,
  backupRequired: false,
};

function createPackage(
  index: number,
  overrides: Partial<SolarPackage> = {},
): SolarPackage {
  const source = DEFAULT_SOLAR_PACKAGES[index];

  if (!source) {
    throw new Error(`Không tìm thấy package fixture tại index ${index}.`);
  }

  return {
    id: `package-${index}`,
    ...source,
    ...overrides,
  };
}

describe("calculateSolarPackage", () => {
  it("tính đúng ca mẫu không có pin cho gói 3 kWp", () => {
    const result = calculateSolarPackage({
      input: standardInput,
      solarPackage: createPackage(1),
      settings: defaultSettings,
      provinceFactor: 1,
    });

    expect(result.estimatedMonthlyConsumptionKwh).toBeCloseTo(669.9524, 4);
    expect(result.daytimeDemandKwh).toBeCloseTo(502.4643, 4);
    expect(result.adjustedGenerationKwh).toBe(360);
    expect(result.directSolarUseKwh).toBe(360);
    expect(result.batteryUseKwh).toBe(0);
    expect(result.totalSolarUseKwh).toBe(360);
    expect(result.gridConsumptionAfterSolarKwh).toBeCloseTo(309.9524, 4);
    expect(result.monthlySavingsVnd).toBeCloseTo(1_233_962.72, 2);
    expect(result.billAfterSolarVnd).toBeCloseTo(766_037.28, 2);
    expect(result.reductionPercent).toBeCloseTo(61.6981, 4);
    expect(result.paybackMonths).toBeCloseTo(24.3119, 4);
    expect(result.paybackYears).toBeCloseTo(2.026, 4);
    expect(result.selfConsumptionRate).toBe(1);
  });

  it("không cho tiền tiết kiệm vượt hóa đơn hoặc hóa đơn còn lại âm", () => {
    const result = calculateSolarPackage({
      input: {
        ...standardInput,
        monthlyBill: 100_000,
        daytimeUsageLevel: "low",
        backupRequired: true,
      },
      solarPackage: createPackage(3, {
        baseMonthlyGenerationKwh: 10_000,
        batteryCapacityKwh: 100,
      }),
      settings: defaultSettings,
      provinceFactor: 1,
    });

    expect(result.monthlySavingsVnd).toBeLessThanOrEqual(100_000);
    expect(result.monthlySavingsVnd).toBeCloseTo(100_000, 6);
    expect(result.billAfterSolarVnd).toBeGreaterThanOrEqual(0);
    expect(result.billAfterSolarVnd).toBeCloseTo(0, 6);
    expect(result.reductionPercent).toBe(100);
  });

  it("giới hạn điện lấy từ pin bởi điện dư, công suất xả và nhu cầu còn lại", () => {
    const result = calculateSolarPackage({
      input: {
        ...standardInput,
        daytimeUsageLevel: "low",
        backupRequired: true,
      },
      solarPackage: createPackage(3),
      settings: defaultSettings,
      provinceFactor: 1,
    });

    const monthlyBatteryCapacity = 5 * 30 * 1 * 0.9;
    expect(result.solarSurplusKwh).toBeGreaterThan(0);
    expect(result.batteryUseKwh).toBeLessThanOrEqual(
      result.solarSurplusKwh,
    );
    expect(result.batteryUseKwh).toBe(monthlyBatteryCapacity);
  });

  it("không để pin tự tạo điện khi không có điện mặt trời dư", () => {
    const result = calculateSolarPackage({
      input: {
        ...standardInput,
        backupRequired: true,
      },
      solarPackage: createPackage(3),
      settings: defaultSettings,
      provinceFactor: 1,
    });

    expect(result.solarSurplusKwh).toBe(0);
    expect(result.batteryUseKwh).toBe(0);
  });

  it("trả hoàn vốn null khi không tạo ra tiết kiệm", () => {
    const result = calculateSolarPackage({
      input: standardInput,
      solarPackage: createPackage(0, {
        baseMonthlyGenerationKwh: 0,
      }),
      settings: defaultSettings,
      provinceFactor: 1,
    });

    expect(result.monthlySavingsVnd).toBe(0);
    expect(result.paybackMonths).toBeNull();
    expect(result.paybackYears).toBeNull();
    expect(result.breakEvenYear).toBeNull();
  });

  it("áp dụng province factor Hà Nội chính xác", () => {
    const result = calculateSolarPackage({
      input: { ...standardInput, province: "ha-noi" },
      solarPackage: createPackage(1),
      settings: defaultSettings,
      provinceFactor: 0.88,
    });

    expect(result.adjustedGenerationKwh).toBeCloseTo(316.8, 10);
  });

  it("tính lại đầy đủ kịch bản thấp và cao", () => {
    const result = calculateSolarPackage({
      input: standardInput,
      solarPackage: createPackage(1),
      settings: defaultSettings,
      provinceFactor: 1,
    });

    expect(result.lowEstimate.adjustedGenerationKwh).toBe(324);
    expect(result.lowEstimate.monthlySavingsVnd).toBeCloseTo(1_126_034.72, 2);
    expect(result.lowEstimate.billAfterSolarVnd).toBeCloseTo(873_965.28, 2);
    expect(result.lowEstimate.paybackMonths).toBeCloseTo(
      30_000_000 / 1_126_034.721926631,
      10,
    );

    expect(result.highEstimate.adjustedGenerationKwh).toBe(378);
    expect(result.highEstimate.monthlySavingsVnd).toBeCloseTo(1_287_926.72, 2);
    expect(result.highEstimate.billAfterSolarVnd).toBeCloseTo(712_073.28, 2);
    expect(result.highEstimate.paybackMonths).toBeCloseTo(
      30_000_000 / 1_287_926.721926631,
      10,
    );
  });

  it("không nhân payback với hệ số khi pin đã chạm giới hạn xả", () => {
    const result = calculateSolarPackage({
      input: {
        ...standardInput,
        daytimeUsageLevel: "low",
        backupRequired: true,
      },
      solarPackage: createPackage(3, {
        baseMonthlyGenerationKwh: 600,
      }),
      settings: defaultSettings,
      provinceFactor: 1,
    });

    expect(result.lowEstimate.monthlySavingsVnd).toBe(
      result.monthlySavingsVnd,
    );
    expect(result.highEstimate.monthlySavingsVnd).toBe(
      result.monthlySavingsVnd,
    );
    expect(result.lowEstimate.paybackMonths).toBe(result.paybackMonths);
    expect(result.highEstimate.paybackMonths).toBe(result.paybackMonths);
  });

  it("tạo cash flow 0–20 năm, mốc hòa vốn và tiết kiệm dài hạn", () => {
    const result = calculateSolarPackage({
      input: standardInput,
      solarPackage: createPackage(1),
      settings: defaultSettings,
      provinceFactor: 1,
    });

    expect(result.cashFlow).toHaveLength(21);
    expect(result.cashFlow[0]).toEqual({
      year: 0,
      cumulativeCashFlowVnd: -30_000_000,
    });
    expect(result.cashFlow[20]?.year).toBe(20);
    expect(result.cashFlow[20]?.cumulativeCashFlowVnd).toBeCloseTo(
      266_151_053.26,
      2,
    );
    expect(result.breakEvenYear).toBe(3);
    expect(result.longTermSavings.saving5YearsVnd).toBeCloseTo(
      74_037_763.32,
      2,
    );
    expect(result.longTermSavings.saving10YearsVnd).toBeCloseTo(
      148_075_526.63,
      2,
    );
    expect(result.longTermSavings.saving20YearsVnd).toBeCloseTo(
      296_151_053.26,
      2,
    );
  });

  it("từ chối dữ liệu số âm hoặc giá điện bằng 0", () => {
    expect(() =>
      calculateSolarPackage({
        input: standardInput,
        solarPackage: createPackage(1),
        settings: defaultSettings,
        provinceFactor: -0.1,
      }),
    ).toThrow(RangeError);

    expect(() =>
      calculateSolarPackage({
        input: standardInput,
        solarPackage: createPackage(1),
        settings: {
          ...defaultSettings,
          averageElectricityPriceVndPerKwh: 0,
        },
        provinceFactor: 1,
      }),
    ).toThrow(RangeError);

    expect(() =>
      calculateSolarPackage({
        input: standardInput,
        solarPackage: createPackage(1),
        settings: {
          ...defaultSettings,
          daytimeHighRatio: -0.1,
        },
        provinceFactor: 1,
      }),
    ).toThrow(RangeError);
  });
});

describe("cash flow helpers", () => {
  it("trả null khi dòng tiền chưa hòa vốn trong 20 năm", () => {
    const cashFlow = createCashFlow(50_000_000, 1_000_000);
    expect(findBreakEvenYear(cashFlow)).toBeNull();
  });
});
