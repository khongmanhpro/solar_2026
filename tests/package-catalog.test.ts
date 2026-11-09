import { describe, expect, it } from "vitest";

import { CUSTOMER_REFERENCE_PACKAGE_DATA_VERSION } from "@/config/customer-reference-packages";
import {
  adminCreatedVersion,
  adminEditedVersion,
  catalogFamily,
  moveWithinGroup,
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

describe("moveWithinGroup (admin ↑/↓)", () => {
  // Mirrors the dev DB: visible HOME-* packages interleaved with hidden ones
  // that share the same order numbers.
  const rows = [
    { id: "hidden-1", displayOrder: 1, visible: false },
    { id: "home-5k", displayOrder: 1, visible: true },
    { id: "hidden-3", displayOrder: 3, visible: false },
    { id: "home-6k", displayOrder: 2, visible: true },
    { id: "home-8k", displayOrder: 3, visible: true },
    { id: "hidden-4", displayOrder: 4, visible: false },
    { id: "home-hy", displayOrder: 4, visible: true },
  ].sort((a, b) => a.displayOrder - b.displayOrder);
  const sameGroup = (a: { visible: boolean }, b: { visible: boolean }) => a.visible === b.visible;

  it("swaps only with the neighbour customers also see", () => {
    expect(moveWithinGroup(rows, "home-8k", -1, sameGroup)).toEqual([
      { id: "home-8k", displayOrder: 2 },
      { id: "home-6k", displayOrder: 3 },
    ]);
    expect(moveWithinGroup(rows, "home-8k", 1, sameGroup)).toEqual([
      { id: "home-hy", displayOrder: 3 },
      { id: "home-8k", displayOrder: 4 },
    ]);
  });

  it("returns null at the edges of the group", () => {
    expect(moveWithinGroup(rows, "home-5k", -1, sameGroup)).toBeNull();
    expect(moveWithinGroup(rows, "home-hy", 1, sameGroup)).toBeNull();
  });

  it("repairs duplicate order numbers inside a group instead of keeping a tie", () => {
    const tied = [
      { id: "a", displayOrder: 4, visible: true },
      { id: "b", displayOrder: 4, visible: true },
      { id: "c", displayOrder: 5, visible: true },
    ];
    const changes = moveWithinGroup(tied, "c", -1, sameGroup) ?? [];
    const result = new Map(tied.map((item) => [item.id, item.displayOrder]));
    for (const change of changes) result.set(change.id, change.displayOrder);
    expect([...result.entries()].sort((x, y) => x[1] - y[1]).map(([id]) => id)).toEqual(["a", "c", "b"]);
    expect(new Set(result.values()).size).toBe(3);
  });
});

