import { describe, expect, it } from "vitest";

import {
  calculateElectricityBill,
  estimateElectricityConsumptionFromBill,
} from "@/lib/electricity-tariff";

describe("biểu giá điện sinh hoạt 5 bậc", () => {
  it.each([
    [0, 0],
    [100, 198_400],
    [200, 436_400],
    [400, 1_036_000],
    [700, 2_107_300],
    [800, 2_504_000],
  ])("tính %s kWh thành %s đồng", (consumptionKwh, expectedBillVnd) => {
    expect(calculateElectricityBill("residential", consumptionKwh)).toBe(
      expectedBillVnd,
    );
  });

  it.each([100_000, 198_400, 436_400, 1_036_000, 2_000_000, 3_000_000])(
    "suy ngược rồi tính lại đúng hóa đơn %s đồng",
    (billVnd) => {
      const consumptionKwh = estimateElectricityConsumptionFromBill(
        "residential",
        billVnd,
      );

      expect(calculateElectricityBill("residential", consumptionKwh)).toBeCloseTo(
        billVnd,
        8,
      );
    },
  );

  it("suy ngược hóa đơn 2 triệu vào đúng bậc 4", () => {
    expect(
      estimateElectricityConsumptionFromBill("residential", 2_000_000),
    ).toBeCloseTo(669.95239, 5);
  });

  it("từ chối số âm và số không hữu hạn", () => {
    expect(() => calculateElectricityBill("residential", -1)).toThrow(
      RangeError,
    );
    expect(() =>
      estimateElectricityConsumptionFromBill("residential", Number.NaN),
    ).toThrow(RangeError);
  });
});
