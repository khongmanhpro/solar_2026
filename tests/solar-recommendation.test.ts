import { describe, expect, it } from "vitest";

import {
  DEFAULT_CALCULATION_SETTINGS,
  DEFAULT_SOLAR_PACKAGES,
  RECOMMENDATION_CONSTANTS,
} from "@/config/defaults";
import { calculateSolarPackage } from "@/lib/solar-calculator";
import {
  calculateElectricityBill,
  estimateElectricityConsumptionFromBill,
} from "@/lib/electricity-tariff";
import {
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
  electricalPhase: null,
  province: "ho-chi-minh",
  daytimeUsageLevel: "high",
  roofAreaM2: 25,
  backupRequired: false,
  essentialLoadWatts: null,
  backupHours: null,
};

function estimateElectricityBillForTest(consumptionKwh: number): number {
  return calculateElectricityBill("residential", consumptionKwh);
}

function createPackages(): SolarPackage[] {
  return DEFAULT_SOLAR_PACKAGES.map((solarPackage, index) => ({
    id: `package-${index}`,
    ...solarPackage,
  }));
}

describe("filterEligiblePackages", () => {
  it("chỉ giữ inverter cùng pha khi khách đã chọn pha", () => {
    const base = createPackages()[1]!;
    const packages = [
      { ...base, id: "single", electricalPhase: "single-phase" as const },
      { ...base, id: "three", electricalPhase: "three-phase" as const },
    ];

    expect(
      filterEligiblePackages(packages, {
        ...standardInput,
        electricalPhase: "single-phase",
      }).map((item) => item.id),
    ).toEqual(["single"]);
    expect(
      filterEligiblePackages(packages, {
        ...standardInput,
        electricalPhase: "three-phase",
      }).map((item) => item.id),
    ).toEqual(["three"]);
    expect(filterEligiblePackages(packages, standardInput)).toHaveLength(2);
  });

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
  it("kết hợp điểm kinh tế, mức giảm hóa đơn và tỷ lệ tự dùng theo trọng số", () => {
    const calculation = calculateSolarPackage({
      input: standardInput,
      solarPackage: createPackages()[1]!,
      settings,
      provinceFactor: 1,
    });
    const scored = scorePackageCalculation(calculation);
    const { paybackFullScoreYears, paybackZeroScoreYears } = RECOMMENDATION_CONSTANTS;
    const expectedEconomic = Math.min(
      100,
      Math.max(
        0,
        ((paybackZeroScoreYears - calculation.paybackYears!) /
          (paybackZeroScoreYears - paybackFullScoreYears)) *
          100,
      ),
    );

    expect(scored.scoreBreakdown.economicScore).toBeCloseTo(expectedEconomic, 10);
    expect(scored.scoreBreakdown.billReductionScore).toBeCloseTo(calculation.reductionPercent, 10);
    expect(scored.scoreBreakdown.selfUseScore).toBeCloseTo(calculation.selfConsumptionRate * 100, 10);
    expect(scored.score).toBeCloseTo(
      expectedEconomic * RECOMMENDATION_CONSTANTS.economicWeight +
        calculation.reductionPercent * RECOMMENDATION_CONSTANTS.billReductionWeight +
        calculation.selfConsumptionRate * 100 * RECOMMENDATION_CONSTANTS.selfUseWeight,
      10,
    );
  });

  it("cho điểm kinh tế 0 khi không hoàn vốn và không tạo NaN", () => {
    const input = { ...standardInput, monthlyBill: 0, monthlyConsumptionKwh: 0 };
    const calculation = calculateSolarPackage({
      input,
      solarPackage: { ...createPackages()[0]!, baseMonthlyGenerationKwh: 0 },
      settings,
      provinceFactor: 1,
    });
    const scored = scorePackageCalculation(calculation);

    expect(scored.scoreBreakdown.economicScore).toBe(0);
    expect(scored.score).toBe(0);
    expect(Number.isFinite(scored.score)).toBe(true);
  });
});

describe("recommendation honesty rules", () => {
  it("không đề xuất gói khi không hoàn vốn trong ngưỡng — nêu lý do chưa hiệu quả", () => {
    const result = recommendSolarPackages({
      input: {
        ...standardInput,
        monthlyConsumptionKwh: 60,
        monthlyBill: estimateElectricityBillForTest(60),
      },
      packages: createPackages(),
      settings,
      provinceFactor: 1,
    });

    expect(result.recommendedPackage).toBeNull();
    expect(result.comparedPackages).toEqual([]);
    expect(result.noRecommendationReason).toBe("not_economical");
  });

  it("loại gói có pin không đủ giữ điện dự phòng khách khai và nêu lý do", () => {
    const result = recommendSolarPackages({
      input: {
        ...standardInput,
        backupRequired: true,
        essentialLoadWatts: 3_000,
        backupHours: 8,
      },
      packages: createPackages(),
      settings,
      provinceFactor: 1,
    });

    expect(result.recommendedPackage).toBeNull();
    expect(result.noRecommendationReason).toBe("backup_exceeds_battery");
  });

  it("loại gói hybrid khi tải dự phòng vượt công suất inverter (kW), dù pin đủ kWh", () => {
    // 16 kWh battery easily holds 7 kW x 1 h, but a 6 kW inverter cannot carry 7 kW.
    const hybrid6kW: SolarPackage = {
      ...createPackages()[3]!,
      id: "hybrid-6kw",
      capacityKwp: 7.2,
      batteryCapacityKwh: 16,
      inverterAcKw: 6,
    };
    const run = (essentialLoadWatts: number) =>
      recommendSolarPackages({
        input: {
          ...standardInput,
          monthlyConsumptionKwh: 700,
          monthlyBill: estimateElectricityBillForTest(700),
          backupRequired: true,
          essentialLoadWatts,
          backupHours: 1,
        },
        packages: [hybrid6kW],
        settings,
        provinceFactor: 1,
      });

    const tooBig = run(7_000);
    expect(tooBig.recommendedPackage).toBeNull();
    expect(tooBig.noRecommendationReason).toBe("backup_exceeds_power");
    expect(run(3_000).recommendedPackage?.packageId).toBe("hybrid-6kw");
    // Equal to the rating is still allowed.
    expect(filterEligiblePackages([hybrid6kW], {
      ...standardInput,
      backupRequired: true,
      essentialLoadWatts: 6_000,
      backupHours: 1,
    })).toHaveLength(1);
  });

  it("chưa biết tải dự phòng thì không loại gói vì công suất", () => {
    const hybrid = { ...createPackages()[3]!, inverterAcKw: 2 };
    expect(
      filterEligiblePackages([hybrid], {
        ...standardInput,
        backupRequired: true,
        essentialLoadWatts: null,
        backupHours: null,
      }),
    ).toHaveLength(1);
  });

  it("nêu lý do mái không đủ và sai pha", () => {
    expect(
      recommendSolarPackages({
        input: { ...standardInput, roofAreaM2: 5 },
        packages: createPackages(),
        settings,
        provinceFactor: 1,
      }).noRecommendationReason,
    ).toBe("roof_too_small");
    expect(
      recommendSolarPackages({
        input: { ...standardInput, electricalPhase: "three-phase" },
        packages: createPackages(),
        settings,
        provinceFactor: 1,
      }).noRecommendationReason,
    ).toBe("phase_mismatch");
  });

  it("ưu tiên gói rẻ hơn khi giá trị vòng đời tương đương và hoàn vốn không chậm hơn", () => {
    const base = createPackages()[1]!;
    const gridTied = { ...base, id: "grid", code: "GRID", priceVnd: 30_000_000 };
    const hybrid = (priceVnd: number): SolarPackage => ({
      ...base,
      id: "hybrid",
      code: "HYBRID",
      systemType: "hybrid",
      batteryCapacityKwh: 5,
      baseMonthlyGenerationKwh: 420,
      priceVnd,
    });
    const recommend = (priceVnd: number) =>
      recommendSolarPackages({
        input: standardInput,
        packages: [gridTied, hybrid(priceVnd)],
        settings,
        provinceFactor: 1,
      });
    const score = (result: ReturnType<typeof recommend>, id: string) =>
      result.comparedPackages.find((item) => item.packageId === id)!.score;

    // Hybrid scores higher, but grid-tied keeps >= 95% of its NPV for 60% of
    // the money and pays back sooner: the honest advice is grid-tied.
    const nearEqualValue = recommend(50_000_000);
    expect(score(nearEqualValue, "hybrid")).toBeGreaterThan(score(nearEqualValue, "grid"));
    expect(nearEqualValue.recommendedPackage?.packageId).toBe("grid");

    // Policy (2026-11-09): without a backup need the battery is an upsell, so
    // grid-tied leads even when the hybrid adds lifetime value; the hybrid
    // stays in the comparison as the upgrade option.
    const clearlyBetter = recommend(40_000_000);
    expect(clearlyBetter.recommendedPackage?.packageId).toBe("grid");
    expect(clearlyBetter.comparedPackages.map((item) => item.packageId)).toContain("hybrid");
  });

  it("khách cần dự phòng vẫn được đề xuất gói hybrid đủ pin dù không hoàn vốn trong 10 năm", () => {
    const base = createPackages()[1]!;
    const expensiveHybrid: SolarPackage = {
      ...base,
      id: "hybrid-expensive",
      code: "HYBRID-EXP",
      systemType: "hybrid",
      batteryCapacityKwh: 16,
      priceVnd: 400_000_000,
    };
    const backupInput = {
      ...standardInput,
      backupRequired: true,
      essentialLoadWatts: 500,
      backupHours: 4,
    };
    const withBackup = recommendSolarPackages({
      input: backupInput,
      packages: [expensiveHybrid],
      settings,
      provinceFactor: 1,
    });
    expect(withBackup.noRecommendationReason).toBeUndefined();
    expect(withBackup.recommendedPackage?.packageId).toBe("hybrid-expensive");
    expect(withBackup.recommendedPackage?.economicNote).toBe("backup_cost");

    // The same package for a customer without a backup need stays unsold.
    const withoutBackup = recommendSolarPackages({
      input: standardInput,
      packages: [expensiveHybrid],
      settings,
      provinceFactor: 1,
    });
    expect(withoutBackup.recommendedPackage).toBeNull();
    expect(withoutBackup.noRecommendationReason).toBe("not_economical");
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

  it("ưu tiên grid-tied khi hai package giống hệt nhau về thiết bị", () => {
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

    // The hybrid inverter draws standby power and costs more to replace, so
    // an otherwise identical grid-tied package must rank first.
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
