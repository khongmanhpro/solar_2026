import { describe, expect, it } from "vitest";

import { CUSTOMER_REFERENCE_PACKAGE_DATA_VERSION } from "@/config/customer-reference-packages";
import { assertReferencePackageOwnership } from "@/lib/customer-reference-package-seed";

describe("customer reference package seed ownership", () => {
  it("allows a new package or an existing reference package to be upserted", () => {
    expect(() =>
      assertReferencePackageOwnership("HOME-GT-1P-5K", undefined),
    ).not.toThrow();
    expect(() =>
      assertReferencePackageOwnership(
        "HOME-GT-1P-5K",
        CUSTOMER_REFERENCE_PACKAGE_DATA_VERSION,
      ),
    ).not.toThrow();
  });

  it("blocks a collision with a non-reference package", () => {
    expect(() =>
      assertReferencePackageOwnership("HOME-GT-1P-5K", "market-preview-v1"),
    ).toThrow("không thuộc catalog tham khảo");
  });
});
