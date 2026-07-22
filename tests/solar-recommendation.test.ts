import { describe, expect, it } from "vitest";

import {
  DEFAULT_CALCULATION_SETTINGS,
  DEFAULT_SOLAR_PACKAGES,
} from "@/config/defaults";
import { calculateSolarPackage } from "@/lib/solar-calculator";
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
  monthlyBill: 2_000_000,
  electricityType: "residential",
  province: "ho-chi-minh",
  daytimeUsageLevel: "high",
  roofAreaM2: 25,
  backupRequired: false,
};

function createPackages(): SolarPackage[] {
  return DEFAULT_SOLAR_PACKAGES.map((solarPackage, index) => ({
    id: `package-${index}`,
    ...solarPackage,
  }));
}

describe("filterEligiblePackages", () => {
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

    expect(scored.scoreBreakdown.targetGenerationKwh).toBeCloseTo(
      401.9714,
      4,
    );
    expect(scored.scoreBreakdown.generationFitScore).toBeCloseTo(89.5586, 4);
    expect(scored.scoreBreakdown.selfUseScore).toBe(100);
    expect(scored.scoreBreakdown.paybackScore).toBeCloseTo(69.6101, 4);
    expect(scored.score).toBeCloseTo(88.7013, 4);
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

    expect(breakdown.targetGenerationKwh).toBeCloseTo(468.966676, 6);
    expect(breakdown.generationFitScore).toBeCloseTo(76.764516, 6);
  });

  it("không tạo NaN khi target hoặc payback bằng null", () => {
    const input = { ...standardInput, monthlyBill: 0 };
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
