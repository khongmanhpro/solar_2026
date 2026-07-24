import type {
  ConfidenceLevel,
  CustomerCalculationRequest,
  NormalizedEnergyInput,
  ProvenancedValue,
} from "@/types/customer-input";
import type { ElectricityTariffRegistry } from "@/types/electricity-tariff";

export const DATA_STATUSES = [
  "demo",
  "draft",
  "verified",
  "expired",
  "disabled",
] as const;
export type DataStatus = (typeof DATA_STATUSES)[number];

export const REQUIRED_DATASET_KEYS = [
  "electricityTariff",
  "packageCatalog",
  "solarYield",
  "calculationAssumptions",
] as const;
export type RequiredDatasetKey = (typeof REQUIRED_DATASET_KEYS)[number];

export interface DatasetGovernanceRecord {
  key: RequiredDatasetKey;
  version: string;
  status: DataStatus;
  sourceReference: string;
  owner: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  expectedContentHash: string | null;
  notes: string[];
}

export type CalculationDataManifest = Record<
  RequiredDatasetKey,
  DatasetGovernanceRecord
>;

export const DATA_READINESS_ISSUE_CODES = [
  "STATUS_NOT_VERIFIED",
  "MISSING_GOVERNANCE",
  "INVALID_EFFECTIVE_DATE",
  "NOT_YET_EFFECTIVE",
  "EXPIRED",
  "VERSION_MISMATCH",
  "CONTENT_HASH_MISSING",
  "CONTENT_HASH_MISMATCH",
  "NO_ELIGIBLE_PACKAGE",
] as const;
export type DataReadinessIssueCode =
  (typeof DATA_READINESS_ISSUE_CODES)[number];

export interface DataReadinessIssue {
  dataset: RequiredDatasetKey;
  status: DataStatus;
  code: DataReadinessIssueCode;
  message: string;
}

export interface DataReadinessReport {
  readyForProduction: boolean;
  overallStatus: DataStatus;
  checkedAt: string;
  issues: DataReadinessIssue[];
}

export interface CalculationVersionMetadata {
  snapshotSchemaVersion: string;
  algorithmVersion: string;
  algorithmFingerprint: string;
  dataVersion: string;
  createdAt: string;
  dataVersions: Record<RequiredDatasetKey, string>;
  dataReadiness: DataReadinessReport;
  confidence: {
    overall: ConfidenceLevel;
    reasons: string[];
  };
  warnings: string[];
}

export interface CalculationSourceSnapshot<TPackage, TSettings, TProvince> {
  customerInput: CustomerCalculationRequest | null;
  normalizedInput: NormalizedEnergyInput;
  siteInput: {
    province: ProvenancedValue<string>;
    daytimeUsageLevel: ProvenancedValue<"low" | "medium" | "high">;
    roofAreaM2: ProvenancedValue<number | null>;
    backupRequired: ProvenancedValue<boolean>;
    essentialLoadWatts: ProvenancedValue<number | null>;
    backupHours: ProvenancedValue<number | null>;
  };
  tariff: {
    governance: DatasetGovernanceRecord;
    registryVersion: string;
    registry: ElectricityTariffRegistry;
    /** Tariff used for the forward-looking post-solar bill calculation. */
    projectionTariffVersion?: string;
    selectedTariffVersions: string[];
    selectedVatRuleVersions: string[];
    electricityType: "residential";
    tiers: Array<{
      code: string;
      label: string;
      fromKwh: number;
      toKwh: number | null;
      unitPriceVndPerKwh: number;
    }>;
    vatRate: number | null;
    roundingRule: "none" | "versioned";
  };
  packages: TPackage[];
  settings: TSettings;
  provinceFactor: TProvince;
  provinceFactors: TProvince[];
  algorithmConstants: {
    calculation: Record<string, unknown>;
    recommendation: Record<string, unknown>;
  };
  dataManifest: CalculationDataManifest;
}
