import { describe, expect, it } from "vitest";

import provinces from "../scripts/province-coordinates.json";
import {
  assertUniqueProvinceCoordinates,
  assertValidIrradianceFactor,
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
