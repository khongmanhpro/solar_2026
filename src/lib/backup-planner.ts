import { CALCULATION_CONSTANTS } from "@/config/defaults";
import { usableBatteryKwh } from "@/lib/energy-simulation";
import { packagePowerLimits, type PowerLimitSource } from "@/lib/package-power";
import type { SolarPackage } from "@/types/solar";

export interface BackupEstimate {
  usableKwh: number;
  loadWatts: number;
  /** Hours a full battery can carry the load; null when no load is selected. */
  hours: number | null;
  /** Power the package can carry during an outage (kW). */
  backupKw: number;
  /** Where `backupKw` comes from: EPS datasheet, inverter rating or kWp estimate. */
  backupKwSource: PowerLimitSource;
  exceedsBackupPower: boolean;
}

/**
 * Outage runtime from a full battery at rated appliance power — a
 * deliberately conservative figure (fridges and inverter ACs cycle below
 * their rating, so real runtime is usually longer).
 */
export function estimateBackup(
  solarPackage: Pick<
    SolarPackage,
    "batteryCapacityKwh" | "capacityKwp" | "inverterAcKw" | "batteryPowerKw" | "backupOutputKw"
  >,
  loadWatts: number,
): BackupEstimate {
  const usableKwh = usableBatteryKwh(solarPackage.batteryCapacityKwh);
  const deliverableKwh = usableKwh * CALCULATION_CONSTANTS.battery.backupInverterEfficiency;
  const { backupKw, backupSource } = packagePowerLimits(solarPackage);
  const load = Math.max(0, loadWatts);

  return {
    usableKwh,
    loadWatts: load,
    hours: load > 0 && deliverableKwh > 0 ? deliverableKwh / (load / 1_000) : null,
    backupKw,
    backupKwSource: backupSource,
    exceedsBackupPower: load / 1_000 > backupKw,
  };
}

const powerFormatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

/** Customer-facing warning, worded by how certain the power figure is. */
export function backupPowerWarning(backupKw: number, source: PowerLimitSource): string {
  const kw = powerFormatter.format(backupKw);
  const advice = "Hãy bớt thiết bị chạy cùng lúc hoặc trao đổi với kỹ sư.";
  if (source === "datasheet") {
    return `Tổng công suất vượt công suất dự phòng của gói (${kw} kW). ${advice}`;
  }
  if (source === "inverter-rating") {
    return `Tổng công suất vượt công suất inverter (${kw} kW); công suất dự phòng thực tế kỹ sư xác nhận khi khảo sát. ${advice}`;
  }
  return `Tổng công suất vượt khả năng inverter ước tính (~${kw} kW). ${advice}`;
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
