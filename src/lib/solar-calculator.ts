import { CALCULATION_CONSTANTS } from "@/config/defaults";
import {
  calculateElectricityBill,
  estimateElectricityConsumptionFromBill,
} from "@/lib/electricity-tariff";
import type {
  CalculationScenarioResult,
  CalculationSettings,
  CashFlowPoint,
  DaytimeUsageLevel,
  LongTermSavings,
  SolarCalculationInput,
  SolarPackage,
  UnscoredPackageCalculationResult,
} from "@/types/solar";

export interface CalculateSolarPackageParams {
  input: SolarCalculationInput;
  solarPackage: SolarPackage;
  settings: CalculationSettings;
  provinceFactor: number;
}

interface CalculateScenarioParams {
  adjustedGenerationKwh: number;
  estimatedMonthlyConsumptionKwh: number;
  daytimeDemandKwh: number;
  monthlyBill: number;
  electricityType: SolarCalculationInput["electricityType"];
  solarPackage: SolarPackage;
  settings: CalculationSettings;
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

function assertCalculationInputs({
  input,
  solarPackage,
  settings,
  provinceFactor,
}: CalculateSolarPackageParams): void {
  assertNonNegativeFinite(input.monthlyBill, "monthlyBill");
  assertNonNegativeFinite(input.roofAreaM2, "roofAreaM2");
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

function calculateScenario({
  adjustedGenerationKwh,
  estimatedMonthlyConsumptionKwh,
  daytimeDemandKwh,
  monthlyBill,
  electricityType,
  solarPackage,
  settings,
}: CalculateScenarioParams): CalculationScenarioResult {
  const directSolarUseKwh = Math.min(
    adjustedGenerationKwh,
    daytimeDemandKwh,
  );

  const solarSurplusKwh = Math.max(
    0,
    adjustedGenerationKwh - directSolarUseKwh,
  );

  const monthlyBatteryDischargeCapacityKwh =
    solarPackage.batteryCapacityKwh > 0
      ? solarPackage.batteryCapacityKwh *
        CALCULATION_CONSTANTS.daysPerMonth *
        settings.batteryDailyCycleFactor *
        settings.batteryRoundTripEfficiency
      : 0;

  const remainingDemandKwh = Math.max(
    0,
    estimatedMonthlyConsumptionKwh - directSolarUseKwh,
  );

  const batteryUseKwh =
    solarPackage.batteryCapacityKwh > 0
      ? Math.min(
          solarSurplusKwh,
          monthlyBatteryDischargeCapacityKwh,
          remainingDemandKwh,
        )
      : 0;

  const totalSolarUseKwh = Math.min(
    estimatedMonthlyConsumptionKwh,
    directSolarUseKwh + batteryUseKwh,
  );

  const gridConsumptionAfterSolarKwh = Math.max(
    0,
    estimatedMonthlyConsumptionKwh - totalSolarUseKwh,
  );

  const tieredBillAfterSolarVnd = calculateElectricityBill(
    electricityType,
    gridConsumptionAfterSolarKwh,
  );
  const billAfterSolarVnd = clamp(tieredBillAfterSolarVnd, 0, monthlyBill);
  const monthlySavingsVnd = Math.max(0, monthlyBill - billAfterSolarVnd);
  const reductionPercent = clamp(
    monthlyBill > 0 ? (monthlySavingsVnd / monthlyBill) * 100 : 0,
    0,
    100,
  );
  const yearlySavingsVnd = monthlySavingsVnd * 12;
  const paybackMonths =
    monthlySavingsVnd > 0
      ? solarPackage.priceVnd / monthlySavingsVnd
      : null;
  const paybackYears = paybackMonths === null ? null : paybackMonths / 12;
  const selfConsumptionRate = clamp(
    adjustedGenerationKwh > 0
      ? totalSolarUseKwh / adjustedGenerationKwh
      : 0,
    0,
    1,
  );

  return {
    adjustedGenerationKwh,
    solarSurplusKwh,
    directSolarUseKwh,
    batteryUseKwh,
    totalSolarUseKwh,
    gridConsumptionAfterSolarKwh,
    monthlySavingsVnd,
    billAfterSolarVnd,
    reductionPercent,
    yearlySavingsVnd,
    paybackMonths,
    paybackYears,
    selfConsumptionRate,
  };
}

export function createCashFlow(
  priceVnd: number,
  yearlySavingsVnd: number,
): CashFlowPoint[] {
  return Array.from(
    { length: CALCULATION_CONSTANTS.cashFlowHorizonYears + 1 },
    (_, year) => ({
      year,
      cumulativeCashFlowVnd: -priceVnd + yearlySavingsVnd * year,
    }),
  );
}

export function findBreakEvenYear(cashFlow: CashFlowPoint[]): number | null {
  return (
    cashFlow.find((point) => point.cumulativeCashFlowVnd >= 0)?.year ?? null
  );
}

function calculateLongTermSavings(yearlySavingsVnd: number): LongTermSavings {
  const [year5, year10, year20] =
    CALCULATION_CONSTANTS.longTermSavingYears;

  return {
    saving5YearsVnd: yearlySavingsVnd * year5,
    saving10YearsVnd: yearlySavingsVnd * year10,
    saving20YearsVnd: yearlySavingsVnd * year20,
  };
}

export function calculateSolarPackage({
  input,
  solarPackage,
  settings,
  provinceFactor,
}: CalculateSolarPackageParams): UnscoredPackageCalculationResult {
  assertCalculationInputs({ input, solarPackage, settings, provinceFactor });

  const estimatedMonthlyConsumptionKwh =
    estimateElectricityConsumptionFromBill(
      input.electricityType,
      input.monthlyBill,
    );
  const daytimeUsageRatio = getDaytimeUsageRatio(
    input.daytimeUsageLevel,
    settings,
  );
  const daytimeDemandKwh =
    estimatedMonthlyConsumptionKwh * daytimeUsageRatio;
  const adjustedGenerationKwh =
    solarPackage.baseMonthlyGenerationKwh * provinceFactor;

  const commonScenarioParams = {
    estimatedMonthlyConsumptionKwh,
    daytimeDemandKwh,
    monthlyBill: input.monthlyBill,
    electricityType: input.electricityType,
    solarPackage,
    settings,
  };

  const standardEstimate = calculateScenario({
    ...commonScenarioParams,
    adjustedGenerationKwh,
  });
  const lowEstimate = calculateScenario({
    ...commonScenarioParams,
    adjustedGenerationKwh:
      adjustedGenerationKwh * settings.lowEstimateFactor,
  });
  const highEstimate = calculateScenario({
    ...commonScenarioParams,
    adjustedGenerationKwh:
      adjustedGenerationKwh * settings.highEstimateFactor,
  });
  const cashFlow = createCashFlow(
    solarPackage.priceVnd,
    standardEstimate.yearlySavingsVnd,
  );

  return {
    packageId: solarPackage.id,
    estimatedMonthlyConsumptionKwh,
    daytimeDemandKwh,
    ...standardEstimate,
    lowEstimate,
    highEstimate,
    cashFlow,
    breakEvenYear: findBreakEvenYear(cashFlow),
    longTermSavings: calculateLongTermSavings(
      standardEstimate.yearlySavingsVnd,
    ),
  };
}
