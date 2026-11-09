import { RECOMMENDATION_CONSTANTS } from "@/config/defaults";
import {
  requiredBackupReserveKwh,
  usableBatteryKwh,
} from "@/lib/energy-simulation";
import { packagePowerLimits } from "@/lib/package-power";
import { calculateSolarPackage } from "@/lib/solar-calculator";
import type {
  CalculationSettings,
  NoRecommendationReason,
  PackageCalculationResult,
  PackageScoreBreakdown,
  SolarCalculationInput,
  SolarPackage,
  SolarRecommendationResult,
  UnscoredPackageCalculationResult,
} from "@/types/solar";

export interface RecommendSolarPackagesParams {
  input: SolarCalculationInput;
  packages: readonly SolarPackage[];
  settings: CalculationSettings;
  provinceFactor: number;
  provinceMonthlyYieldKwhPerKwp?: readonly number[] | null;
  allowUnapprovedTariffData?: boolean;
}

export function isPackageEligible(
  solarPackage: SolarPackage,
  input: SolarCalculationInput,
): boolean {
  if (!solarPackage.active) {
    return false;
  }

  if (
    input.electricalPhase !== null &&
    solarPackage.electricalPhase !== input.electricalPhase
  ) {
    return false;
  }

  // Unknown roof area is not silently converted to a guessed number. It keeps
  // packages in comparison, while the snapshot/UI marks survey as required.
  if (
    input.roofAreaM2 !== null &&
    solarPackage.requiredRoofAreaM2 > input.roofAreaM2
  ) {
    return false;
  }

  if (input.backupRequired) {
    // A package that cannot hold the declared outage energy must not be
    // offered as a backup solution. Unknown load keeps hybrids eligible; the
    // result is then flagged for survey by input normalisation.
    return (
      solarPackage.systemType === "hybrid" &&
      solarPackage.batteryCapacityKwh > 0 &&
      requiredBackupReserveKwh(input.essentialLoadWatts, input.backupHours) <=
        usableBatteryKwh(solarPackage.batteryCapacityKwh) &&
      canCarryBackupLoad(solarPackage, input.essentialLoadWatts)
    );
  }

  return true;
}

/**
 * The inverter must also deliver the declared load as power: a 7 kW load on a
 * 6 kW backup output trips the inverter, however large the battery is.
 * Unknown load keeps the package eligible (flagged for survey elsewhere).
 */
function canCarryBackupLoad(
  solarPackage: SolarPackage,
  essentialLoadWatts: number | null,
): boolean {
  if (essentialLoadWatts === null || !Number.isFinite(essentialLoadWatts) || essentialLoadWatts <= 0) {
    return true;
  }
  return essentialLoadWatts / 1_000 <= packagePowerLimits(solarPackage).backupKw + 1e-9;
}

export function filterEligiblePackages(
  packages: readonly SolarPackage[],
  input: SolarCalculationInput,
): SolarPackage[] {
  return packages.filter((solarPackage) =>
    isPackageEligible(solarPackage, input),
  );
}

/**
 * Customer-centred score:
 * - economic: payback within the household comfort zone (full marks at
 *   <= 4 years, zero at >= 12 years or negative lifetime NPV);
 * - bill reduction: how much of the yearly electricity bill disappears;
 * - self-use: share of PV the home actually uses — penalises oversizing, as
 *   surplus energy is not paid for.
 */
export function calculatePackageScoreBreakdown(
  result: UnscoredPackageCalculationResult,
): PackageScoreBreakdown {
  const { paybackFullScoreYears, paybackZeroScoreYears } = RECOMMENDATION_CONSTANTS;
  const npvNegative = result.financial !== undefined && result.financial.npvVnd < 0;
  const economicScore =
    result.paybackYears === null || npvNegative
      ? 0
      : Math.min(
          100,
          Math.max(
            0,
            ((paybackZeroScoreYears - result.paybackYears) /
              (paybackZeroScoreYears - paybackFullScoreYears)) *
              100,
          ),
        );

  return {
    economicScore,
    billReductionScore: Math.min(100, Math.max(0, result.reductionPercent)),
    selfUseScore: Math.min(100, Math.max(0, result.selfConsumptionRate * 100)),
  };
}

export function scorePackageCalculation(
  result: UnscoredPackageCalculationResult,
): PackageCalculationResult {
  const scoreBreakdown = calculatePackageScoreBreakdown(result);
  const score =
    scoreBreakdown.economicScore * RECOMMENDATION_CONSTANTS.economicWeight +
    scoreBreakdown.billReductionScore *
      RECOMMENDATION_CONSTANTS.billReductionWeight +
    scoreBreakdown.selfUseScore * RECOMMENDATION_CONSTANTS.selfUseWeight;

  return {
    ...result,
    score,
    scoreBreakdown,
  };
}

function compareScoredPackages(
  first: PackageCalculationResult,
  second: PackageCalculationResult,
  packageById: ReadonlyMap<string, SolarPackage>,
  input: SolarCalculationInput,
): number {
  const scoreDifference = second.score - first.score;

  if (
    Math.abs(scoreDifference) > RECOMMENDATION_CONSTANTS.scoreTieTolerance
  ) {
    return scoreDifference;
  }

  const firstPackage = packageById.get(first.packageId);
  const secondPackage = packageById.get(second.packageId);

  if (!firstPackage || !secondPackage) {
    return first.packageId.localeCompare(second.packageId);
  }

  if (
    !input.backupRequired &&
    firstPackage.systemType !== secondPackage.systemType
  ) {
    return firstPackage.systemType === "grid-tied" ? -1 : 1;
  }

  if (firstPackage.displayOrder !== secondPackage.displayOrder) {
    return firstPackage.displayOrder - secondPackage.displayOrder;
  }

  return firstPackage.code.localeCompare(secondPackage.code);
}

/**
 * A package is worth recommending only if it pays back within the household
 * comfort horizon and creates value over its lifetime. Selling a system that
 * never pays back destroys the customer's trust.
 */
export function isEconomicallyViable(result: UnscoredPackageCalculationResult): boolean {
  return (
    result.paybackYears !== null &&
    result.paybackYears <= RECOMMENDATION_CONSTANTS.maxViablePaybackYears &&
    (result.financial === undefined || result.financial.npvVnd >= 0)
  );
}

/**
 * Capital-efficiency rule: if a cheaper package delivers practically the same
 * lifetime value and pays back no later, recommend it first. Mirrors how an
 * honest adviser would steer a customer away from an unnecessary upsell.
 */
function promoteCapitalEfficientPackage(
  ranked: PackageCalculationResult[],
  packageById: ReadonlyMap<string, SolarPackage>,
): PackageCalculationResult[] {
  const tolerance = RECOMMENDATION_CONSTANTS.capitalEfficiencyNpvTolerance;
  let best = ranked[0];
  if (!best) return ranked;

  for (;;) {
    const bestPackage = packageById.get(best.packageId);
    const bestNpv = best.financial?.npvVnd;
    const bestPayback = best.paybackYears;
    if (!bestPackage || bestNpv === undefined || bestPayback === null) break;

    const cheaperEquivalent = ranked.find((candidate) => {
      const candidatePackage = packageById.get(candidate.packageId);
      const candidateNpv = candidate.financial?.npvVnd;
      return (
        candidatePackage !== undefined &&
        candidateNpv !== undefined &&
        candidate.paybackYears !== null &&
        candidatePackage.priceVnd < bestPackage.priceVnd &&
        candidateNpv >= bestNpv * (1 - tolerance) &&
        candidate.paybackYears <= bestPayback
      );
    });
    if (!cheaperEquivalent) break;
    best = cheaperEquivalent;
  }

  return [best, ...ranked.filter((candidate) => candidate !== best)];
}

/**
 * Without a backup need, a battery is an upsell: lead with the best viable
 * grid-tied package and keep hybrids in the list as the upgrade option.
 */
function preferGridTiedPackage(
  ranked: PackageCalculationResult[],
  packageById: ReadonlyMap<string, SolarPackage>,
): PackageCalculationResult[] {
  const gridTied = ranked.find(
    (candidate) => packageById.get(candidate.packageId)?.systemType === "grid-tied",
  );
  if (!gridTied || gridTied === ranked[0]) return ranked;
  return [gridTied, ...ranked.filter((candidate) => candidate !== gridTied)];
}

/** First filter that removes every remaining package, in customer terms. */
function diagnoseNoEligiblePackage(
  packages: readonly SolarPackage[],
  input: SolarCalculationInput,
): NoRecommendationReason {
  let remaining = packages.filter((solarPackage) => solarPackage.active);
  if (remaining.length === 0) return "no_active_package";

  if (input.electricalPhase !== null) {
    remaining = remaining.filter(
      (solarPackage) => solarPackage.electricalPhase === input.electricalPhase,
    );
    if (remaining.length === 0) return "phase_mismatch";
  }

  if (input.backupRequired) {
    remaining = remaining.filter(
      (solarPackage) =>
        solarPackage.systemType === "hybrid" && solarPackage.batteryCapacityKwh > 0,
    );
    if (remaining.length === 0) return "backup_needs_battery";
    const reserve = requiredBackupReserveKwh(input.essentialLoadWatts, input.backupHours);
    remaining = remaining.filter(
      (solarPackage) => reserve <= usableBatteryKwh(solarPackage.batteryCapacityKwh),
    );
    if (remaining.length === 0) return "backup_exceeds_battery";
    remaining = remaining.filter((solarPackage) =>
      canCarryBackupLoad(solarPackage, input.essentialLoadWatts),
    );
    if (remaining.length === 0) return "backup_exceeds_power";
  }

  return "roof_too_small";
}

export function recommendSolarPackages({
  input,
  packages,
  settings,
  provinceFactor,
  provinceMonthlyYieldKwhPerKwp,
  allowUnapprovedTariffData = false,
}: RecommendSolarPackagesParams): SolarRecommendationResult {
  const eligiblePackages = filterEligiblePackages(packages, input);
  const packageById = new Map(
    eligiblePackages.map((solarPackage) => [solarPackage.id, solarPackage]),
  );
  const scoredPackages = eligiblePackages
    .map((solarPackage) =>
      scorePackageCalculation(
        calculateSolarPackage({
          input,
          solarPackage,
          settings,
          provinceFactor,
          provinceMonthlyYieldKwhPerKwp,
          allowUnapprovedTariffData,
        }),
      ),
    )
    .sort((first, second) =>
      compareScoredPackages(first, second, packageById, input),
    );
  // Only economically sound packages are offered; if none qualify the
  // customer is told so honestly rather than sold an unprofitable system.
  // Exception: a customer who asked for outage backup is buying resilience,
  // not only savings. Every eligible package already meets that need, so they
  // are still offered, labelled honestly as a backup cost.
  const viablePackages = scoredPackages.filter(isEconomicallyViable);
  const offeredPackages =
    input.backupRequired && viablePackages.length === 0
      ? scoredPackages.map(
          (result): PackageCalculationResult => ({ ...result, economicNote: "backup_cost" }),
        )
      : viablePackages;
  const ranked = promoteCapitalEfficientPackage(offeredPackages, packageById);
  const comparedPackages = (
    input.backupRequired ? ranked : preferGridTiedPackage(ranked, packageById)
  ).slice(0, RECOMMENDATION_CONSTANTS.maximumComparedPackages);
  const noRecommendationReason: NoRecommendationReason | undefined =
    eligiblePackages.length === 0
      ? diagnoseNoEligiblePackage(packages, input)
      : comparedPackages.length === 0
        ? "not_economical"
        : undefined;

  return {
    recommendedPackage: comparedPackages[0] ?? null,
    comparedPackages,
    ...(noRecommendationReason ? { noRecommendationReason } : {}),
    inputSummary: { ...input },
    assumptions: { ...settings },
  };
}
