import { CALCULATION_CONSTANTS, REGULATION_CONSTANTS } from "@/config/defaults";
import { ELECTRICITY_TARIFF_REGISTRY } from "@/config/electricity-tariffs";
import {
  requiredBackupReserveKwh,
  simulateMonth,
  type MonthlyEnergyFlows,
} from "@/lib/energy-simulation";
import {
  calculateElectricityBill,
  calculateElectricityEnergyCharge,
} from "@/lib/electricity-tariff";
import {
  calculateLifetimeFinance,
  type LifetimeFinanceResult,
} from "@/lib/financial-model";
import { packagePowerLimits } from "@/lib/package-power";
import { selectElectricityTariffByVersion } from "@/lib/tariff-selection";
import type {
  CalculationScenarioResult,
  CalculationSettings,
  DaytimeUsageLevel,
  LongTermSavings,
  MonthlyBreakdownEntry,
  SolarCalculationInput,
  SolarPackage,
  UnscoredPackageCalculationResult,
} from "@/types/solar";

export interface CalculateSolarPackageParams {
  input: SolarCalculationInput;
  solarPackage: SolarPackage;
  settings: CalculationSettings;
  provinceFactor: number;
  provinceMonthlyYieldKwhPerKwp?: readonly number[] | null;
  allowUnapprovedTariffData?: boolean;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function assertNonNegativeFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} phải là số hữu hạn không âm.`);
  }
}

function assertUnitInterval(value: number, name: string): void {
  assertNonNegativeFinite(value, name);

  if (value > 1) {
    throw new RangeError(`${name} phải nằm trong khoảng từ 0 đến 1.`);
  }
}

function validMonthlyYield(
  monthlyYieldKwhPerKwp: readonly number[] | null | undefined,
): readonly number[] | null {
  if (
    !monthlyYieldKwhPerKwp ||
    monthlyYieldKwhPerKwp.length !== 12 ||
    monthlyYieldKwhPerKwp.some((value) => !Number.isFinite(value) || value < 0)
  ) {
    return null;
  }
  return monthlyYieldKwhPerKwp;
}

function assertCalculationInputs({
  input,
  solarPackage,
  settings,
  provinceFactor,
}: CalculateSolarPackageParams): void {
  assertNonNegativeFinite(input.monthlyBill, "monthlyBill");
  if (input.vatRate !== undefined && input.vatRate !== null) {
    assertUnitInterval(input.vatRate, "vatRate");
  }
  assertNonNegativeFinite(
    input.monthlyConsumptionKwh,
    "monthlyConsumptionKwh",
  );
  if (input.roofAreaM2 !== null) {
    assertNonNegativeFinite(input.roofAreaM2, "roofAreaM2");
  }
  assertNonNegativeFinite(solarPackage.priceVnd, "package.priceVnd");
  assertNonNegativeFinite(
    solarPackage.baseMonthlyGenerationKwh,
    "package.baseMonthlyGenerationKwh",
  );
  assertNonNegativeFinite(
    solarPackage.batteryCapacityKwh,
    "package.batteryCapacityKwh",
  );
  assertNonNegativeFinite(provinceFactor, "provinceFactor");

  if (
    !Number.isFinite(settings.averageElectricityPriceVndPerKwh) ||
    settings.averageElectricityPriceVndPerKwh <= 0
  ) {
    throw new RangeError(
      "averageElectricityPriceVndPerKwh phải là số hữu hạn lớn hơn 0.",
    );
  }

  for (const [name, value] of [
    ["batteryRoundTripEfficiency", settings.batteryRoundTripEfficiency],
    ["batteryDailyCycleFactor", settings.batteryDailyCycleFactor],
    ["daytimeLowRatio", settings.daytimeLowRatio],
    ["daytimeMediumRatio", settings.daytimeMediumRatio],
    ["daytimeHighRatio", settings.daytimeHighRatio],
  ] as const) {
    assertUnitInterval(value, name);
  }

  assertNonNegativeFinite(settings.lowEstimateFactor, "lowEstimateFactor");
  assertNonNegativeFinite(settings.highEstimateFactor, "highEstimateFactor");

  if (
    settings.lowEstimateFactor > 1 ||
    settings.highEstimateFactor < 1 ||
    settings.lowEstimateFactor > settings.highEstimateFactor
  ) {
    throw new RangeError(
      "Hệ số ước tính phải thỏa mãn lowEstimateFactor <= 1 <= highEstimateFactor.",
    );
  }
}

export function getDaytimeUsageRatio(
  level: DaytimeUsageLevel,
  settings: CalculationSettings,
): number {
  const ratios: Record<DaytimeUsageLevel, number> = {
    low: settings.daytimeLowRatio,
    medium: settings.daytimeMediumRatio,
    high: settings.daytimeHighRatio,
  };

  return ratios[level];
}

/**
 * New-system PV generation per 30-day billing month. PVGIS yields keep their
 * seasonal shape (daily intensity from real month length); without them the
 * legacy flat estimate `base x province factor` is used for every month.
 */
export function monthlyGenerationKwh(
  solarPackage: SolarPackage,
  provinceFactor: number,
  provinceMonthlyYieldKwhPerKwp?: readonly number[] | null,
): number[] {
  const yields = validMonthlyYield(provinceMonthlyYieldKwhPerKwp);
  const days = CALCULATION_CONSTANTS.daysPerMonth;
  if (!yields) {
    return Array.from(
      { length: 12 },
      () => solarPackage.baseMonthlyGenerationKwh * provinceFactor,
    );
  }
  return yields.map(
    (yieldKwhPerKwp, index) =>
      (solarPackage.capacityKwp * yieldKwhPerKwp * days) /
      CALCULATION_CONSTANTS.daysInMonth[index],
  );
}

export interface HouseholdDemand {
  /** Measured consumption plus planned appliances (kWh/month). */
  monthlyConsumptionKwh: number;
  /** Blended share of consumption between 6h and 18h. */
  daytimeRatio: number;
  plannedKwh: number;
}

/** Measured demand plus the appliances the customer plans to add. */
export function householdDemand(
  input: SolarCalculationInput,
  settings: CalculationSettings,
): HouseholdDemand {
  const measured = input.monthlyConsumptionKwh;
  const measuredRatio = getDaytimeUsageRatio(input.daytimeUsageLevel, settings);
  const planned = (input.plannedLoads ?? []).filter(
    (load) => Number.isFinite(load.monthlyKwh) && load.monthlyKwh > 0,
  );
  const plannedKwh = sum(planned.map((load) => load.monthlyKwh));
  const total = measured + plannedKwh;
  const daytimeKwh =
    measured * measuredRatio +
    sum(planned.map((load) => load.monthlyKwh * clamp(load.daytimeShare, 0, 1)));

  return {
    monthlyConsumptionKwh: total,
    daytimeRatio: total > 0 ? daytimeKwh / total : measuredRatio,
    plannedKwh,
  };
}

interface SimulatedMonth extends MonthlyEnergyFlows {
  baselineEnergyChargeVnd: number;
  energyChargeAfterSolarVnd: number;
  billAfterSolarVnd: number;
  savingsVnd: number;
}

interface YearSimulator {
  (generationFactor: number): SimulatedMonth[];
}

function createYearSimulator(params: {
  input: SolarCalculationInput;
  solarPackage: SolarPackage;
  settings: CalculationSettings;
  generationByMonth: readonly number[];
  allowUnapprovedTariffData: boolean;
}): YearSimulator {
  const { input, solarPackage, settings, generationByMonth } = params;
  const days = CALCULATION_CONSTANTS.daysPerMonth;
  const vatMultiplier = 1 + (input.vatRate ?? 0);
  const demand = householdDemand(input, settings);
  const daytimeRatio = demand.daytimeRatio;
  const powerLimits = packagePowerLimits(solarPackage);
  const battery = {
    nominalKwh: solarPackage.batteryCapacityKwh,
    maxPowerKw: powerLimits.batteryPowerKw,
    roundTripEfficiency: settings.batteryRoundTripEfficiency,
    dailyCycleFactor: settings.batteryDailyCycleFactor,
    backupReserveKwh: input.backupRequired
      ? requiredBackupReserveKwh(input.essentialLoadWatts, input.backupHours)
      : 0,
  };
  const tariff =
    input.electricityTariffVersion && input.tariffBillingContext
      ? selectElectricityTariffByVersion(
          ELECTRICITY_TARIFF_REGISTRY,
          input.electricityTariffVersion,
          { allowUnapproved: params.allowUnapprovedTariffData },
        )
      : null;
  const energyCharge = (consumptionKwh: number) =>
    tariff && input.tariffBillingContext
      ? calculateElectricityEnergyCharge({
          tariff,
          consumptionKwh,
          context: input.tariffBillingContext,
        }).energyChargeBeforeVatVnd
      : calculateElectricityBill(input.electricityType, consumptionKwh);
  // Anchor every bill on the customer's own bill and move it only by tariff
  // DIFFERENCES from one price function. Mixing the customer's bill with an
  // absolute price from a different table (e.g. the legacy table when the
  // bill make-up is unknown) makes savings jump by the gap between tables.
  // - before solar: current bill + the cost of planned appliances' kWh;
  // - after solar: before - (charge at full demand - charge at grid import).
  const chargeAtFullDemand = energyCharge(demand.monthlyConsumptionKwh);
  const baselineEnergyChargeVnd =
    demand.plannedKwh > 0
      ? input.monthlyBill +
        Math.max(0, chargeAtFullDemand - energyCharge(demand.monthlyConsumptionKwh - demand.plannedKwh))
      : input.monthlyBill;

  const cache = new Map<number, SimulatedMonth[]>();
  return (generationFactor) => {
    const key = Math.round(generationFactor * 1e6) / 1e6;
    const cached = cache.get(key);
    if (cached) return cached;

    const months = generationByMonth.map((generation) => {
      const flows = simulateMonth({
        dailyGenerationKwh: (generation * key) / days,
        dailyConsumptionKwh: demand.monthlyConsumptionKwh / days,
        daytimeRatio,
        battery,
        inverterAcKw: powerLimits.inverterAcKw,
        systemStandbyLoadKw:
          solarPackage.systemType === "hybrid"
            ? CALCULATION_CONSTANTS.battery.hybridStandbyLoadWatts / 1_000
            : 0,
      });
      // Tariff charges are before VAT; package prices include VAT. Apply VAT
      // to both sides of the bill so savings compare like-for-like.
      const energyChargeAfterSolarVnd = clamp(
        baselineEnergyChargeVnd - (chargeAtFullDemand - energyCharge(flows.gridImportKwh)),
        0,
        baselineEnergyChargeVnd,
      );
      return {
        ...flows,
        baselineEnergyChargeVnd,
        energyChargeAfterSolarVnd,
        billAfterSolarVnd: energyChargeAfterSolarVnd * vatMultiplier,
        savingsVnd: Math.max(
          0,
          (baselineEnergyChargeVnd - energyChargeAfterSolarVnd) * vatMultiplier,
        ),
      };
    });
    cache.set(key, months);
    return months;
  };
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function summariseScenario(
  months: readonly SimulatedMonth[],
  finance: LifetimeFinanceResult,
): CalculationScenarioResult {
  const average = (pick: (month: SimulatedMonth) => number) =>
    sum(months.map(pick)) / months.length;
  const generation = average((month) => month.generationKwh);
  const direct = average((month) => month.directSolarUseKwh);
  const battery = average((month) => month.batteryDischargeKwh);
  const grid = average((month) => month.gridImportKwh);
  const surplus = average((month) => month.surplusKwh);
  const energyChargeAfter = average((month) => month.energyChargeAfterSolarVnd);
  const yearlySavingsVnd = sum(months.map((month) => month.savingsVnd));
  const consumption = average((month) => month.consumptionKwh);
  const baselineCharge = average((month) => month.baselineEnergyChargeVnd);
  const totalSolarUse = Math.min(consumption, direct + battery);

  return {
    adjustedGenerationKwh: generation,
    solarSurplusKwh: surplus,
    directSolarUseKwh: direct,
    batteryUseKwh: battery,
    totalSolarUseKwh: totalSolarUse,
    gridConsumptionAfterSolarKwh: grid,
    monthlySavingsVnd: yearlySavingsVnd / 12,
    billAfterSolarVnd: average((month) => month.billAfterSolarVnd),
    reductionPercent: clamp(
      baselineCharge > 0
        ? ((baselineCharge - energyChargeAfter) / baselineCharge) * 100
        : 0,
      0,
      100,
    ),
    yearlySavingsVnd,
    paybackMonths:
      finance.paybackYears === null ? null : finance.paybackYears * 12,
    paybackYears: finance.paybackYears,
    selfConsumptionRate: clamp(
      generation > 0 ? totalSolarUse / generation : 0,
      0,
      1,
    ),
  };
}

function calculateLongTermSavings(finance: LifetimeFinanceResult): LongTermSavings {
  const [year5, year10, year20] = CALCULATION_CONSTANTS.longTermSavingYears;

  return {
    saving5YearsVnd: finance.cumulativeNetSavingsVnd(year5),
    saving10YearsVnd: finance.cumulativeNetSavingsVnd(year10),
    saving20YearsVnd: finance.cumulativeNetSavingsVnd(year20),
  };
}

export function calculateSolarPackage({
  input,
  solarPackage,
  settings,
  provinceFactor,
  provinceMonthlyYieldKwhPerKwp,
  allowUnapprovedTariffData = false,
}: CalculateSolarPackageParams): UnscoredPackageCalculationResult {
  assertCalculationInputs({ input, solarPackage, settings, provinceFactor });

  // The service has already normalized the public request. In particular,
  // direct kWh input must never pass through a bill-to-kWh inverse here.
  const demand = householdDemand(input, settings);
  const estimatedMonthlyConsumptionKwh = demand.monthlyConsumptionKwh;
  const daytimeDemandKwh = estimatedMonthlyConsumptionKwh * demand.daytimeRatio;
  const simulateYear = createYearSimulator({
    input,
    solarPackage,
    settings,
    generationByMonth: monthlyGenerationKwh(
      solarPackage,
      provinceFactor,
      provinceMonthlyYieldKwhPerKwp,
    ),
    allowUnapprovedTariffData,
  });

  const runScenario = (scenarioFactor: number) => {
    const months = simulateYear(scenarioFactor);
    const finance = calculateLifetimeFinance({
      priceVnd: solarPackage.priceVnd,
      horizonYears: settings.systemLifetimeYears,
      annualSavingsAtGenerationFactor: (factor) =>
        sum(simulateYear(scenarioFactor * factor).map((month) => month.savingsVnd)),
      maintenanceRatePerYear: settings.maintenanceRatePerYear,
      systemType: solarPackage.systemType,
      capacityKwp: solarPackage.capacityKwp,
      batteryCapacityKwh: solarPackage.batteryCapacityKwh,
    });
    return { months, finance, summary: summariseScenario(months, finance) };
  };

  const highGrowthFinance = calculateLifetimeFinance({
    priceVnd: solarPackage.priceVnd,
    horizonYears: settings.systemLifetimeYears,
    annualSavingsAtGenerationFactor: (factor) =>
      sum(simulateYear(factor).map((month) => month.savingsVnd)),
    maintenanceRatePerYear: settings.maintenanceRatePerYear,
    tariffEscalationRate: CALCULATION_CONSTANTS.finance.highTariffEscalationRate,
    systemType: solarPackage.systemType,
    capacityKwp: solarPackage.capacityKwp,
    batteryCapacityKwh: solarPackage.batteryCapacityKwh,
  });
  const standard = runScenario(1);
  const low = runScenario(settings.lowEstimateFactor);
  const high = runScenario(settings.highEstimateFactor);
  const monthlyBreakdown: MonthlyBreakdownEntry[] = standard.months.map(
    (month, index) => ({
      month: index + 1,
      generationKwh: month.generationKwh,
      clippedKwh: month.clippedKwh,
      directSolarUseKwh: month.directSolarUseKwh,
      batteryDischargeKwh: month.batteryDischargeKwh,
      gridImportKwh: month.gridImportKwh,
      surplusKwh: month.surplusKwh,
      billAfterSolarVnd: month.billAfterSolarVnd,
      savingsVnd: month.savingsVnd,
    }),
  );

  const { maxShareOfGeneration, priceVndPerKwh } = REGULATION_CONSTANTS.surplusSale;
  const sellableKwhPerMonth =
    sum(
      standard.months.map((month) =>
        Math.min(month.surplusKwh, month.generationKwh * maxShareOfGeneration),
      ),
    ) / 12;

  const vatMultiplier = 1 + (input.vatRate ?? 0);

  return {
    packageId: solarPackage.id,
    baselineBillVnd: (standard.months[0]?.baselineEnergyChargeVnd ?? input.monthlyBill) * vatMultiplier,
    plannedAdditionalKwh: demand.plannedKwh,
    estimatedMonthlyConsumptionKwh,
    daytimeDemandKwh,
    ...standard.summary,
    lowEstimate: low.summary,
    highEstimate: high.summary,
    cashFlow: standard.finance.cashFlow,
    breakEvenYear: standard.finance.breakEvenYear,
    longTermSavings: calculateLongTermSavings(standard.finance),
    monthlyBreakdown,
    financial: {
      horizonYears: standard.finance.cashFlow.length - 1,
      paybackYearsHighTariffGrowth: highGrowthFinance.paybackYears,
      npvVnd: standard.finance.npvVnd,
      irr: standard.finance.irr,
      replacementCostsVnd: standard.finance.replacementCostsVnd,
    },
    surplusSale: {
      sellableKwhPerMonth,
      revenueVndPerMonth: sellableKwhPerMonth * priceVndPerKwh,
      priceVndPerKwh,
      maxShareOfGeneration,
    },
  };
}
