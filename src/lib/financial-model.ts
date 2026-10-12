import { CALCULATION_CONSTANTS } from "@/config/defaults";
import type { CashFlowPoint, SolarSystemType } from "@/types/solar";

export interface LifetimeFinanceParams {
  priceVnd: number;
  horizonYears: number;
  /** Year-1 bill savings (VND) at a given PV output multiplier (1 = new). */
  annualSavingsAtGenerationFactor: (generationFactor: number) => number;
  maintenanceRatePerYear: number;
  /** Override the yearly electricity price growth (sensitivity runs). */
  tariffEscalationRate?: number;
  systemType: SolarSystemType;
  capacityKwp: number;
  batteryCapacityKwh: number;
}

export interface LifetimeFinanceResult {
  cashFlow: CashFlowPoint[];
  /** Net cash flow per year, index 0 = year 1. */
  yearlyNetCashFlowVnd: number[];
  paybackYears: number | null;
  breakEvenYear: number | null;
  npvVnd: number;
  irr: number | null;
  /** Sum of net yearly cash flows (excluding the upfront price). */
  cumulativeNetSavingsVnd: (years: number) => number;
  replacementCostsVnd: { year: number; item: "inverter" | "battery"; costVnd: number }[];
}

/** PV output multiplier in a given operating year (1-based). */
export function generationFactorForYear(year: number): number {
  const { degradationFirstYear, degradationPerYear } = CALCULATION_CONSTANTS.finance;
  if (year <= 1) return 1;
  return Math.max(0, 1 - degradationFirstYear - degradationPerYear * (year - 2));
}

function replacementSchedule(
  params: Pick<LifetimeFinanceParams, "systemType" | "capacityKwp" | "batteryCapacityKwh" | "horizonYears">,
): LifetimeFinanceResult["replacementCostsVnd"] {
  const finance = CALCULATION_CONSTANTS.finance;
  const schedule: LifetimeFinanceResult["replacementCostsVnd"] = [];
  const inverterKw = params.capacityKwp / finance.assumedDcAcRatio;

  // A replacement in the final year buys no benefit within the horizon.
  if (finance.inverterReplacementYear < params.horizonYears && inverterKw > 0) {
    schedule.push({
      year: finance.inverterReplacementYear,
      item: "inverter",
      costVnd: inverterKw * finance.inverterReplacementVndPerKw[params.systemType],
    });
  }
  if (
    params.batteryCapacityKwh > 0 &&
    finance.batteryReplacementYear < params.horizonYears
  ) {
    schedule.push({
      year: finance.batteryReplacementYear,
      item: "battery",
      costVnd: params.batteryCapacityKwh * finance.batteryReplacementVndPerKwh,
    });
  }
  return schedule;
}

function netPresentValue(rate: number, initial: number, flows: readonly number[]): number {
  return flows.reduce(
    (total, flow, index) => total + flow / (1 + rate) ** (index + 1),
    -initial,
  );
}

function internalRateOfReturn(initial: number, flows: readonly number[]): number | null {
  if (initial <= 0) return null;
  let low = -0.99;
  let high = 1;
  const npvLow = netPresentValue(low, initial, flows);
  const npvHigh = netPresentValue(high, initial, flows);
  if (!Number.isFinite(npvLow) || !Number.isFinite(npvHigh) || npvLow * npvHigh > 0) {
    return null;
  }
  for (let iteration = 0; iteration < 100; iteration++) {
    const mid = (low + high) / 2;
    const npvMid = netPresentValue(mid, initial, flows);
    if (npvLow * npvMid <= 0) {
      high = mid;
    } else {
      low = mid;
    }
  }
  return (low + high) / 2;
}

export function calculateLifetimeFinance(
  params: LifetimeFinanceParams,
): LifetimeFinanceResult {
  const finance = CALCULATION_CONSTANTS.finance;
  const horizon = Math.max(1, Math.round(params.horizonYears));
  const replacements = replacementSchedule({ ...params, horizonYears: horizon });
  const savingsCache = new Map<number, number>();
  const savingsAt = (factor: number) => {
    const key = Math.round(factor * 1e6) / 1e6;
    let value = savingsCache.get(key);
    if (value === undefined) {
      value = Math.max(0, params.annualSavingsAtGenerationFactor(key));
      savingsCache.set(key, value);
    }
    return value;
  };

  const yearlyNetCashFlowVnd: number[] = [];
  for (let year = 1; year <= horizon; year++) {
    const savings =
      savingsAt(generationFactorForYear(year)) *
      (1 + (params.tariffEscalationRate ?? finance.tariffEscalationRate)) ** (year - 1);
    const maintenance =
      params.priceVnd *
      params.maintenanceRatePerYear *
      (1 + finance.maintenanceEscalationRate) ** (year - 1);
    const replacementCost = replacements
      .filter((item) => item.year === year)
      .reduce((total, item) => total + item.costVnd, 0);
    yearlyNetCashFlowVnd.push(savings - maintenance - replacementCost);
  }

  const cashFlow: CashFlowPoint[] = [{ year: 0, cumulativeCashFlowVnd: -params.priceVnd }];
  let paybackYears: number | null = params.priceVnd <= 0 ? 0 : null;
  for (let year = 1; year <= horizon; year++) {
    const previous = cashFlow[year - 1].cumulativeCashFlowVnd;
    const flow = yearlyNetCashFlowVnd[year - 1];
    const current = previous + flow;
    cashFlow.push({ year, cumulativeCashFlowVnd: current });
    if (paybackYears === null && previous < 0 && current >= 0 && flow > 0) {
      paybackYears = year - 1 + -previous / flow;
    }
  }

  return {
    cashFlow,
    yearlyNetCashFlowVnd,
    paybackYears,
    breakEvenYear:
      cashFlow.find((point) => point.cumulativeCashFlowVnd >= 0)?.year ?? null,
    npvVnd: netPresentValue(finance.discountRate, params.priceVnd, yearlyNetCashFlowVnd),
    irr: internalRateOfReturn(params.priceVnd, yearlyNetCashFlowVnd),
    cumulativeNetSavingsVnd: (years: number) =>
      yearlyNetCashFlowVnd
        .slice(0, Math.max(0, Math.min(horizon, years)))
        .reduce((total, flow) => total + flow, 0),
    replacementCostsVnd: replacements,
  };
}
