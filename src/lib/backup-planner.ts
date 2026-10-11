import { CALCULATION_CONSTANTS } from "@/config/defaults";
import { usableBatteryKwh } from "@/lib/energy-simulation";

export interface BackupEstimate {
  usableKwh: number;
  loadWatts: number;
  /** Hours a full battery can carry the load; null when no load is selected. */
  hours: number | null;
  /** Rough inverter AC limit (kW) estimated from the array size. */
  estimatedInverterKw: number;
  exceedsInverter: boolean;
}

/**
 * Outage runtime from a full battery at rated appliance power — a
 * deliberately conservative figure (fridges and inverter ACs cycle below
 * their rating, so real runtime is usually longer).
 */
export function estimateBackup(
  batteryCapacityKwh: number,
  capacityKwp: number,
  loadWatts: number,
): BackupEstimate {
  const usableKwh = usableBatteryKwh(batteryCapacityKwh);
  const deliverableKwh = usableKwh * CALCULATION_CONSTANTS.battery.backupInverterEfficiency;
  const estimatedInverterKw = capacityKwp / CALCULATION_CONSTANTS.finance.assumedDcAcRatio;
  const load = Math.max(0, loadWatts);

  return {
    usableKwh,
    loadWatts: load,
    hours: load > 0 && deliverableKwh > 0 ? deliverableKwh / (load / 1_000) : null,
    estimatedInverterKw,
    exceedsInverter: load / 1_000 > estimatedInverterKw,
  };
}

export interface BatteryUpgradeValue {
  extraPriceVnd: number;
  extraMonthlySavingsVnd: number;
  /** Years for the battery's extra savings alone to repay its extra price. */
  standalonePaybackYears: number | null;
}

/** Economics of choosing the hybrid over a grid-tied alternative. */
export function batteryUpgradeValue(
  hybrid: { priceVnd: number; monthlySavingsVnd: number },
  gridTied: { priceVnd: number; monthlySavingsVnd: number },
): BatteryUpgradeValue {
  const extraPriceVnd = hybrid.priceVnd - gridTied.priceVnd;
  const extraMonthlySavingsVnd = hybrid.monthlySavingsVnd - gridTied.monthlySavingsVnd;
  return {
    extraPriceVnd,
    extraMonthlySavingsVnd,
    standalonePaybackYears:
      extraPriceVnd > 0 && extraMonthlySavingsVnd > 0
        ? extraPriceVnd / (extraMonthlySavingsVnd * 12)
        : null,
  };
}
