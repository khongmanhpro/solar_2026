import { describe, expect, it } from "vitest";

import { CUSTOMER_REFERENCE_PACKAGE_DATA_VERSION } from "@/config/customer-reference-packages";
import {
  adminCreatedVersion,
  adminEditedVersion,
  catalogFamily,
  selectCustomerCatalog,
} from "@/lib/package-catalog";

const REF = CUSTOMER_REFERENCE_PACKAGE_DATA_VERSION;
const TRIAL = "market-data-trial-abc123-v1";

const pkg = (id: string, dataVersion: string, active = true) => ({ id, dataVersion, active });

describe("package catalog membership", () => {
  it("keeps the catalog family across repeated admin edits", () => {
    const once = adminEditedVersion(REF);
    expect(once).toBe(`${REF}+admin-edit`);
    expect(adminEditedVersion(once)).toBe(once);
    expect(catalogFamily(once)).toBe(REF);
    expect(adminCreatedVersion(TRIAL)).toBe(`${TRIAL}+admin-new`);
    expect(adminCreatedVersion(null)).toBe("demo-package-unapproved");
  });

  it("shows the reference catalog, including admin-edited and admin-added packages", () => {
    const catalog = selectCustomerCatalog(
      [
        pkg("a", REF),
        pkg("b", `${REF}+admin-edit`),
        pkg("c", `${REF}+admin-new`),
        pkg("off", REF, false),
        pkg("trial", TRIAL),
        pkg("demo", "demo-package-catalog-2026-07-20"),
      ],
      true,
    );
    expect(catalog.packages.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(catalog.catalogVersion).toBe(REF);
  });

  it("does not treat an older reference catalog as the current one", () => {
    const catalog = selectCustomerCatalog(
      [pkg("old", "customer-reference-packages-v1-2026-07-01"), pkg("demo", "demo-x")],
      false,
    );
    expect(catalog.catalogVersion).toBeNull();
    expect(catalog.packages.map((item) => item.id)).toEqual(["old", "demo"]);
  });

  it("falls back to trial data only when enabled, then to non-trial packages", () => {
    const packages = [pkg("trial", TRIAL), pkg("trial-edit", `${TRIAL}+admin-edit`), pkg("demo", "demo-x")];
    expect(selectCustomerCatalog(packages, true)).toEqual({
      packages: [packages[0], packages[1]],
      catalogVersion: TRIAL,
    });
    expect(selectCustomerCatalog(packages, false).packages.map((item) => item.id)).toEqual(["demo"]);
  });
});
