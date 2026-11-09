import { CALCULATION_CONSTANTS } from "@/config/defaults";

/** Energy flows for one billing month (30 days), all in kWh. */
export interface MonthlyEnergyFlows {
  /** PV energy delivered after inverter clipping. */
  generationKwh: number;
  /** DC energy above the inverter AC rating that could not be stored either. */
  clippedKwh: number;
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
  /** Max charge/discharge power (kW, i.e. kWh per simulated hour); null = no limit. */
  maxPowerKw?: number | null;
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
  /** Inverter AC output cap (kW); null = no clipping. */
  inverterAcKw?: number | null;
}

interface DayFlows {
  generationKwh: number;
  clippedKwh: number;
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

interface DayLimits {
  cycleCapacityKwh: number;
  maxDailyDischargeKwh: number;
  roundTripEfficiency: number;
  /** kWh per hour; Infinity = no limit. */
  batteryPowerKw: number;
  inverterAcKw: number;
}

/**
 * Simulates one day hour by hour. Charging losses are applied on the way in,
 * so stored energy can be discharged 1:1. `initialStoredKwh` is the energy
 * available above the backup reserve at midnight.
 *
 * PV above the inverter AC rating is clipped, except what a DC-coupled battery
 * can still absorb; battery charge and discharge are each capped at the
 * battery power rating.
 */
function simulateDay(
  pvProfileKwh: readonly number[],
  loadProfileKwh: readonly number[],
  limits: DayLimits,
  initialStoredKwh: number,
): { flows: DayFlows; endStoredKwh: number } {
  const { cycleCapacityKwh, maxDailyDischargeKwh, roundTripEfficiency, batteryPowerKw, inverterAcKw } =
    limits;
  let stored = initialStoredKwh;
  let dischargedToday = 0;
  const flows: DayFlows = {
    generationKwh: 0,
    clippedKwh: 0,
    directSolarUseKwh: 0,
    batteryDischargeKwh: 0,
    gridImportKwh: 0,
    surplusKwh: 0,
  };

  for (let hour = 0; hour < HOURS; hour++) {
    const pv = pvProfileKwh[hour];
    const load = loadProfileKwh[hour];
    const acPv = Math.min(pv, inverterAcKw);
    let clippedDc = pv - acPv;
    const direct = Math.min(acPv, load);
    let excess = acPv - direct;
    let deficit = load - direct;

    if (
      (excess > 0 || clippedDc > 0) &&
      cycleCapacityKwh > 0 &&
      roundTripEfficiency > 0
    ) {
      let chargeRoomKwh = Math.min(
        (cycleCapacityKwh - stored) / roundTripEfficiency,
        batteryPowerKw,
      );
      // Clipped DC energy is otherwise lost, so it charges the battery first.
      const fromClipped = Math.max(0, Math.min(clippedDc, chargeRoomKwh));
      clippedDc -= fromClipped;
      chargeRoomKwh -= fromClipped;
      const fromExcess = Math.max(0, Math.min(excess, chargeRoomKwh));
      excess -= fromExcess;
      stored += (fromClipped + fromExcess) * roundTripEfficiency;
    }

    if (deficit > 0 && stored > 0) {
      const discharge = Math.min(
        deficit,
        stored,
        batteryPowerKw,
        Math.max(0, maxDailyDischargeKwh - dischargedToday),
      );
      stored -= discharge;
      dischargedToday += discharge;
      deficit -= discharge;
      flows.batteryDischargeKwh += discharge;
    }

    flows.generationKwh += pv - clippedDc;
    flows.clippedKwh += clippedDc;
    flows.directSolarUseKwh += direct;
    flows.gridImportKwh += deficit;
    flows.surplusKwh += excess;
  }

  return { flows, endStoredKwh: stored };
}

function powerLimit(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : Number.POSITIVE_INFINITY;
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
  inverterAcKw = null,
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
  const limits: DayLimits = {
    cycleCapacityKwh,
    maxDailyDischargeKwh,
    roundTripEfficiency: efficiency,
    batteryPowerKw: powerLimit(battery.maxPowerKw),
    inverterAcKw: powerLimit(inverterAcKw),
  };

  const total: MonthlyEnergyFlows = {
    generationKwh: 0,
    clippedKwh: 0,
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
        limits,
        stored,
      );
      stored = simulated.endStoredKwh;
      day = simulated.flows;
    }
    if (!day) continue;

    const dayWeight = dayType.weight * days;
    total.generationKwh += day.generationKwh * dayWeight;
    total.clippedKwh += day.clippedKwh * dayWeight;
    total.directSolarUseKwh += day.directSolarUseKwh * dayWeight;
    total.batteryDischargeKwh += day.batteryDischargeKwh * dayWeight;
    total.gridImportKwh += day.gridImportKwh * dayWeight;
    total.surplusKwh += day.surplusKwh * dayWeight;
  }

  return total;
}
