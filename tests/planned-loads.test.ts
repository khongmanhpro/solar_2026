import { describe, expect, it } from "vitest";

import { DEFAULT_CALCULATION_SETTINGS, DEFAULT_SOLAR_PACKAGES } from "@/config/defaults";
import { QD1279_RESIDENTIAL_TARIFF } from "@/config/electricity-tariffs";
import { resolvePlannedLoads } from "@/config/planned-loads";
import { prepareCalculationInput } from "@/lib/customer-input";
import { calculateElectricityBill, calculateElectricityEnergyCharge } from "@/lib/electricity-tariff";
import { calculateSolarPackage, householdDemand } from "@/lib/solar-calculator";
import { calculationRequestSchema } from "@/lib/validations";
import type { SolarCalculationInput } from "@/types/solar";

const settings = { ...DEFAULT_CALCULATION_SETTINGS };
const context = { householdQuotaMultiplier: 1 };
const charge = (kwh: number) =>
  calculateElectricityEnergyCharge({ tariff: QD1279_RESIDENTIAL_TARIFF, consumptionKwh: kwh, context })
    .energyChargeBeforeVatVnd;

const input: SolarCalculationInput = {
  inputContractVersion: "2.2.0",
  energyInputMethod: "kwh",
  inputMonthCount: 1,
  monthlyConsumptionKwh: 300,
  monthlyBill: charge(300),
  electricityTariffVersion: QD1279_RESIDENTIAL_TARIFF.version,
  tariffBillingContext: context,
  vatRate: 0.08,
  electricityType: "residential",
  electricalPhase: null,
  province: "ho-chi-minh",
  daytimeUsageLevel: "medium",
  roofAreaM2: null,
  backupRequired: false,
  essentialLoadWatts: null,
  backupHours: null,
};
const solarPackage = { id: "p", ...DEFAULT_SOLAR_PACKAGES[2] };

describe("planned loads", () => {
  it("adds planned kWh and blends the daytime share", () => {
    const demand = householdDemand(
      { ...input, plannedLoads: resolvePlannedLoads(["electric-car", "air-conditioner"]) },
      settings,
    );
    expect(demand.plannedKwh).toBe(330);
    expect(demand.monthlyConsumptionKwh).toBe(630);
    expect(demand.daytimeRatio).toBeCloseTo(
      (300 * settings.daytimeMediumRatio + 180 * 0.3 + 150 * 0.4) / 630,
      12,
    );
    expect(householdDemand(input, settings)).toEqual({
      monthlyConsumptionKwh: 300,
      daytimeRatio: settings.daytimeMediumRatio,
      plannedKwh: 0,
    });
  });

  it("compares savings against the future bill, not today's bill", () => {
    const withCar = calculateSolarPackage({
      input: { ...input, plannedLoads: resolvePlannedLoads(["electric-car"]) },
      solarPackage,
      settings,
      provinceFactor: 1,
      allowUnapprovedTariffData: true,
    });
    const today = calculateSolarPackage({
      input,
      solarPackage,
      settings,
      provinceFactor: 1,
      allowUnapprovedTariffData: true,
    });

    expect(today.baselineBillVnd).toBeCloseTo(charge(300) * 1.08, 6);
    expect(withCar.baselineBillVnd).toBeCloseTo(charge(480) * 1.08, 6);
    expect(withCar.estimatedMonthlyConsumptionKwh).toBe(480);
    expect(withCar.plannedAdditionalKwh).toBe(180);
    expect(withCar.billAfterSolarVnd).toBeLessThanOrEqual(withCar.baselineBillVnd! + 1e-6);
    // The same PV avoids pricier top tiers at higher demand.
    expect(withCar.monthlySavingsVnd).toBeGreaterThan(today.monthlySavingsVnd);
  });

  it("keeps the customer's own bill as the anchor when the bill make-up is unknown", () => {
    // Unknown billing context: no tariff context, so the engine prices kWh
    // with the legacy table. The customer's bill must still be the baseline,
    // moved only by what the planned appliance adds on that same table.
    const unknownContext: SolarCalculationInput = {
      ...input,
      energyInputMethod: "money",
      tariffBillingContext: null,
      monthlyBill: 900_000,
    };
    const today = calculateSolarPackage({
      input: unknownContext,
      solarPackage,
      settings,
      provinceFactor: 1,
      allowUnapprovedTariffData: true,
    });
    const withCar = calculateSolarPackage({
      input: { ...unknownContext, plannedLoads: resolvePlannedLoads(["electric-car"]) },
      solarPackage,
      settings,
      provinceFactor: 1,
      allowUnapprovedTariffData: true,
    });
    const legacyDelta =
      calculateElectricityBill("residential", 480) - calculateElectricityBill("residential", 300);

    expect(today.baselineBillVnd).toBeCloseTo(900_000 * 1.08, 6);
    expect(withCar.baselineBillVnd).toBeCloseTo((900_000 + legacyDelta) * 1.08, 6);
    // Adding an appliance never lowers savings for the same PV array.
    expect(withCar.monthlySavingsVnd).toBeGreaterThanOrEqual(today.monthlySavingsVnd - 1e-6);
  });

  it("is carried from the customer request with a provenance warning, and validated", () => {
    const request = {
      schemaVersion: "2.2.0",
      energy: { method: "kwh", observations: [{ period: "2026-09", valueKwh: 300 }] },
      site: {
        province: "ho-chi-minh",
        daytimeBehavior: "some_daytime_use",
        electricalPhase: "single-phase",
        plannedLoads: ["electric-motorbike"],
        roof: { known: false },
        backup: { required: false },
      },
    };
    const parsed = calculationRequestSchema.parse(request);
    const prepared = prepareCalculationInput(parsed, QD1279_RESIDENTIAL_TARIFF.version, {
      allowUnapprovedTariffData: true,
    });
    expect(prepared.input.plannedLoads).toEqual(resolvePlannedLoads(["electric-motorbike"]));
    // Measured consumption stays untouched; planned demand lives separately.
    expect(prepared.input.monthlyConsumptionKwh).toBe(300);
    expect(prepared.normalizedInput.warnings.some((warning) => warning.includes("40 kWh"))).toBe(true);

    expect(() =>
      calculationRequestSchema.parse({ ...request, site: { ...request.site, plannedLoads: ["spaceship"] } }),
    ).toThrow();
  });
});
