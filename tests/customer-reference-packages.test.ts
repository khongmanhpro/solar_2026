import { describe, expect, it } from "vitest";

import {
  CUSTOMER_REFERENCE_PACKAGE_DATA_VERSION,
  CUSTOMER_REFERENCE_PACKAGES,
} from "@/config/customer-reference-packages";

describe("customer reference package catalog", () => {
  it("contains seven fixed household reference options in display order", () => {
    expect(CUSTOMER_REFERENCE_PACKAGES).toHaveLength(7);
    expect(CUSTOMER_REFERENCE_PACKAGES.map((item) => item.code)).toEqual([
      "HOME-GT-1P-5K",
      "HOME-GT-1P-6K",
      "HOME-GT-1P-8K",
      "HOME-HY-1P-6K-16K",
      "HOME-HY-1P-7K2-16K",
      "HOME-HY-3P-8K-16K",
      "HOME-HY-3P-12K-16K",
    ]);
    expect(
      CUSTOMER_REFERENCE_PACKAGES.every(
        (item) =>
          item.active &&
          item.dataVersion === CUSTOMER_REFERENCE_PACKAGE_DATA_VERSION &&
          item.priceVnd > 0 &&
          item.requiredRoofAreaM2 > 0,
      ),
    ).toBe(true);
  });

  it("keeps the sample quotation as a separate reference option", () => {
    expect(CUSTOMER_REFERENCE_PACKAGES).toContainEqual(
      expect.objectContaining({
        code: "HOME-HY-1P-7K2-16K",
        capacityKwp: 7.2,
        batteryCapacityKwh: 16,
        priceVnd: 133_109_600,
        panelModel: "RSM132-8-720BHDG",
        inverterModel: "HESP486S100-H",
      }),
    );
  });

  it("marks the first five packages as single-phase and last two as three-phase", () => {
    expect(CUSTOMER_REFERENCE_PACKAGES.map((item) => item.electricalPhase)).toEqual([
      "single-phase",
      "single-phase",
      "single-phase",
      "single-phase",
      "single-phase",
      "three-phase",
      "three-phase",
    ]);
  });

  it("uses the source-backed model name for the 8 kW single-phase option", () => {
    expect(CUSTOMER_REFERENCE_PACKAGE_DATA_VERSION).toContain("v2");
    expect(CUSTOMER_REFERENCE_PACKAGES).toContainEqual(
      expect.objectContaining({
        code: "HOME-GT-1P-8K",
        inverterModel: "ASW8000-S",
      }),
    );
  });
});
