import { describe, expect, it } from "vitest";

import { CALCULATION_CONSTANTS } from "@/config/defaults";
import {
  householdLoadProfile,
  requiredBackupReserveKwh,
  simulateMonth,
  usableBatteryKwh,
} from "@/lib/energy-simulation";

const noBattery = {
  nominalKwh: 0,
  roundTripEfficiency: 0.9,
  dailyCycleFactor: 1,
  backupReserveKwh: 0,
};

describe("householdLoadProfile", () => {
  it.each([0, 0.3, 0.5, 0.75, 1])("sums to 1 and puts the daytime share in 6h-18h (%s)", (ratio) => {
    const profile = householdLoadProfile(ratio);
    expect(profile).toHaveLength(24);
    expect(profile.reduce((total, value) => total + value, 0)).toBeCloseTo(1, 12);
    expect(profile.slice(6, 18).reduce((total, value) => total + value, 0)).toBeCloseTo(ratio, 12);
    expect(profile.every((value) => value >= 0)).toBe(true);
  });
});

describe("battery helpers", () => {
  it("applies depth of discharge and inverter losses", () => {
    expect(usableBatteryKwh(16)).toBeCloseTo(16 * CALCULATION_CONSTANTS.battery.depthOfDischarge, 12);
    expect(requiredBackupReserveKwh(1_000, 4)).toBeCloseTo(
      4 / CALCULATION_CONSTANTS.battery.backupInverterEfficiency,
      12,
    );
  });

  it("treats unknown or non-positive backup needs as no reserve", () => {
    expect(requiredBackupReserveKwh(null, 4)).toBe(0);
    expect(requiredBackupReserveKwh(1_000, null)).toBe(0);
    expect(requiredBackupReserveKwh(0, 4)).toBe(0);
    expect(requiredBackupReserveKwh(Number.NaN, 4)).toBe(0);
  });
});

describe("simulateMonth", () => {
  const cases = [
    { generation: 0, consumption: 15, ratio: 0.5, battery: 0 },
    { generation: 20, consumption: 0, ratio: 0.5, battery: 16 },
    { generation: 20, consumption: 15, ratio: 0.3, battery: 0 },
    { generation: 20, consumption: 15, ratio: 0.3, battery: 16 },
    { generation: 40, consumption: 10, ratio: 0.75, battery: 16 },
    { generation: 5, consumption: 30, ratio: 0.5, battery: 16 },
  ];

  it.each(cases)("conserves energy %o", ({ generation, consumption, ratio, battery }) => {
    const flows = simulateMonth({
      dailyGenerationKwh: generation,
      dailyConsumptionKwh: consumption,
      daytimeRatio: ratio,
      battery: { ...noBattery, nominalKwh: battery },
    });
    const days = CALCULATION_CONSTANTS.daysPerMonth;

    expect(flows.generationKwh).toBeCloseTo(generation * days, 6);
    expect(flows.consumptionKwh).toBeCloseTo(consumption * days, 6);
    // Every kWh of load is served by PV, battery or grid.
    expect(flows.directSolarUseKwh + flows.batteryDischargeKwh + flows.gridImportKwh).toBeCloseTo(
      flows.consumptionKwh + flows.standbyLoadKwh,
      6,
    );
    // Battery output never exceeds the PV that went into it.
    expect(flows.batteryDischargeKwh).toBeLessThanOrEqual(
      flows.generationKwh - flows.directSolarUseKwh - flows.surplusKwh + 1e-6,
    );
    for (const value of Object.values(flows)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(value)).toBe(true);
    }
  });

  it("has no battery flow without a battery or without PV", () => {
    const withoutBattery = simulateMonth({
      dailyGenerationKwh: 30,
      dailyConsumptionKwh: 15,
      daytimeRatio: 0.3,
      battery: noBattery,
    });
    const withoutPv = simulateMonth({
      dailyGenerationKwh: 0,
      dailyConsumptionKwh: 15,
      daytimeRatio: 0.3,
      battery: { ...noBattery, nominalKwh: 16 },
    });
    expect(withoutBattery.batteryDischargeKwh).toBe(0);
    expect(withoutPv.batteryDischargeKwh).toBe(0);
    expect(withoutPv.gridImportKwh).toBeCloseTo(15 * 30, 6);
  });

  it("still imports from the grid on overcast days with an oversized battery", () => {
    const flows = simulateMonth({
      dailyGenerationKwh: 22,
      dailyConsumptionKwh: 15,
      daytimeRatio: 0.5,
      battery: { ...noBattery, nominalKwh: 32 },
    });
    expect(flows.gridImportKwh).toBeGreaterThan(0);
  });

  it("never uses the backup reserve for daily self-consumption", () => {
    const usable = usableBatteryKwh(16);
    const flows = simulateMonth({
      dailyGenerationKwh: 30,
      dailyConsumptionKwh: 15,
      daytimeRatio: 0.3,
      battery: { ...noBattery, nominalKwh: 16, backupReserveKwh: usable },
    });
    expect(flows.batteryDischargeKwh).toBe(0);
  });

  it("adds the system standby load to grid import at night", () => {
    const base = {
      dailyGenerationKwh: 0,
      dailyConsumptionKwh: 10,
      daytimeRatio: 0.5,
      battery: noBattery,
    };
    const plain = simulateMonth(base);
    const withStandby = simulateMonth({ ...base, systemStandbyLoadKw: 0.04 });
    expect(withStandby.gridImportKwh - plain.gridImportKwh).toBeCloseTo(0.04 * 24 * 30, 6);
  });
});
