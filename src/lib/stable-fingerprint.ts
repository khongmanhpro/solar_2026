import { createHash } from "node:crypto";

function canonicalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);

  if (value !== null && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        const nestedValue = (value as Record<string, unknown>)[key];
        if (nestedValue !== undefined) {
          result[key] = canonicalize(nestedValue);
        }
        return result;
      }, {});
  }

  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function createContentFingerprint(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function versionWithFingerprint(
  version: string,
  value: unknown,
): string {
  return `${version}+sha256.${createContentFingerprint(value)}`;
}
