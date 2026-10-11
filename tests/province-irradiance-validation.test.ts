import { describe, expect, it } from "vitest";

import provinces from "../scripts/province-coordinates.json";
import {
  assertUniqueProvinceCoordinates,
  assertPlausibleMonthlyYield,
  assertValidIrradianceFactor,
  isPlausibleMonthlyYield,
} from "@/lib/province-irradiance-validation";

describe("province irradiance validation", () => {
  it("rejects invalid irradiance factors before they can be persisted", () => {
    for (const factor of [0, -0.1, Number.NaN, Number.POSITIVE_INFINITY, 2.01]) {
      expect(() => assertValidIrradianceFactor(factor)).toThrow(
        "Invalid irradiance factor",
      );
    }
    expect(() => assertValidIrradianceFactor(1.2)).not.toThrow();
  });

  it("keeps every province at distinct representative coordinates", () => {
    expect(() => assertUniqueProvinceCoordinates(provinces)).not.toThrow();
  });

  it("rejects duplicate representative coordinates", () => {
    expect(() =>
      assertUniqueProvinceCoordinates([
        { code: "a", name: "A", lat: 1, lon: 2 },
        { code: "b", name: "B", lat: 1, lon: 2 },
      ]),
    ).toThrow("Duplicate province coordinates");
  });
});

describe("monthly yield plausibility", () => {
  const hoChiMinh = [118.6, 122.19, 136.45, 127.49, 115.25, 103.65, 103.56, 109.87, 101.33, 105.03, 104.97, 109.96];

  it("accepts realistic Vietnamese monthly yields", () => {
    expect(isPlausibleMonthlyYield(hoChiMinh)).toBe(true);
    expect(() => assertPlausibleMonthlyYield(hoChiMinh)).not.toThrow();
  });

  it("rejects a degenerate PVGIS response (~1/3 of expected yield)", () => {
    const degenerate = [31.6, 28.84, 34.23, 33.63, 39.61, 40.93, 43.21, 42.94, 41.09, 39.04, 31.3, 31.08];
    expect(isPlausibleMonthlyYield(degenerate)).toBe(false);
    expect(() => assertPlausibleMonthlyYield(degenerate)).toThrow("Implausible monthly yield");
  });

  it("rejects wrong length, non-finite and out-of-range months", () => {
    expect(isPlausibleMonthlyYield(hoChiMinh.slice(0, 11))).toBe(false);
    expect(isPlausibleMonthlyYield([...hoChiMinh.slice(0, 11), Number.NaN])).toBe(false);
    expect(isPlausibleMonthlyYield([...hoChiMinh.slice(0, 11), 250])).toBe(false);
  });
});
