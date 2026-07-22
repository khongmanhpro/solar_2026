import { RECOMMENDATION_CONSTANTS } from "@/config/defaults";
import { calculateSolarPackage } from "@/lib/solar-calculator";
import type {
  CalculationSettings,
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
}

export function isPackageEligible(
  solarPackage: SolarPackage,
  input: SolarCalculationInput,
): boolean {
  if (!solarPackage.active) {
    return false;
  }

  if (solarPackage.requiredRoofAreaM2 > input.roofAreaM2) {
    return false;
  }

  if (input.backupRequired) {
    return (
      solarPackage.systemType === "hybrid" &&
      solarPackage.batteryCapacityKwh > 0
    );
  }

  return true;
}

export function filterEligiblePackages(
  packages: readonly SolarPackage[],
  input: SolarCalculationInput,
): SolarPackage[] {
  return packages.filter((solarPackage) =>
    isPackageEligible(solarPackage, input),
  );
}

export function calculatePackageScoreBreakdown(
  input: SolarCalculationInput,
  result: UnscoredPackageCalculationResult,
): PackageScoreBreakdown {
  const targetGenerationKwh = input.backupRequired
    ? result.estimatedMonthlyConsumptionKwh *
      RECOMMENDATION_CONSTANTS.backupTargetRatio
    : result.daytimeDemandKwh *
      RECOMMENDATION_CONSTANTS.nonBackupTargetRatio;

  const generationFitScore =
    targetGenerationKwh > 0
      ? Math.max(
          0,
          100 -
            (Math.abs(
              result.adjustedGenerationKwh - targetGenerationKwh,
            ) /
              targetGenerationKwh) *
              100,
        )
      : 0;
  const selfUseScore = result.selfConsumptionRate * 100;
  const paybackScore =
    result.paybackYears !== null
      ? Math.max(
          0,
          100 -
            result.paybackYears *
              RECOMMENDATION_CONSTANTS.paybackPenaltyPerYear,
        )
      : 0;

  return {
    targetGenerationKwh,
    generationFitScore,
    selfUseScore,
    paybackScore,
  };
}

export function scorePackageCalculation(
  input: SolarCalculationInput,
  result: UnscoredPackageCalculationResult,
): PackageCalculationResult {
  const scoreBreakdown = calculatePackageScoreBreakdown(input, result);
  const score =
    scoreBreakdown.generationFitScore *
      RECOMMENDATION_CONSTANTS.generationFitWeight +
    scoreBreakdown.selfUseScore * RECOMMENDATION_CONSTANTS.selfUseWeight +
    scoreBreakdown.paybackScore * RECOMMENDATION_CONSTANTS.paybackWeight;

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

  return firstPackage.id.localeCompare(secondPackage.id);
}

export function recommendSolarPackages({
  input,
  packages,
  settings,
  provinceFactor,
}: RecommendSolarPackagesParams): SolarRecommendationResult {
  const eligiblePackages = filterEligiblePackages(packages, input);
  const packageById = new Map(
    eligiblePackages.map((solarPackage) => [solarPackage.id, solarPackage]),
  );
  const scoredPackages = eligiblePackages
    .map((solarPackage) =>
      scorePackageCalculation(
        input,
        calculateSolarPackage({
          input,
          solarPackage,
          settings,
          provinceFactor,
        }),
      ),
    )
    .sort((first, second) =>
      compareScoredPackages(first, second, packageById, input),
    );
  const comparedPackages = scoredPackages.slice(
    0,
    RECOMMENDATION_CONSTANTS.maximumComparedPackages,
  );

  return {
    recommendedPackage: comparedPackages[0] ?? null,
    comparedPackages,
    inputSummary: { ...input },
    assumptions: { ...settings },
  };
}
