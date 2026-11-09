import { CUSTOMER_REFERENCE_PACKAGE_DATA_VERSION } from "@/config/customer-reference-packages";
import { TRIAL_PACKAGE_DATA_VERSION_PREFIX } from "@/config/trial-market-data";

/**
 * Package catalogs are told apart by `dataVersion`. An admin edit appends a
 * "+admin-…" marker so the package stays in its catalog (customers keep seeing
 * it) while the marker and DRAFT status show it is no longer the approved copy.
 */
const ADMIN_MARKER = "+";

export function catalogFamily(dataVersion: string): string {
  const index = dataVersion.indexOf(ADMIN_MARKER);
  return index < 0 ? dataVersion : dataVersion.slice(0, index);
}

export function adminEditedVersion(dataVersion: string): string {
  return `${catalogFamily(dataVersion)}${ADMIN_MARKER}admin-edit`;
}

export function adminCreatedVersion(catalogVersion: string | null): string {
  return catalogVersion === null
    ? "demo-package-unapproved"
    : `${catalogFamily(catalogVersion)}${ADMIN_MARKER}admin-new`;
}

export function isReferenceCatalogVersion(dataVersion: string): boolean {
  return catalogFamily(dataVersion) === CUSTOMER_REFERENCE_PACKAGE_DATA_VERSION;
}

export function isTrialCatalogVersion(dataVersion: string): boolean {
  return dataVersion.startsWith(TRIAL_PACKAGE_DATA_VERSION_PREFIX);
}

export interface CustomerCatalog<T> {
  packages: T[];
  /** Catalog the packages belong to; null for the untagged "stable" fallback. */
  catalogVersion: string | null;
}

/**
 * Which active packages customers see: the reference catalog when it has any
 * active package, else the trial catalog (when enabled), else everything that
 * is not trial data.
 */
export function selectCustomerCatalog<T extends { active: boolean; dataVersion: string }>(
  packages: readonly T[],
  trialEnabled: boolean,
): CustomerCatalog<T> {
  const active = packages.filter((item) => item.active);

  const reference = active.filter((item) => isReferenceCatalogVersion(item.dataVersion));
  if (reference.length > 0) {
    return { packages: reference, catalogVersion: CUSTOMER_REFERENCE_PACKAGE_DATA_VERSION };
  }

  if (trialEnabled) {
    const trial = active.filter((item) => isTrialCatalogVersion(item.dataVersion));
    if (trial.length > 0) {
      return { packages: trial, catalogVersion: catalogFamily(trial[0].dataVersion) };
    }
  }

  return {
    packages: active.filter((item) => !isTrialCatalogVersion(item.dataVersion)),
    catalogVersion: null,
  };
}

export interface DisplayOrderChange {
  id: string;
  displayOrder: number;
}

/**
 * Moves one package up/down among the packages of the same group (e.g. those
 * customers see), so a swap never lands on a hidden package. The group keeps
 * its own order values; duplicates are replaced by a clean sequence. Returns
 * only the packages whose order actually changes, or null at the edge.
 */
export function moveWithinGroup<T extends { id: string; displayOrder: number }>(
  sortedPackages: readonly T[],
  id: string,
  direction: -1 | 1,
  sameGroup: (first: T, second: T) => boolean,
): DisplayOrderChange[] | null {
  const moving = sortedPackages.find((item) => item.id === id);
  if (!moving) return null;
  const group = sortedPackages.filter((item) => sameGroup(item, moving));
  const index = group.findIndex((item) => item.id === id);
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= group.length) return null;

  const reordered = [...group];
  [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

  const values = group.map((item) => item.displayOrder);
  const distinct = new Set(values).size === values.length;
  const slots = distinct
    ? values
    : group.map((_, position) => Math.min(...values) + position);

  return reordered.flatMap((item, position) =>
    item.displayOrder === slots[position] ? [] : [{ id: item.id, displayOrder: slots[position] }],
  );
}
