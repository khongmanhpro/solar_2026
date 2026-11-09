import { describe, expect, it } from "vitest";

import {
  DEFAULT_CALCULATION_SETTINGS,
  DEFAULT_SOLAR_PACKAGES,
} from "@/config/defaults";
import { CUSTOMER_REFERENCE_PACKAGES } from "@/config/customer-reference-packages";
import { QD1279_RESIDENTIAL_TARIFF } from "@/config/electricity-tariffs";
import {
  calculateSolarPackage,
} from "@/lib/solar-calculator";
import {
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
  it("áp VAT cho hóa đơn và tiết kiệm để so cùng cơ sở với giá gói đã gồm VAT", () => {
    const params = {
      solarPackage: createPackage(1),
      settings: defaultSettings,
      provinceFactor: 1,
    };
    const beforeVat = calculateSolarPackage({ ...params, input: standardInput });
    const withVat = calculateSolarPackage({
      ...params,
      input: { ...standardInput, vatRate: 0.08 },
    });

    expect(withVat.monthlySavingsVnd).toBeCloseTo(beforeVat.monthlySavingsVnd * 1.08, 6);
    expect(withVat.billAfterSolarVnd).toBeCloseTo(beforeVat.billAfterSolarVnd * 1.08, 6);
    expect(withVat.reductionPercent).toBeCloseTo(beforeVat.reductionPercent, 9);
    expect(withVat.paybackYears!).toBeLessThan(beforeVat.paybackYears!);
  });

  it("từ chối thuế suất VAT ngoài khoảng 0..1", () => {
    expect(() =>
      calculateSolarPackage({
        input: { ...standardInput, vatRate: 8 },
        solarPackage: createPackage(1),
        settings: defaultSettings,
        provinceFactor: 1,
      }),
    ).toThrow("vatRate");
  });

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

describe("calculateSolarPackage — engine v3 invariants", () => {
  const hybridPackage = createPackage(3);
  const seasonalNorth = [64, 63, 75, 88, 115, 121, 126, 127, 112, 117, 88, 78];
  const scenarios = [
    { name: "hòa lưới, ít ở nhà", solarPackage: createPackage(1), daytime: "low" as const },
    { name: "hòa lưới, hay ở nhà", solarPackage: createPackage(1), daytime: "high" as const },
    { name: "hybrid, ít ở nhà", solarPackage: hybridPackage, daytime: "low" as const },
    { name: "hybrid, hay ở nhà", solarPackage: hybridPackage, daytime: "high" as const },
  ];

  for (const scenario of scenarios) {
    it(`bảo toàn năng lượng và không âm từng tháng (${scenario.name})`, () => {
      const result = calculateSolarPackage({
        input: { ...standardInput, daytimeUsageLevel: scenario.daytime },
        solarPackage: scenario.solarPackage,
        settings: defaultSettings,
        provinceFactor: 1,
        provinceMonthlyYieldKwhPerKwp: seasonalNorth,
      });
      const months = result.monthlyBreakdown!;
      expect(months).toHaveLength(12);
      for (const month of months) {
        for (const value of Object.values(month)) {
          expect(Number.isFinite(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
        }
        // PV is split between direct use, battery charging and surplus.
        expect(month.directSolarUseKwh + month.surplusKwh).toBeLessThanOrEqual(
          month.generationKwh + 1e-6,
        );
        // Battery cannot return more than it was charged with.
        expect(month.batteryDischargeKwh).toBeLessThanOrEqual(
          (month.generationKwh - month.directSolarUseKwh - month.surplusKwh) + 1e-6,
        );
        expect(month.billAfterSolarVnd).toBeLessThanOrEqual(standardInput.monthlyBill + 1e-6);
      }
      expect(result.reductionPercent).toBeGreaterThanOrEqual(0);
      expect(result.reductionPercent).toBeLessThanOrEqual(100);
      expect(result.selfConsumptionRate).toBeGreaterThanOrEqual(0);
      expect(result.selfConsumptionRate).toBeLessThanOrEqual(1);
    });
  }

  it("giữ mùa vụ: tháng ít nắng tiết kiệm ít hơn tháng nhiều nắng", () => {
    const result = calculateSolarPackage({
      input: standardInput,
      solarPackage: createPackage(1),
      settings: defaultSettings,
      provinceFactor: 1,
      provinceMonthlyYieldKwhPerKwp: seasonalNorth,
    });
    const [january, , , , , , july] = result.monthlyBreakdown!;
    expect(january.generationKwh).toBeLessThan(july.generationKwh);
    expect(january.savingsVnd).toBeLessThan(july.savingsVnd);
    // Billing month is 30 days; PV intensity follows the real month length.
    expect(january.generationKwh).toBeCloseTo((3 * 64 * 30) / 31, 6);
  });

  it("dùng sản lượng phẳng base × hệ số tỉnh khi chưa có dữ liệu 12 tháng", () => {
    const result = calculateSolarPackage({
      input: standardInput,
      solarPackage: createPackage(1),
      settings: defaultSettings,
      provinceFactor: 0.88,
    });
    for (const month of result.monthlyBreakdown!) {
      expect(month.generationKwh).toBeCloseTo(316.8, 6);
    }
  });

  it("pin hybrid không đưa hóa đơn về 0 khi có ngày âm u", () => {
    const result = calculateSolarPackage({
      input: { ...standardInput, daytimeUsageLevel: "medium" },
      solarPackage: createPackage(3, { baseMonthlyGenerationKwh: 650, batteryCapacityKwh: 16 }),
      settings: defaultSettings,
      provinceFactor: 1,
    });
    expect(result.batteryUseKwh).toBeGreaterThan(0);
    expect(result.gridConsumptionAfterSolarKwh).toBeGreaterThan(0);
    expect(result.billAfterSolarVnd).toBeGreaterThan(0);
  });

  it("dự trữ dự phòng làm giảm điện pin dùng hằng ngày", () => {
    const base = {
      solarPackage: createPackage(3, { baseMonthlyGenerationKwh: 650, batteryCapacityKwh: 16 }),
      settings: defaultSettings,
      provinceFactor: 1,
    };
    const withoutReserve = calculateSolarPackage({
      ...base,
      input: { ...standardInput, daytimeUsageLevel: "low", backupRequired: true },
    });
    const withReserve = calculateSolarPackage({
      ...base,
      input: {
        ...standardInput,
        daytimeUsageLevel: "low",
        backupRequired: true,
        essentialLoadWatts: 1_000,
        backupHours: 8,
      },
    });
    expect(withReserve.batteryUseKwh).toBeLessThan(withoutReserve.batteryUseKwh);
  });

  it("kịch bản thấp/cao chạy lại toàn bộ mô hình với hệ số sản lượng", () => {
    const result = calculateSolarPackage({
      input: standardInput,
      solarPackage: createPackage(1),
      settings: defaultSettings,
      provinceFactor: 1,
    });
    expect(result.lowEstimate.adjustedGenerationKwh).toBeCloseTo(
      result.adjustedGenerationKwh * defaultSettings.lowEstimateFactor,
      6,
    );
    expect(result.highEstimate.adjustedGenerationKwh).toBeCloseTo(
      result.adjustedGenerationKwh * defaultSettings.highEstimateFactor,
      6,
    );
    expect(result.lowEstimate.monthlySavingsVnd).toBeLessThanOrEqual(result.monthlySavingsVnd);
    expect(result.highEstimate.monthlySavingsVnd).toBeGreaterThanOrEqual(result.monthlySavingsVnd);
  });

  it("dòng tiền theo vòng đời trong settings, hoàn vốn khớp mốc hòa vốn", () => {
    const result = calculateSolarPackage({
      input: standardInput,
      solarPackage: createPackage(1),
      settings: { ...defaultSettings, systemLifetimeYears: 25, maintenanceRatePerYear: 0.01 },
      provinceFactor: 1,
    });
    expect(result.cashFlow).toHaveLength(26);
    expect(result.cashFlow[0]).toEqual({ year: 0, cumulativeCashFlowVnd: -30_000_000 });
    expect(result.financial?.horizonYears).toBe(25);
    expect(result.paybackYears).not.toBeNull();
    expect(result.breakEvenYear).toBe(Math.ceil(result.paybackYears!));
    expect(result.paybackMonths).toBeCloseTo(result.paybackYears! * 12, 9);
    // Net savings over 5 years = cumulative cash flow at year 5 + price.
    expect(result.longTermSavings.saving5YearsVnd).toBeCloseTo(
      result.cashFlow[5].cumulativeCashFlowVnd + 30_000_000,
      3,
    );
    // Inverter replacement at year 12 shows up as a dip in yearly net flow.
    const flow = (year: number) =>
      result.cashFlow[year].cumulativeCashFlowVnd - result.cashFlow[year - 1].cumulativeCashFlowVnd;
    expect(flow(12)).toBeLessThan(flow(11));
  });
});

describe("giới hạn công suất inverter/pin (engine 3.3)", () => {
  // Reference packages have DC/AC ≤ 1.1 and a household-sized evening peak, so
  // clipping and the battery kW cap should barely move their savings.
  it.each(
    CUSTOMER_REFERENCE_PACKAGES.flatMap((solarPackage) =>
      [450, 900].flatMap((kwh) =>
        (["low", "high"] as const).map((daytimeUsageLevel) => ({
          solarPackage,
          kwh,
          daytimeUsageLevel,
        })),
      ),
    ),
  )("$solarPackage.code · $kwh kWh · $daytimeUsageLevel: tiết kiệm lệch < 1%", ({ solarPackage, kwh, daytimeUsageLevel }) => {
    const params = {
      input: { ...standardInput, monthlyConsumptionKwh: kwh, daytimeUsageLevel },
      settings: defaultSettings,
      // Sunnier than average so midday peaks are as high as they get.
      provinceFactor: 1.15,
    };
    const limited = calculateSolarPackage({
      ...params,
      solarPackage: { id: solarPackage.code, ...solarPackage },
    });
    const unlimited = calculateSolarPackage({
      ...params,
      solarPackage: {
        id: solarPackage.code,
        ...solarPackage,
        inverterAcKw: 1_000,
        batteryPowerKw: 1_000,
      },
    });
    expect(limited.monthlySavingsVnd).toBeLessThanOrEqual(unlimited.monthlySavingsVnd + 1);
    expect(limited.monthlySavingsVnd).toBeGreaterThan(unlimited.monthlySavingsVnd * 0.99);
  });

  it("cắt sản lượng chỉ giảm tiết kiệm khi cắt vào phần nhà đang dùng", () => {
    const params = {
      // 900 kWh, mostly daytime: ~1.9 kW load around noon.
      input: { ...standardInput, monthlyConsumptionKwh: 900 },
      settings: defaultSettings,
      provinceFactor: 1.15,
    };
    const base = CUSTOMER_REFERENCE_PACKAGES[0];
    const run = (inverterAcKw: number) =>
      calculateSolarPackage({ ...params, solarPackage: { id: `ac-${inverterAcKw}`, ...base, inverterAcKw } });
    const clippedKwh = (result: ReturnType<typeof run>) =>
      (result.monthlyBreakdown ?? []).reduce((total, month) => total + (month.clippedKwh ?? 0), 0);
    const normal = run(5);
    const surplusOnly = run(2);
    const intoLoad = run(1);

    expect(clippedKwh(normal)).toBe(0);
    // Clipping above the household load only removes unpaid surplus.
    expect(clippedKwh(surplusOnly)).toBeGreaterThan(0);
    expect(surplusOnly.adjustedGenerationKwh).toBeLessThan(normal.adjustedGenerationKwh);
    expect(surplusOnly.monthlySavingsVnd).toBeCloseTo(normal.monthlySavingsVnd, 0);
    // Clipping below the load costs real savings.
    expect(intoLoad.monthlySavingsVnd).toBeLessThan(normal.monthlySavingsVnd * 0.95);
  });
});
