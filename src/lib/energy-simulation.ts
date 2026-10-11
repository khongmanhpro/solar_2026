import { CALCULATION_CONSTANTS } from "@/config/defaults";

/** Energy flows for one billing month (30 days), all in kWh. */
export interface MonthlyEnergyFlows {
  generationKwh: number;
  /** Household consumption, excluding the system's own standby load. */
  consumptionKwh: number;
  standbyLoadKwh: number;
  directSolarUseKwh: number;
  batteryDischargeKwh: number;
  gridImportKwh: number;
  /** PV energy neither used directly nor stored (exported/curtailed). */
  surplusKwh: number;
}

export interface BatteryParameters {
  /** Nominal capacity; 0 means no battery. */
  nominalKwh: number;
  roundTripEfficiency: number;
  /** Maximum daily discharge as a share of usable capacity (0-1). */
  dailyCycleFactor: number;
  /** Energy held back for outages; never used for daily self-consumption. */
  backupReserveKwh: number;
}

export interface SimulateMonthParams {
  /** Mean daily PV energy for this month (kWh/day). */
  dailyGenerationKwh: number;
  /** Mean daily household consumption (kWh/day). */
  dailyConsumptionKwh: number;
  /** Share of daily consumption between 6h and 18h (0-1). */
  daytimeRatio: number;
  battery: BatteryParameters;
  /** Constant load added by the system itself (e.g. hybrid inverter idle). */
  systemStandbyLoadKw?: number;
}

interface DayFlows {
  generationKwh: number;
  directSolarUseKwh: number;
  batteryDischargeKwh: number;
  gridImportKwh: number;
  surplusKwh: number;
}

const HOURS = 24;

function normalisedSolarProfile(): number[] {
  const raw: readonly number[] = CALCULATION_CONSTANTS.solarHourlyProfile;
  const total = raw.reduce((sum, value) => sum + value, 0);
  return raw.map((value) => value / total);
}

const SOLAR_PROFILE = normalisedSolarProfile();

/**
 * Hourly household load shape for a given daytime share. Daytime energy is
 * spread evenly over the daytime window; night energy is weighted towards the
 * evening peak. The shape always sums to 1.
 */
export function householdLoadProfile(daytimeRatio: number): number[] {
  const { daytimeStartHour, daytimeEndHour, eveningPeakEndHour, eveningShareOfNight } =
    CALCULATION_CONSTANTS.load;
  const ratio = Math.min(1, Math.max(0, daytimeRatio));
  const daytimeHours = daytimeEndHour - daytimeStartHour;
  const eveningHours = eveningPeakEndHour - daytimeEndHour;
  const lateNightHours = HOURS - daytimeHours - eveningHours;
  const night = 1 - ratio;

  return Array.from({ length: HOURS }, (_, hour) => {
    if (hour >= daytimeStartHour && hour < daytimeEndHour) {
      return ratio / daytimeHours;
    }
    if (hour >= daytimeEndHour && hour < eveningPeakEndHour) {
      return (night * eveningShareOfNight) / eveningHours;
    }
    return (night * (1 - eveningShareOfNight)) / lateNightHours;
  });
}

/** Battery energy reserved for the customer's declared outage needs. */
export function requiredBackupReserveKwh(
  essentialLoadWatts: number | null,
  backupHours: number | null,
): number {
  if (
    essentialLoadWatts === null ||
    backupHours === null ||
    !Number.isFinite(essentialLoadWatts) ||
    !Number.isFinite(backupHours) ||
    essentialLoadWatts <= 0 ||
    backupHours <= 0
  ) {
    return 0;
  }
  return (
    (essentialLoadWatts * backupHours) /
    1_000 /
    CALCULATION_CONSTANTS.battery.backupInverterEfficiency
  );
}

export function usableBatteryKwh(nominalKwh: number): number {
  return Math.max(0, nominalKwh) * CALCULATION_CONSTANTS.battery.depthOfDischarge;
}

/**
 * Simulates one day hour by hour. Charging losses are applied on the way in,
 * so stored energy can be discharged 1:1. `initialStoredKwh` is the energy
 * available above the backup reserve at midnight.
 */
function simulateDay(
  pvProfileKwh: readonly number[],
  loadProfileKwh: readonly number[],
  cycleCapacityKwh: number,
  maxDailyDischargeKwh: number,
  roundTripEfficiency: number,
  initialStoredKwh: number,
): { flows: DayFlows; endStoredKwh: number } {
  let stored = initialStoredKwh;
  let dischargedToday = 0;
  const flows: DayFlows = {
    generationKwh: 0,
    directSolarUseKwh: 0,
    batteryDischargeKwh: 0,
    gridImportKwh: 0,
    surplusKwh: 0,
  };

  for (let hour = 0; hour < HOURS; hour++) {
    const pv = pvProfileKwh[hour];
    const load = loadProfileKwh[hour];
    const direct = Math.min(pv, load);
    let excess = pv - direct;
    let deficit = load - direct;

    if (excess > 0 && cycleCapacityKwh > 0 && roundTripEfficiency > 0) {
      const room = cycleCapacityKwh - stored;
      const acceptedPv = Math.min(excess, room / roundTripEfficiency);
      stored += acceptedPv * roundTripEfficiency;
      excess -= acceptedPv;
    }

    if (deficit > 0 && stored > 0) {
      const discharge = Math.min(
        deficit,
        stored,
        Math.max(0, maxDailyDischargeKwh - dischargedToday),
      );
      stored -= discharge;
      dischargedToday += discharge;
      deficit -= discharge;
      flows.batteryDischargeKwh += discharge;
    }

    flows.generationKwh += pv;
    flows.directSolarUseKwh += direct;
    flows.gridImportKwh += deficit;
    flows.surplusKwh += excess;
  }

  return { flows, endStoredKwh: stored };
}

/**
 * Energy flows for a 30-day billing month, averaged over sunny / average /
 * overcast day types so batteries are not assumed to fill every day.
 */
export function simulateMonth({
  dailyGenerationKwh,
  dailyConsumptionKwh,
  daytimeRatio,
  battery,
  systemStandbyLoadKw = 0,
}: SimulateMonthParams): MonthlyEnergyFlows {
  const days = CALCULATION_CONSTANTS.daysPerMonth;
  const standbyKw = Math.max(0, systemStandbyLoadKw);
  const loadShape = householdLoadProfile(daytimeRatio);
  const loadProfileKwh = loadShape.map(
    (share) => share * Math.max(0, dailyConsumptionKwh) + standbyKw,
  );
  const usable = usableBatteryKwh(battery.nominalKwh);
  const cycleCapacityKwh = Math.max(0, usable - battery.backupReserveKwh);
  const maxDailyDischargeKwh =
    cycleCapacityKwh * Math.min(1, Math.max(0, battery.dailyCycleFactor));
  const efficiency = Math.min(1, Math.max(0, battery.roundTripEfficiency));

  const total: MonthlyEnergyFlows = {
    generationKwh: 0,
    consumptionKwh: Math.max(0, dailyConsumptionKwh) * days,
    standbyLoadKwh: standbyKw * HOURS * days,
    directSolarUseKwh: 0,
    batteryDischargeKwh: 0,
    gridImportKwh: 0,
    surplusKwh: 0,
  };

  for (const dayType of CALCULATION_CONSTANTS.dayTypes) {
    const pvProfileKwh = SOLAR_PROFILE.map(
      (share) =>
        share * Math.max(0, dailyGenerationKwh) * dayType.generationFactor,
    );
    // Repeat the day so the overnight state of charge reaches steady state.
    let stored = 0;
    let day: DayFlows | null = null;
    for (let index = 0; index < CALCULATION_CONSTANTS.battery.warmUpDays; index++) {
      const simulated = simulateDay(
        pvProfileKwh,
        loadProfileKwh,
        cycleCapacityKwh,
        maxDailyDischargeKwh,
        efficiency,
        stored,
      );
      stored = simulated.endStoredKwh;
      day = simulated.flows;
    }
    if (!day) continue;

    const dayWeight = dayType.weight * days;
    total.generationKwh += day.generationKwh * dayWeight;
    total.directSolarUseKwh += day.directSolarUseKwh * dayWeight;
    total.batteryDischargeKwh += day.batteryDischargeKwh * dayWeight;
    total.gridImportKwh += day.gridImportKwh * dayWeight;
    total.surplusKwh += day.surplusKwh * dayWeight;
  }

  return total;
}
