import { describe, expect, it } from "vitest";

import {
  DEFAULT_CALCULATION_SETTINGS,
  DEFAULT_SOLAR_PACKAGES,
  RECOMMENDATION_CONSTANTS,
} from "@/config/defaults";
import { calculateSolarPackage } from "@/lib/solar-calculator";
import { estimateElectricityConsumptionFromBill } from "@/lib/electricity-tariff";
import {
  calculatePackageScoreBreakdown,
  filterEligiblePackages,
  recommendSolarPackages,
  scorePackageCalculation,
} from "@/lib/solar-recommendation";
import type {
  CalculationSettings,
  SolarCalculationInput,
  SolarPackage,
} from "@/types/solar";

const settings: CalculationSettings = {
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
  province: "ho-chi-minh",
  daytimeUsageLevel: "high",
  roofAreaM2: 25,
  backupRequired: false,
  essentialLoadWatts: null,
  backupHours: null,
};

function createPackages(): SolarPackage[] {
  return DEFAULT_SOLAR_PACKAGES.map((solarPackage, index) => ({
    id: `package-${index}`,
    ...solarPackage,
  }));
}

describe("filterEligiblePackages", () => {
  it("không loại gói theo mái khi khách hàng chọn không biết", () => {
    const eligible = filterEligiblePackages(createPackages(), {
      ...standardInput,
      roofAreaM2: null,
    });

    expect(eligible).toHaveLength(4);
  });

  it("lọc package không hoạt động và package vượt diện tích mái", () => {
    const packages = createPackages();
    packages[0] = { ...packages[0]!, active: false };

    const eligible = filterEligiblePackages(packages, standardInput);

    expect(eligible.map((solarPackage) => solarPackage.code)).toEqual([
      "FIT-3KWP",
      "HYBRID-3KWP-5KWH",
    ]);
  });

  it("chỉ giữ package hybrid khi khách cần backup", () => {
    const eligible = filterEligiblePackages(createPackages(), {
      ...standardInput,
      backupRequired: true,
    });

    expect(eligible).toHaveLength(1);
    expect(eligible.every((item) => item.systemType === "hybrid")).toBe(true);
  });

  it("không coi hybrid không có pin là gói backup hợp lệ", () => {
    const hybridWithoutBattery = {
      ...createPackages()[3]!,
      id: "hybrid-without-battery",
      batteryCapacityKwh: 0,
    };
    const eligible = filterEligiblePackages([hybridWithoutBattery], {
      ...standardInput,
      backupRequired: true,
    });

    expect(eligible).toEqual([]);
  });
});

describe("scorePackageCalculation", () => {
  it("tính đúng target và ba thành phần score cho gói 3 kWp", () => {
    const solarPackage = createPackages()[1]!;
    const calculation = calculateSolarPackage({
      input: standardInput,
      solarPackage,
      settings,
      provinceFactor: 1,
    });
    const scored = scorePackageCalculation(standardInput, calculation);
    const expectedTarget =
      calculation.daytimeDemandKwh *
      RECOMMENDATION_CONSTANTS.nonBackupTargetRatio;
    const expectedGenerationFit =
      100 -
      (Math.abs(calculation.adjustedGenerationKwh - expectedTarget) /
        expectedTarget) *
        100;
    const expectedPayback =
      100 -
      calculation.paybackYears! *
        RECOMMENDATION_CONSTANTS.paybackPenaltyPerYear;
    const expectedScore =
      expectedGenerationFit *
        RECOMMENDATION_CONSTANTS.generationFitWeight +
      100 * RECOMMENDATION_CONSTANTS.selfUseWeight +
      expectedPayback * RECOMMENDATION_CONSTANTS.paybackWeight;

    expect(scored.scoreBreakdown.targetGenerationKwh).toBeCloseTo(
      expectedTarget,
      10,
    );
    expect(scored.scoreBreakdown.generationFitScore).toBeCloseTo(
      expectedGenerationFit,
      10,
    );
    expect(scored.scoreBreakdown.selfUseScore).toBe(100);
    expect(scored.scoreBreakdown.paybackScore).toBeCloseTo(
      expectedPayback,
      10,
    );
    expect(scored.score).toBeCloseTo(expectedScore, 10);
  });

  it("dùng 70% tổng nhu cầu làm target khi cần backup", () => {
    const input = { ...standardInput, backupRequired: true };
    const solarPackage = createPackages()[3]!;
    const calculation = calculateSolarPackage({
      input,
      solarPackage,
      settings,
      provinceFactor: 1,
    });
    const breakdown = calculatePackageScoreBreakdown(input, calculation);
    const expectedTarget =
      input.monthlyConsumptionKwh *
      RECOMMENDATION_CONSTANTS.backupTargetRatio;
    const expectedGenerationFit =
      100 -
      (Math.abs(calculation.adjustedGenerationKwh - expectedTarget) /
        expectedTarget) *
        100;

    expect(breakdown.targetGenerationKwh).toBeCloseTo(expectedTarget, 10);
    expect(breakdown.generationFitScore).toBeCloseTo(
      expectedGenerationFit,
      10,
    );
  });

  it("không tạo NaN khi target hoặc payback bằng null", () => {
    const input = {
      ...standardInput,
      monthlyBill: 0,
      monthlyConsumptionKwh: 0,
    };
    const solarPackage = {
      ...createPackages()[0]!,
      baseMonthlyGenerationKwh: 0,
    };
    const calculation = calculateSolarPackage({
      input,
      solarPackage,
      settings,
      provinceFactor: 1,
    });
    const scored = scorePackageCalculation(input, calculation);

    expect(scored.score).toBe(0);
    expect(Number.isFinite(scored.score)).toBe(true);
  });
});

describe("recommendSolarPackages", () => {
  it("đề xuất gói 3 kWp bằng score, không hard-code kết quả", () => {
    const result = recommendSolarPackages({
      input: standardInput,
      packages: createPackages(),
      settings,
      provinceFactor: 1,
    });
    const package2Kwp = result.comparedPackages.find(
      (item) => item.packageId === "package-0",
    );
    const package3Kwp = result.comparedPackages.find(
      (item) => item.packageId === "package-1",
    );

    expect(result.recommendedPackage?.packageId).toBe("package-1");
    expect(package3Kwp?.score).toBeGreaterThan(package2Kwp?.score ?? Infinity);
  });

  it("trả null khi mái không đủ cho bất kỳ package nào", () => {
    const result = recommendSolarPackages({
      input: { ...standardInput, roofAreaM2: 10 },
      packages: createPackages(),
      settings,
      provinceFactor: 1,
    });

    expect(result.recommendedPackage).toBeNull();
    expect(result.comparedPackages).toEqual([]);
  });

  it("chỉ đề xuất hybrid khi khách cần backup", () => {
    const result = recommendSolarPackages({
      input: { ...standardInput, backupRequired: true },
      packages: createPackages(),
      settings,
      provinceFactor: 1,
    });

    expect(result.comparedPackages).toHaveLength(1);
    expect(result.recommendedPackage?.packageId).toBe("package-3");
  });

  it("trả tối đa ba package và không thay đổi mảng đầu vào", () => {
    const packages = createPackages();
    const originalOrder = packages.map((item) => item.id);
    const result = recommendSolarPackages({
      input: { ...standardInput, roofAreaM2: 100 },
      packages,
      settings,
      provinceFactor: 1,
    });

    expect(result.comparedPackages).toHaveLength(3);
    expect(packages.map((item) => item.id)).toEqual(originalOrder);
  });

  it("ưu tiên grid-tied khi hai package có score bằng nhau", () => {
    const basePackage = createPackages()[1]!;
    const packages: SolarPackage[] = [
      {
        ...basePackage,
        id: "hybrid-tie",
        code: "HYBRID-TIE",
        systemType: "hybrid",
        displayOrder: 1,
      },
      {
        ...basePackage,
        id: "grid-tie",
        code: "GRID-TIE",
        systemType: "grid-tied",
        displayOrder: 2,
      },
    ];
    const result = recommendSolarPackages({
      input: standardInput,
      packages,
      settings,
      provinceFactor: 1,
    });

    expect(result.comparedPackages[0]?.score).toBe(
      result.comparedPackages[1]?.score,
    );
    expect(result.recommendedPackage?.packageId).toBe("grid-tie");
  });

  it("dùng mã package thay vì ID database để phá hòa điểm", () => {
    const basePackage = createPackages()[1]!;
    const packages: SolarPackage[] = [
      {
        ...basePackage,
        id: "a-database-id",
        code: "ZZZ-TIE",
        displayOrder: 1,
      },
      {
        ...basePackage,
        id: "z-database-id",
        code: "AAA-TIE",
        displayOrder: 1,
      },
    ];
    const result = recommendSolarPackages({
      input: standardInput,
      packages,
      settings,
      provinceFactor: 1,
    });

    expect(result.comparedPackages[0]?.score).toBe(
      result.comparedPackages[1]?.score,
    );
    expect(result.recommendedPackage?.packageId).toBe("z-database-id");
  });

  it("vẫn chọn hybrid nếu score thực sự cao hơn grid-tied", () => {
    const basePackage = createPackages()[1]!;
    const result = recommendSolarPackages({
      input: standardInput,
      packages: [
        {
          ...basePackage,
          id: "expensive-grid",
          code: "EXPENSIVE-GRID",
          systemType: "grid-tied",
          priceVnd: 1_000_000_000,
        },
        {
          ...basePackage,
          id: "efficient-hybrid",
          code: "EFFICIENT-HYBRID",
          systemType: "hybrid",
          priceVnd: 20_000_000,
        },
      ],
      settings,
      provinceFactor: 1,
    });

    expect(result.recommendedPackage?.packageId).toBe("efficient-hybrid");
  });

  it("trả null khi danh sách package trống", () => {
    const result = recommendSolarPackages({
      input: standardInput,
      packages: [],
      settings,
      provinceFactor: 1,
    });

    expect(result.recommendedPackage).toBeNull();
    expect(result.comparedPackages).toEqual([]);
  });
});
