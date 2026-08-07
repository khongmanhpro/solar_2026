import { describe, expect, it } from "vitest";

import {
  DEFAULT_CALCULATION_SETTINGS,
  DEFAULT_SOLAR_PACKAGES,
} from "@/config/defaults";
import { QD1279_RESIDENTIAL_TARIFF } from "@/config/electricity-tariffs";
import {
  calculateSolarPackage,
  createCashFlow,
  findBreakEvenYear,
} from "@/lib/solar-calculator";
import {
  calculateElectricityBill,
  calculateElectricityEnergyCharge,
  estimateElectricityConsumptionFromBill,
} from "@/lib/electricity-tariff";
import type {
  CalculationSettings,
  SolarCalculationInput,
  SolarPackage,
} from "@/types/solar";

const defaultSettings: CalculationSettings = {
  ...DEFAULT_CALCULATION_SETTINGS,
};

const standardInput: SolarCalculationInput = {
  inputContractVersion: "legacy-v1",
  energyInputMethod: "legacy_money",
  inputMonthCount: 1,
  monthlyConsumptionKwh: estimateElectricityConsumptionFromBill(
    "residential",
    2_000_000,
  ),
  monthlyBill: 2_000_000,
  electricityType: "residential",
  electricalPhase: null,
  province: "ho-chi-minh",
  daytimeUsageLevel: "high",
  roofAreaM2: 25,
  backupRequired: false,
  essentialLoadWatts: null,
  backupHours: null,
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
  it("dùng kWh chuẩn hóa trực tiếp dù số tiền nền không tương ứng", () => {
    const result = calculateSolarPackage({
      input: {
        ...standardInput,
        energyInputMethod: "kwh",
        monthlyConsumptionKwh: 500,
        monthlyBill: 1,
      },
      solarPackage: createPackage(1),
      settings: defaultSettings,
      provinceFactor: 1,
    });

    expect(result.estimatedMonthlyConsumptionKwh).toBe(500);
    expect(result.daytimeDemandKwh).toBe(375);
  });

  it("tính đúng ca mẫu không có pin cho gói 3 kWp", () => {
    const result = calculateSolarPackage({
      input: standardInput,
      solarPackage: createPackage(1),
      settings: defaultSettings,
      provinceFactor: 1,
    });

    const expectedConsumption = standardInput.monthlyConsumptionKwh;
    const expectedBillAfterSolar = calculateElectricityBill(
      "residential",
      expectedConsumption - 360,
    );
    const expectedSavings = 2_000_000 - expectedBillAfterSolar;

    expect(result.estimatedMonthlyConsumptionKwh).toBe(expectedConsumption);
    expect(result.daytimeDemandKwh).toBeCloseTo(
      expectedConsumption * 0.75,
      10,
    );
    expect(result.adjustedGenerationKwh).toBe(360);
    expect(result.directSolarUseKwh).toBe(360);
    expect(result.batteryUseKwh).toBe(0);
    expect(result.totalSolarUseKwh).toBe(360);
    expect(result.gridConsumptionAfterSolarKwh).toBeCloseTo(
      expectedConsumption - 360,
      10,
    );
    expect(result.monthlySavingsVnd).toBeCloseTo(expectedSavings, 10);
    expect(result.billAfterSolarVnd).toBeCloseTo(expectedBillAfterSolar, 10);
    expect(result.reductionPercent).toBeCloseTo(
      (expectedSavings / 2_000_000) * 100,
      10,
    );
    expect(result.paybackMonths).toBeCloseTo(30_000_000 / expectedSavings, 10);
    expect(result.paybackYears).toBeCloseTo(
      30_000_000 / expectedSavings / 12,
      10,
    );
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

  it("giữ cùng định mức nhiều hộ và kỳ đổi ngày khi tính hóa đơn sau solar", () => {
    const context = {
      householdQuotaMultiplier: 2,
      billingDays: 35,
      referenceDays: 30,
    };
    const beforeSolar = calculateElectricityEnergyCharge({
      tariff: QD1279_RESIDENTIAL_TARIFF,
      consumptionKwh: 700,
      context,
    }).energyChargeBeforeVatVnd;
    const expectedAfterSolar = calculateElectricityEnergyCharge({
      tariff: QD1279_RESIDENTIAL_TARIFF,
      consumptionKwh: 600,
      context,
    }).energyChargeBeforeVatVnd;
    const result = calculateSolarPackage({
      input: {
        ...standardInput,
        monthlyConsumptionKwh: 700,
        monthlyBill: beforeSolar,
        electricityTariffVersion: QD1279_RESIDENTIAL_TARIFF.version,
        tariffBillingContext: context,
        daytimeUsageLevel: "high",
      },
      solarPackage: createPackage(1, {
        baseMonthlyGenerationKwh: 100,
      }),
      settings: defaultSettings,
      provinceFactor: 1,
      allowUnapprovedTariffData: true,
    });

    expect(result.gridConsumptionAfterSolarKwh).toBe(600);
    expect(result.billAfterSolarVnd).toBeCloseTo(expectedAfterSolar, 10);
    expect(result.monthlySavingsVnd).toBeCloseTo(
      beforeSolar - expectedAfterSolar,
      10,
    );
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

  it("ưu tiên sản lượng kWh/kWp theo 12 tháng từ PVGIS khi đã đồng bộ", () => {
    const result = calculateSolarPackage({
      input: standardInput,
      solarPackage: createPackage(1),
      settings: defaultSettings,
      provinceFactor: 0.88,
      provinceMonthlyYieldKwhPerKwp: Array(12).fill(100),
    });

    expect(result.adjustedGenerationKwh).toBeCloseTo(300, 10);
  });

  it("tính lại đầy đủ kịch bản thấp và cao", () => {
    const result = calculateSolarPackage({
      input: standardInput,
      solarPackage: createPackage(1),
      settings: defaultSettings,
      provinceFactor: 1,
    });

    expect(result.lowEstimate.adjustedGenerationKwh).toBe(324);
    const lowBillAfter = calculateElectricityBill(
      "residential",
      standardInput.monthlyConsumptionKwh - 324,
    );
    const lowSavings = 2_000_000 - lowBillAfter;
    expect(result.lowEstimate.monthlySavingsVnd).toBeCloseTo(lowSavings, 10);
    expect(result.lowEstimate.billAfterSolarVnd).toBeCloseTo(lowBillAfter, 10);
    expect(result.lowEstimate.paybackMonths).toBeCloseTo(
      30_000_000 / lowSavings,
      10,
    );

    expect(result.highEstimate.adjustedGenerationKwh).toBe(378);
    const highBillAfter = calculateElectricityBill(
      "residential",
      standardInput.monthlyConsumptionKwh - 378,
    );
    const highSavings = 2_000_000 - highBillAfter;
    expect(result.highEstimate.monthlySavingsVnd).toBeCloseTo(highSavings, 10);
    expect(result.highEstimate.billAfterSolarVnd).toBeCloseTo(highBillAfter, 10);
    expect(result.highEstimate.paybackMonths).toBeCloseTo(
      30_000_000 / highSavings,
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
      -30_000_000 + result.yearlySavingsVnd * 20,
      10,
    );
    expect(result.breakEvenYear).toBe(3);
    expect(result.longTermSavings.saving5YearsVnd).toBeCloseTo(
      result.yearlySavingsVnd * 5,
      10,
    );
    expect(result.longTermSavings.saving10YearsVnd).toBeCloseTo(
      result.yearlySavingsVnd * 10,
      10,
    );
    expect(result.longTermSavings.saving20YearsVnd).toBeCloseTo(
      result.yearlySavingsVnd * 20,
      10,
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
