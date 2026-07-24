import { CURRENT_DATA_MANIFEST } from "@/config/data-governance";
import type {
  CalculationDataManifest,
  DataReadinessIssue,
  DataReadinessIssueCode,
  DataReadinessReport,
  DataStatus,
  RequiredDatasetKey,
} from "@/types/data-governance";
import { REQUIRED_DATASET_KEYS } from "@/types/data-governance";
import type {
  CalculationSettings,
  DataGovernanceMetadata,
  ProvinceFactor,
  SolarPackage,
} from "@/types/solar";

type ContentFingerprints = Partial<Record<RequiredDatasetKey, string>>;

export interface CalculationDataReadinessContext {
  manifest?: CalculationDataManifest;
  packages?: readonly SolarPackage[];
  settings?: CalculationSettings | null;
  province?: ProvinceFactor | null;
  provinces?: readonly ProvinceFactor[];
  contentFingerprints?: ContentFingerprints;
  checkedAt?: Date;
}

interface GovernanceValues {
  status: DataStatus;
  version: string;
  sourceReference: string | null;
  owner: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
}

function addIssue(
  issues: DataReadinessIssue[],
  dataset: RequiredDatasetKey,
  status: DataStatus,
  code: DataReadinessIssueCode,
  message: string,
): void {
  issues.push({ dataset, status, code, message });
}

function parseDate(value: string | null): Date | null | undefined {
  if (value === null) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function validateGovernance(
  dataset: RequiredDatasetKey,
  label: string,
  governance: GovernanceValues,
  checkedAt: Date,
  issues: DataReadinessIssue[],
  expectedVersion?: string,
): void {
  if (governance.status !== "verified") {
    addIssue(
      issues,
      dataset,
      governance.status,
      "STATUS_NOT_VERIFIED",
      `${label} đang ở trạng thái ${governance.status.toUpperCase()}.`,
    );
    return;
  }

  if (
    !governance.version.trim() ||
    !governance.sourceReference?.trim() ||
    !governance.owner?.trim() ||
    !governance.effectiveFrom ||
    !governance.approvedBy?.trim() ||
    !governance.approvedAt
  ) {
    addIssue(
      issues,
      dataset,
      "draft",
      "MISSING_GOVERNANCE",
      `${label} đã gắn VERIFIED nhưng thiếu phiên bản, nguồn, chủ sở hữu, ngày hiệu lực hoặc phê duyệt.`,
    );
  }

  if (expectedVersion && governance.version !== expectedVersion) {
    addIssue(
      issues,
      dataset,
      "draft",
      "VERSION_MISMATCH",
      `${label} có version ${governance.version}, không khớp manifest ${expectedVersion}.`,
    );
  }

  const effectiveFrom = parseDate(governance.effectiveFrom);
  const effectiveTo = parseDate(governance.effectiveTo);
  const approvedAt = parseDate(governance.approvedAt);

  if (
    effectiveFrom === undefined ||
    effectiveTo === undefined ||
    approvedAt === undefined ||
    (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom)
  ) {
    addIssue(
      issues,
      dataset,
      "draft",
      "INVALID_EFFECTIVE_DATE",
      `${label} có ngày hiệu lực hoặc ngày phê duyệt không hợp lệ.`,
    );
    return;
  }

  if (effectiveFrom && effectiveFrom > checkedAt) {
    addIssue(
      issues,
      dataset,
      "draft",
      "NOT_YET_EFFECTIVE",
      `${label} chưa đến ngày hiệu lực.`,
    );
  }

  if (effectiveTo && effectiveTo < checkedAt) {
    addIssue(
      issues,
      dataset,
      "expired",
      "EXPIRED",
      `${label} đã hết hiệu lực.`,
    );
  }

  if (approvedAt && approvedAt > checkedAt) {
    addIssue(
      issues,
      dataset,
      "draft",
      "INVALID_EFFECTIVE_DATE",
      `${label} có thời điểm phê duyệt nằm trong tương lai.`,
    );
  }
}

function rowGovernance(row: DataGovernanceMetadata): GovernanceValues {
  return {
    status: row.dataStatus,
    version: row.dataVersion,
    sourceReference: row.sourceReference,
    owner: row.dataOwner,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt,
  };
}

function getOverallStatus(issues: readonly DataReadinessIssue[]): DataStatus {
  if (issues.length === 0) return "verified";
  const statuses = issues.map((issue) => issue.status);
  if (statuses.includes("disabled")) return "disabled";
  if (statuses.includes("expired")) return "expired";
  if (statuses.includes("demo")) return "demo";
  return "draft";
}

export function assessCalculationDataReadiness({
  manifest = CURRENT_DATA_MANIFEST,
  packages,
  settings,
  province,
  provinces,
  contentFingerprints,
  checkedAt = new Date(),
}: CalculationDataReadinessContext = {}): DataReadinessReport {
  const issues: DataReadinessIssue[] = [];

  for (const key of REQUIRED_DATASET_KEYS) {
    const dataset = manifest[key];
    validateGovernance(
      key,
      `Manifest ${key}`,
      dataset,
      checkedAt,
      issues,
    );

    if (dataset.status === "verified") {
      if (!dataset.expectedContentHash) {
        addIssue(
          issues,
          key,
          "draft",
          "CONTENT_HASH_MISSING",
          `Manifest ${key} thiếu hash nội dung đã được phê duyệt.`,
        );
      } else if (
        contentFingerprints?.[key] !== dataset.expectedContentHash
      ) {
        addIssue(
          issues,
          key,
          "draft",
          "CONTENT_HASH_MISMATCH",
          `Nội dung thực tế của ${key} không khớp bản đã được phê duyệt.`,
        );
      }
    }
  }

  if (packages !== undefined) {
    if (packages.length === 0) {
      addIssue(
        issues,
        "packageCatalog",
        "draft",
        "NO_ELIGIBLE_PACKAGE",
        "Không có gói đang hoạt động để thực hiện phép tính.",
      );
    }

    for (const solarPackage of packages) {
      validateGovernance(
        "packageCatalog",
        `Gói ${solarPackage.code}`,
        rowGovernance(solarPackage),
        checkedAt,
        issues,
        manifest.packageCatalog.version,
      );
    }
  }

  if (settings) {
    validateGovernance(
      "calculationAssumptions",
      "Bộ giả định tính toán",
      rowGovernance(settings),
      checkedAt,
      issues,
      manifest.calculationAssumptions.version,
    );
  } else if (settings === null) {
    addIssue(
      issues,
      "calculationAssumptions",
      "draft",
      "MISSING_GOVERNANCE",
      "Không tìm thấy bộ giả định tính toán.",
    );
  }

  if (province) {
    validateGovernance(
      "solarYield",
      `Hệ số tỉnh ${province.code}`,
      rowGovernance(province),
      checkedAt,
      issues,
      manifest.solarYield.version,
    );
  } else if (province === null) {
    addIssue(
      issues,
      "solarYield",
      "draft",
      "MISSING_GOVERNANCE",
      "Không tìm thấy dữ liệu sản lượng cho tỉnh đã chọn.",
    );
  }

  if (provinces !== undefined) {
    if (provinces.length === 0) {
      addIssue(
        issues,
        "solarYield",
        "draft",
        "MISSING_GOVERNANCE",
        "Không có dữ liệu sản lượng tỉnh/thành đang hoạt động.",
      );
    }

    for (const provinceFactor of provinces) {
      validateGovernance(
        "solarYield",
        `Hệ số tỉnh ${provinceFactor.code}`,
        rowGovernance(provinceFactor),
        checkedAt,
        issues,
        manifest.solarYield.version,
      );
    }
  }

  return {
    readyForProduction: issues.length === 0,
    overallStatus: getOverallStatus(issues),
    checkedAt: checkedAt.toISOString(),
    issues,
  };
}

export function shouldRequireVerifiedCalculationData(
  environment = process.env.NODE_ENV,
): boolean {
  return environment === "production";
}
