import { describe, expect, it } from "vitest";

import {
  DEFAULT_CALCULATION_SETTINGS,
  DEFAULT_SOLAR_PACKAGES,
} from "@/config/defaults";
import { calculateSolarPackage } from "@/lib/solar-calculator";
import { generateSolarInsights } from "@/lib/solar-insights";
import type { SolarCalculationInput, SolarPackage } from "@/types/solar";

function createPackage(index: number): SolarPackage {
  const source = DEFAULT_SOLAR_PACKAGES[index];

  if (!source) {
    throw new Error(`Không tìm thấy package fixture tại index ${index}.`);
  }

  return { id: `package-${index}`, ...source };
}

describe("generateSolarInsights", () => {
  it("sinh nhận xét cho mức dùng ban ngày cao", () => {
    const input: SolarCalculationInput = {
      monthlyBill: 2_000_000,
      electricityType: "residential",
      province: "ho-chi-minh",
      daytimeUsageLevel: "high",
      roofAreaM2: 25,
      backupRequired: false,
    };
    const solarPackage = createPackage(1);
    const result = calculateSolarPackage({
      input,
      solarPackage,
      settings: DEFAULT_CALCULATION_SETTINGS,
      provinceFactor: 1,
    });

    expect(generateSolarInsights({ input, solarPackage, result })).toContain(
      "Bạn sử dụng nhiều điện vào ban ngày nên hệ thống hòa lưới có khả năng mang lại hiệu quả tiết kiệm tốt.",
    );
  });

  it("sinh nhận xét cho mái giới hạn, pin dự phòng và điện dư", () => {
    const input: SolarCalculationInput = {
      monthlyBill: 2_000_000,
      electricityType: "residential",
      province: "ho-chi-minh",
      daytimeUsageLevel: "low",
      roofAreaM2: 18,
      backupRequired: true,
    };
    const solarPackage = createPackage(3);
    const result = calculateSolarPackage({
      input,
      solarPackage,
      settings: DEFAULT_CALCULATION_SETTINGS,
      provinceFactor: 1,
    });
    const insights = generateSolarInsights({ input, solarPackage, result });

    expect(insights).toHaveLength(3);
    expect(insights.some((insight) => insight.includes("Diện tích mái"))).toBe(
      true,
    );
    expect(insights.some((insight) => insight.includes("pin lưu trữ"))).toBe(
      true,
    );
    expect(insights.some((insight) => insight.includes("điện dư"))).toBe(true);
  });

  it("không sử dụng các cụm từ bị cấm", () => {
    const input: SolarCalculationInput = {
      monthlyBill: 2_000_000,
      electricityType: "residential",
      province: "ho-chi-minh",
      daytimeUsageLevel: "low",
      roofAreaM2: 18,
      backupRequired: true,
    };
    const solarPackage = createPackage(3);
    const result = calculateSolarPackage({
      input,
      solarPackage,
      settings: DEFAULT_CALCULATION_SETTINGS,
      provinceFactor: 1,
    });
    const content = generateSolarInsights({ input, solarPackage, result })
      .join(" ")
      .toLocaleLowerCase("vi-VN");

    for (const forbiddenPhrase of [
      "cam kết chắc chắn",
      "chính xác tuyệt đối",
      "không còn tiền điện",
      "chắc chắn hòa vốn",
    ]) {
      expect(content).not.toContain(forbiddenPhrase);
    }
  });
});
