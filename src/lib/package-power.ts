import { CALCULATION_CONSTANTS } from "@/config/defaults";
import type { SolarPackage } from "@/types/solar";

export type PowerLimitSource = "datasheet" | "inverter-rating" | "estimated";

export interface PackagePowerLimits {
  /** Inverter AC output cap (kW) used for clipping. */
  inverterAcKw: number;
  inverterAcSource: Exclude<PowerLimitSource, "datasheet">;
  /** Battery charge/discharge cap (kW); same as the inverter when unknown. */
  batteryPowerKw: number;
  /** Power the package can deliver during an outage (kW). */
  backupKw: number;
  backupSource: PowerLimitSource;
}

function positive(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Power limits of a package, falling back step by step when a datasheet value
 * is missing: inverter rating → kWp ÷ assumed DC/AC ratio. Backup output is the
 * lower of the EPS rating and the battery's discharge power (NLMT course:
 * backup = min(EPS, battery discharge, bypass)).
 */
export function packagePowerLimits(
  solarPackage: Pick<
    SolarPackage,
    "capacityKwp" | "inverterAcKw" | "batteryPowerKw" | "backupOutputKw"
  >,
): PackagePowerLimits {
  const ratedAc = positive(solarPackage.inverterAcKw);
  const inverterAcKw =
    ratedAc ?? Math.max(0, solarPackage.capacityKwp) / CALCULATION_CONSTANTS.finance.assumedDcAcRatio;
  const inverterAcSource = ratedAc === null ? "estimated" : "inverter-rating";
  const batteryPowerKw = positive(solarPackage.batteryPowerKw) ?? inverterAcKw;
  const eps = positive(solarPackage.backupOutputKw);
  const backupKw = Math.min(eps ?? inverterAcKw, batteryPowerKw);

  return {
    inverterAcKw,
    inverterAcSource,
    batteryPowerKw,
    backupKw,
    backupSource: eps !== null ? "datasheet" : inverterAcSource,
  };
}
