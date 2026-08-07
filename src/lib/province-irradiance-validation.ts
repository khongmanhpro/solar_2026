export interface ProvinceCoordinateInput {
  code: string;
  name: string;
  lat: number;
  lon: number;
}

export function assertValidIrradianceFactor(factor: number): void {
  if (!Number.isFinite(factor) || factor <= 0 || factor > 2) {
    throw new Error(
      `Invalid irradiance factor ${factor}. Check source data and the reference province.`,
    );
  }
}

export function assertUniqueProvinceCoordinates(
  provinces: readonly ProvinceCoordinateInput[],
): void {
  const coordinateOwners = new Map<string, ProvinceCoordinateInput>();
  for (const province of provinces) {
    const key = `${province.lat},${province.lon}`;
    const existing = coordinateOwners.get(key);
    if (existing) {
      throw new Error(
        `Duplicate province coordinates for ${existing.code} and ${province.code} at ${key}.`,
      );
    }
    coordinateOwners.set(key, province);
  }
}
