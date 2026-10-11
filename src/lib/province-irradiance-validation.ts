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

// Vietnam rooftop PV realistically yields ~950-1,750 kWh/kWp/year; anything outside
// these bounds indicates a bad PVGIS response (e.g. degenerate optimal-angle solve).
export const MONTHLY_YIELD_MIN_KWH_PER_KWP = 40;
export const MONTHLY_YIELD_MAX_KWH_PER_KWP = 200;
export const YEARLY_YIELD_MIN_KWH_PER_KWP = 900;
export const YEARLY_YIELD_MAX_KWH_PER_KWP = 2_000;

export function isPlausibleMonthlyYield(
  monthlyYieldKwhPerKwp: readonly number[],
): boolean {
  if (monthlyYieldKwhPerKwp.length !== 12) return false;
  if (
    monthlyYieldKwhPerKwp.some(
      (value) =>
        !Number.isFinite(value) ||
        value < MONTHLY_YIELD_MIN_KWH_PER_KWP ||
        value > MONTHLY_YIELD_MAX_KWH_PER_KWP,
    )
  ) {
    return false;
  }
  const yearly = monthlyYieldKwhPerKwp.reduce((total, value) => total + value, 0);
  return yearly >= YEARLY_YIELD_MIN_KWH_PER_KWP && yearly <= YEARLY_YIELD_MAX_KWH_PER_KWP;
}

export function assertPlausibleMonthlyYield(
  monthlyYieldKwhPerKwp: readonly number[],
): void {
  if (!isPlausibleMonthlyYield(monthlyYieldKwhPerKwp)) {
    throw new Error(
      `Implausible monthly yield [${monthlyYieldKwhPerKwp.join(", ")}] kWh/kWp. Check PVGIS response and coordinates.`,
    );
  }
}
