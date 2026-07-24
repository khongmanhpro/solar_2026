import {
  CALCULATION_ALGORITHM_VERSION,
  CALCULATION_SNAPSHOT_SCHEMA_VERSION,
  CURRENT_DATA_MANIFEST,
} from "@/config/data-governance";
import {
  CALCULATION_CONSTANTS,
  RECOMMENDATION_CONSTANTS,
} from "@/config/defaults";
import {
  ELECTRICITY_TARIFF_REGISTRY,
  QD1279_RESIDENTIAL_TARIFF,
} from "@/config/electricity-tariffs";
import { calculateNormalizedInputConfidence } from "@/lib/customer-input";
import { assessCalculationDataReadiness } from "@/lib/data-readiness";
import {
  createContentFingerprint,
  versionWithFingerprint,
} from "@/lib/stable-fingerprint";
import type {
  CalculationSourceSnapshot,
  CalculationVersionMetadata,
  RequiredDatasetKey,
} from "@/types/data-governance";
import type {
  CalculationSettings,
  DataGovernanceMetadata,
  ProvinceFactor,
  SolarCalculationInput,
  SolarPackage,
} from "@/types/solar";
import type {
  ConfidenceLevel,
  CustomerCalculationRequest,
  NormalizedEnergyInput,
} from "@/types/customer-input";

export interface CreateCalculationSnapshotParams {
  input: SolarCalculationInput;
  normalizedInput: NormalizedEnergyInput;
  customerInput: CustomerCalculationRequest | null;
  packages: SolarPackage[];
  settings: CalculationSettings;
  province: ProvinceFactor;
  provinceFactors?: ProvinceFactor[];
}

export type SolarSourceSnapshot = CalculationSourceSnapshot<
  SolarPackage,
  CalculationSettings,
  ProvinceFactor
>;

export type CalculationDatasetFingerprints = Record<
  RequiredDatasetKey,
  string
>;

function withoutGovernance<T extends DataGovernanceMetadata>(
  value: T,
): Omit<T, keyof DataGovernanceMetadata> {
  const governanceKeys = new Set<keyof DataGovernanceMetadata>([
    "dataStatus",
    "dataVersion",
    "sourceReference",
    "dataOwner",
    "effectiveFrom",
    "effectiveTo",
    "approvedBy",
    "approvedAt",
  ]);

  return Object.fromEntries(
    Object.entries(value).filter(
      ([key]) => !governanceKeys.has(key as keyof DataGovernanceMetadata),
    ),
  ) as Omit<T, keyof DataGovernanceMetadata>;
}

function tariffContent(snapshot: SolarSourceSnapshot) {
  return {
    registryVersion: snapshot.tariff.registryVersion,
    projectionTariffVersion: snapshot.tariff.projectionTariffVersion,
    selectedTariffVersions: snapshot.tariff.selectedTariffVersions,
    selectedVatRuleVersions: snapshot.tariff.selectedVatRuleVersions,
    selectedTariffs: snapshot.tariff.registry.tariffs.filter((tariff) =>
      snapshot.tariff.selectedTariffVersions.includes(tariff.version),
    ),
    selectedVatRules: snapshot.tariff.registry.vatRules.filter((vatRule) =>
      snapshot.tariff.selectedVatRuleVersions.includes(vatRule.version),
    ),
    electricityType: snapshot.tariff.electricityType,
    tiers: snapshot.tariff.tiers,
    vatRate: snapshot.tariff.vatRate,
    roundingRule: snapshot.tariff.roundingRule,
  };
}

function withoutDatabaseIdentity<T extends Record<string, unknown>>(
  value: T,
): Omit<T, "id"> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== "id"),
  ) as Omit<T, "id">;
}

const confidenceRank: Record<ConfidenceLevel, number> = {
  insufficient: 0,
  low: 1,
  medium: 2,
  high: 3,
};

function getCalculationInputConfidence(sourceSnapshot: SolarSourceSnapshot) {
  const energyConfidence = calculateNormalizedInputConfidence(
    sourceSnapshot.normalizedInput,
  );
  const siteFields = Object.values(sourceSnapshot.siteInput);
  const overall = siteFields.reduce<ConfidenceLevel>(
    (lowest, field) =>
      confidenceRank[field.confidence] < confidenceRank[lowest]
        ? field.confidence
        : lowest,
    energyConfidence.overall,
  );

  return {
    overall,
    reasons: [
      ...new Set([
        ...energyConfidence.reasons,
        ...siteFields.flatMap((field) => field.reasons),
      ]),
    ],
  };
}

export function getCalculationDatasetFingerprints(
  sourceSnapshot: SolarSourceSnapshot,
): CalculationDatasetFingerprints {
  const packageContent = sourceSnapshot.packages
    .map((solarPackage) =>
      withoutDatabaseIdentity(withoutGovernance(solarPackage)),
    )
    .sort((first, second) =>
      String(first.code).localeCompare(String(second.code)),
    );
  const provinceContent = sourceSnapshot.provinceFactors
    .map((province) => withoutDatabaseIdentity(withoutGovernance(province)))
    .sort((first, second) =>
      String(first.code).localeCompare(String(second.code)),
    );

  return {
    electricityTariff: createContentFingerprint(tariffContent(sourceSnapshot)),
    packageCatalog: createContentFingerprint(packageContent),
    solarYield: createContentFingerprint(provinceContent),
    calculationAssumptions: createContentFingerprint(
      withoutGovernance(sourceSnapshot.settings),
    ),
  };
}

function getDataVersions(
  fingerprints: CalculationDatasetFingerprints,
  sourceSnapshot: SolarSourceSnapshot,
): Record<RequiredDatasetKey, string> {
  return {
    electricityTariff: `${sourceSnapshot.dataManifest.electricityTariff.version}+sha256.${fingerprints.electricityTariff}`,
    packageCatalog: `${sourceSnapshot.dataManifest.packageCatalog.version}+sha256.${fingerprints.packageCatalog}`,
    solarYield: `${sourceSnapshot.dataManifest.solarYield.version}+sha256.${fingerprints.solarYield}`,
    calculationAssumptions: `${sourceSnapshot.dataManifest.calculationAssumptions.version}+sha256.${fingerprints.calculationAssumptions}`,
  };
}

export function createCalculationVersionMetadata(
  sourceSnapshot: SolarSourceSnapshot,
  createdAt = new Date(),
): CalculationVersionMetadata {
  const fingerprints = getCalculationDatasetFingerprints(sourceSnapshot);
  const dataVersions = getDataVersions(fingerprints, sourceSnapshot);
  const dataReadiness = assessCalculationDataReadiness({
    manifest: sourceSnapshot.dataManifest,
    packages: sourceSnapshot.packages,
    settings: sourceSnapshot.settings,
    provinces: sourceSnapshot.provinceFactors,
    contentFingerprints: fingerprints,
    checkedAt: createdAt,
  });
  const confidence = getCalculationInputConfidence(sourceSnapshot);

  return {
    snapshotSchemaVersion: CALCULATION_SNAPSHOT_SCHEMA_VERSION,
    algorithmVersion: CALCULATION_ALGORITHM_VERSION,
    algorithmFingerprint: createContentFingerprint({
      version: CALCULATION_ALGORITHM_VERSION,
      constants: sourceSnapshot.algorithmConstants,
    }),
    dataVersion: `data-bundle+sha256.${createContentFingerprint(dataVersions)}`,
    createdAt: createdAt.toISOString(),
    dataVersions,
    dataReadiness,
    confidence,
    warnings: [
      ...new Set([
        ...sourceSnapshot.normalizedInput.warnings,
        ...dataReadiness.issues.map((issue) => issue.message),
      ]),
    ],
  };
}

export function createCalculationSourceSnapshot({
  input,
  normalizedInput,
  customerInput,
  packages,
  settings,
  province,
  provinceFactors = [province],
}: CreateCalculationSnapshotParams): SolarSourceSnapshot {
  const projectionTariffVersion =
    input.electricityTariffVersion ??
    normalizedInput.tariffVersion ??
    QD1279_RESIDENTIAL_TARIFF.version;
  const selectedTariffVersions = [
    ...new Set([
      ...(normalizedInput.tariffVersions ?? []),
      projectionTariffVersion,
    ]),
  ];
  const selectedVatRuleVersions = [
    ...new Set(
      normalizedInput.moneyConversions?.map(
        (conversion) => conversion.vatRuleVersion,
      ) ?? [],
    ),
  ];
  const primaryTariff =
    ELECTRICITY_TARIFF_REGISTRY.tariffs.find(
      (candidate) => candidate.version === projectionTariffVersion,
    ) ?? QD1279_RESIDENTIAL_TARIFF;
  const selectedVatRates = selectedVatRuleVersions
    .map(
      (version) =>
        ELECTRICITY_TARIFF_REGISTRY.vatRules.find(
          (candidate) => candidate.version === version,
        )?.rateBps,
    )
    .filter((rate): rate is number => rate !== undefined);
  const tariff = {
    governance: structuredClone(CURRENT_DATA_MANIFEST.electricityTariff),
    registryVersion: ELECTRICITY_TARIFF_REGISTRY.registryVersion,
    registry: structuredClone(ELECTRICITY_TARIFF_REGISTRY),
    projectionTariffVersion,
    selectedTariffVersions,
    selectedVatRuleVersions,
    electricityType: "residential" as const,
    tiers: primaryTariff.tiers.map((tier) => ({
      code: tier.code,
      label: tier.label,
      fromKwh: tier.fromKwh,
      toKwh: tier.toKwh,
      unitPriceVndPerKwh: tier.unitPriceVndPerKwh,
    })),
    vatRate:
      selectedVatRates.length > 0 &&
      selectedVatRates.every((rate) => rate === selectedVatRates[0])
        ? selectedVatRates[0]! / 10_000
        : null,
    roundingRule: "versioned" as const,
  };
  const roofKnown = customerInput?.site.roof.known ?? true;
  const backupInput = customerInput?.site.backup;
  const backupDetailsUnavailable = input.backupRequired && !backupInput;
  const noBackup = !input.backupRequired;

  return {
    customerInput: customerInput ? structuredClone(customerInput) : null,
    normalizedInput: structuredClone(normalizedInput),
    siteInput: {
      province: {
        value: input.province,
        origin: "customer",
        confidence: "high",
        customerConfirmed: true,
        reasons: ["Khách hàng đã chọn tỉnh hoặc thành phố."],
      },
      daytimeUsageLevel: {
        value: input.daytimeUsageLevel,
        origin: customerInput ? "derived" : "customer",
        confidence: "medium",
        customerConfirmed: true,
        ...(customerInput
          ? { derivedFrom: ["site.daytimeBehavior"] }
          : {}),
        reasons: [
          customerInput
            ? "Mức sử dụng ban ngày được ánh xạ từ mô tả hành vi khách hàng đã chọn."
            : "Mức sử dụng ban ngày là tự khai báo theo ba lựa chọn của luồng cũ.",
        ],
      },
      roofAreaM2: {
        value: input.roofAreaM2,
        origin: "customer",
        confidence: "low",
        customerConfirmed: true,
        reasons: [
          roofKnown
            ? "Diện tích mái do khách tự ước lượng, chưa khảo sát."
            : "Khách hàng xác nhận chưa biết diện tích mái; không suy đoán giá trị thay thế.",
        ],
      },
      backupRequired: {
        value: input.backupRequired,
        origin: "customer",
        confidence: "high",
        customerConfirmed: true,
        reasons: ["Khách hàng đã chọn nhu cầu điện dự phòng."],
      },
      essentialLoadWatts: {
        value: input.essentialLoadWatts,
        origin: noBackup
          ? "derived"
          : backupDetailsUnavailable
            ? "default"
            : "customer",
        confidence:
          input.essentialLoadWatts === null && input.backupRequired
            ? "low"
            : "high",
        customerConfirmed: !backupDetailsUnavailable,
        ...(noBackup
          ? { derivedFrom: ["site.backup.required"] }
          : backupDetailsUnavailable
            ? {
                assumptionRef:
                  "legacy-contract:backup-details-not-collected-v1",
              }
            : {}),
        reasons: [
          noBackup
            ? "Không cần điện dự phòng nên không cần khai báo tải thiết yếu."
            : input.essentialLoadWatts === null
              ? "Chưa biết tải thiết yếu; không thể xác nhận dung lượng pin."
              : "Tải thiết yếu do khách hàng nhập, cần khảo sát xác nhận.",
        ],
      },
      backupHours: {
        value: input.backupHours,
        origin: noBackup
          ? "derived"
          : backupDetailsUnavailable
            ? "default"
            : "customer",
        confidence:
          input.backupHours === null && input.backupRequired ? "low" : "high",
        customerConfirmed: !backupDetailsUnavailable,
        ...(noBackup
          ? { derivedFrom: ["site.backup.required"] }
          : backupDetailsUnavailable
            ? {
                assumptionRef:
                  "legacy-contract:backup-details-not-collected-v1",
              }
            : {}),
        reasons: [
          noBackup
            ? "Không cần điện dự phòng nên không cần khai báo số giờ."
            : input.backupHours === null
              ? "Chưa biết số giờ dự phòng; không thể xác nhận dung lượng pin."
              : "Số giờ dự phòng do khách hàng nhập, cần khảo sát xác nhận.",
        ],
      },
    },
    tariff,
    packages: structuredClone(packages),
    settings: structuredClone(settings),
    provinceFactor: structuredClone(province),
    provinceFactors: structuredClone(provinceFactors),
    algorithmConstants: {
      calculation: { ...CALCULATION_CONSTANTS },
      recommendation: { ...RECOMMENDATION_CONSTANTS },
    },
    dataManifest: structuredClone(CURRENT_DATA_MANIFEST),
  };
}

/** Stable tariff identity used before the calculation snapshot is assembled. */
export function getCurrentResidentialTariffVersion(): string {
  return versionWithFingerprint(
    QD1279_RESIDENTIAL_TARIFF.version,
    {
      electricityType: "residential",
      effectivePeriod: QD1279_RESIDENTIAL_TARIFF.effectivePeriod,
      tiers: QD1279_RESIDENTIAL_TARIFF.tiers.map((tier) => ({ ...tier })),
      roundingPolicy: QD1279_RESIDENTIAL_TARIFF.roundingPolicy,
    },
  );
}
