import { describe, expect, it } from "vitest";

import {
  CALCULATION_ALGORITHM_VERSION,
  CALCULATION_SNAPSHOT_SCHEMA_VERSION,
  CURRENT_DATA_MANIFEST,
} from "@/config/data-governance";
import {
  DEFAULT_CALCULATION_SETTINGS,
  DEFAULT_PROVINCES,
  DEFAULT_SOLAR_PACKAGES,
} from "@/config/defaults";
import { RESIDENTIAL_ELECTRICITY_TARIFF } from "@/config/electricity-tariffs";
import {
  createCalculationSourceSnapshot,
  createCalculationVersionMetadata,
  getCalculationDatasetFingerprints,
  getCurrentResidentialTariffVersion,
} from "@/lib/calculation-snapshot";
import { createLegacyNormalizedEnergyInput } from "@/lib/customer-input";
import {
  assessCalculationDataReadiness,
  shouldRequireVerifiedCalculationData,
} from "@/lib/data-readiness";
import {
  REQUIRED_DATASET_KEYS,
  type CalculationDataManifest,
} from "@/types/data-governance";
import type {
  CalculationSettings,
  DataGovernanceMetadata,
  ProvinceFactor,
  SolarCalculationInput,
  SolarPackage,
} from "@/types/solar";

const input: SolarCalculationInput = {
  inputContractVersion: "legacy-v1",
  energyInputMethod: "legacy_money",
  inputMonthCount: 1,
  monthlyConsumptionKwh: 669.95239,
  monthlyBill: 2_000_000,
  electricityType: "residential",
  province: "ho-chi-minh",
  daytimeUsageLevel: "high",
  roofAreaM2: 30,
  backupRequired: false,
  essentialLoadWatts: null,
  backupHours: null,
};

const normalizedInput = createLegacyNormalizedEnergyInput(
  input,
  getCurrentResidentialTariffVersion(),
);

const packages: SolarPackage[] = DEFAULT_SOLAR_PACKAGES.map(
  (solarPackage, index) => ({
    id: `package-${index}`,
    ...solarPackage,
  }),
);

const province: ProvinceFactor = {
  id: "province-ho-chi-minh",
  active: true,
  ...DEFAULT_PROVINCES[0],
};

function createSourceSnapshot(
  packageFixtures = packages,
  provinceFixtures: ProvinceFactor[] = [province],
) {
  return createCalculationSourceSnapshot({
    input,
    normalizedInput,
    customerInput: null,
    packages: packageFixtures,
    settings: DEFAULT_CALCULATION_SETTINGS,
    province,
    provinceFactors: provinceFixtures,
  });
}

const checkedAt = new Date("2026-07-22T00:00:00.000Z");

function verifiedGovernance(
  key: keyof CalculationDataManifest,
): DataGovernanceMetadata {
  const manifestRecord = CURRENT_DATA_MANIFEST[key];

  return {
    dataStatus: "verified",
    dataVersion: manifestRecord.version,
    sourceReference: manifestRecord.sourceReference,
    dataOwner: manifestRecord.owner,
    effectiveFrom: "2026-07-01T00:00:00.000Z",
    effectiveTo: null,
    approvedBy: "Independent domain reviewer",
    approvedAt: "2026-07-20T00:00:00.000Z",
  };
}

function createVerifiedReadinessContext() {
  const verifiedPackages: SolarPackage[] = packages.map((solarPackage) => ({
    ...solarPackage,
    ...verifiedGovernance("packageCatalog"),
  }));
  const verifiedSettings: CalculationSettings = {
    ...DEFAULT_CALCULATION_SETTINGS,
    ...verifiedGovernance("calculationAssumptions"),
  };
  const verifiedProvince: ProvinceFactor = {
    ...province,
    ...verifiedGovernance("solarYield"),
  };
  const sourceSnapshot = createCalculationSourceSnapshot({
    input,
    normalizedInput,
    customerInput: null,
    packages: verifiedPackages,
    settings: verifiedSettings,
    province: verifiedProvince,
  });
  const contentFingerprints =
    getCalculationDatasetFingerprints(sourceSnapshot);
  const manifest = structuredClone(
    CURRENT_DATA_MANIFEST,
  ) as CalculationDataManifest;

  for (const key of REQUIRED_DATASET_KEYS) {
    manifest[key] = {
      ...manifest[key],
      status: "verified",
      effectiveFrom: "2026-07-01",
      approvedBy: "Independent domain reviewer",
      approvedAt: "2026-07-20T00:00:00.000Z",
      expectedContentHash: contentFingerprints[key],
    };
  }

  return {
    manifest,
    packages: verifiedPackages,
    settings: verifiedSettings,
    province: verifiedProvince,
    contentFingerprints,
    checkedAt,
  };
}

describe("cổng dữ liệu calculation", () => {
  it("giữ tariff ở DRAFT và các dataset chưa xác minh ở DEMO", () => {
    const report = assessCalculationDataReadiness();

    expect(report.readyForProduction).toBe(false);
    expect(report.overallStatus).toBe("demo");
    expect(report.issues).toHaveLength(REQUIRED_DATASET_KEYS.length);
    expect(CURRENT_DATA_MANIFEST.electricityTariff.status).toBe("draft");
    expect(
      REQUIRED_DATASET_KEYS.filter((key) => key !== "electricityTariff").every(
        (key) => CURRENT_DATA_MANIFEST[key].status === "demo",
      ),
    ).toBe(true);
  });

  it("chỉ cho VERIFIED khi mọi nguồn có đủ hiệu lực và phê duyệt", () => {
    const report = assessCalculationDataReadiness(
      createVerifiedReadinessContext(),
    );

    expect(report).toMatchObject({
      readyForProduction: true,
      overallStatus: "verified",
      issues: [],
    });
  });

  it("không tin nhãn VERIFIED nếu thiếu bằng chứng phê duyệt", () => {
    const context = createVerifiedReadinessContext();
    context.manifest.solarYield.approvedBy = null;

    const report = assessCalculationDataReadiness(context);

    expect(report.readyForProduction).toBe(false);
    expect(report.overallStatus).toBe("draft");
    expect(report.issues).toEqual([
      expect.objectContaining({ dataset: "solarYield" }),
    ]);
  });

  it("từ chối manifest VERIFIED khi hash nội dung thực tế không khớp", () => {
    const context = createVerifiedReadinessContext();
    context.contentFingerprints.packageCatalog = "hash-khong-khop";

    const report = assessCalculationDataReadiness(context);

    expect(report.readyForProduction).toBe(false);
    expect(report.overallStatus).toBe("draft");
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dataset: "packageCatalog",
          code: "CONTENT_HASH_MISMATCH",
          status: "draft",
        }),
      ]),
    );
  });

  it("từ chối package VERIFIED khi version trong database lệch manifest", () => {
    const context = createVerifiedReadinessContext();
    context.packages[0] = {
      ...context.packages[0]!,
      dataVersion: "package-version-khong-khop",
    };

    const report = assessCalculationDataReadiness(context);

    expect(report.readyForProduction).toBe(false);
    expect(report.overallStatus).toBe("draft");
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dataset: "packageCatalog",
          code: "VERSION_MISMATCH",
          status: "draft",
        }),
      ]),
    );
  });

  it("từ chối dataset có effectiveFrom nằm trong tương lai", () => {
    const context = createVerifiedReadinessContext();
    context.manifest.solarYield.effectiveFrom = "2026-08-01T00:00:00.000Z";

    const report = assessCalculationDataReadiness(context);

    expect(report.readyForProduction).toBe(false);
    expect(report.overallStatus).toBe("draft");
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dataset: "solarYield",
          code: "NOT_YET_EFFECTIVE",
          status: "draft",
        }),
      ]),
    );
  });

  it("đánh dấu EXPIRED khi effectiveTo đã qua", () => {
    const context = createVerifiedReadinessContext();
    context.manifest.electricityTariff.effectiveTo =
      "2026-07-21T23:59:59.000Z";

    const report = assessCalculationDataReadiness(context);

    expect(report.readyForProduction).toBe(false);
    expect(report.overallStatus).toBe("expired");
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dataset: "electricityTariff",
          code: "EXPIRED",
          status: "expired",
        }),
      ]),
    );
  });

  it("từ chối production khi không còn package để tính", () => {
    const context = createVerifiedReadinessContext();
    context.packages = [];

    const report = assessCalculationDataReadiness(context);

    expect(report.readyForProduction).toBe(false);
    expect(report.overallStatus).toBe("draft");
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dataset: "packageCatalog",
          code: "NO_ELIGIBLE_PACKAGE",
          status: "draft",
        }),
      ]),
    );
  });

  it("bật cổng VERIFIED bắt buộc trong production", () => {
    expect(shouldRequireVerifiedCalculationData("production")).toBe(true);
    expect(shouldRequireVerifiedCalculationData("development")).toBe(false);
    expect(shouldRequireVerifiedCalculationData("test")).toBe(false);
  });
});

describe("snapshot và phiên bản calculation", () => {
  it("chụp đúng biểu giá, nguồn đầu vào và các hằng số thuật toán", () => {
    const sourceSnapshot = createSourceSnapshot();
    const metadata = createCalculationVersionMetadata(
      sourceSnapshot,
      new Date("2026-07-22T00:00:00.000Z"),
    );

    expect(sourceSnapshot.tariff.tiers).toEqual(
      RESIDENTIAL_ELECTRICITY_TARIFF,
    );
    expect(sourceSnapshot.normalizedInput.tariffVersion).toBe(
      getCurrentResidentialTariffVersion(),
    );
    expect(metadata.dataVersions.electricityTariff).toMatch(
      /^electricity-tariff-registry-2026-07-22-draft\.1\+sha256\.[a-f0-9]{64}$/,
    );
    expect(sourceSnapshot.packages).toHaveLength(DEFAULT_SOLAR_PACKAGES.length);
    expect(sourceSnapshot.provinceFactor).toMatchObject({
      code: "ho-chi-minh",
      name: "Hồ Chí Minh",
      factor: 1,
    });
    expect(sourceSnapshot.algorithmConstants.calculation).not.toEqual({});
    expect(sourceSnapshot.algorithmConstants.recommendation).not.toEqual({});
    expect(metadata).toMatchObject({
      snapshotSchemaVersion: CALCULATION_SNAPSHOT_SCHEMA_VERSION,
      algorithmVersion: CALCULATION_ALGORITHM_VERSION,
      createdAt: "2026-07-22T00:00:00.000Z",
      dataReadiness: {
        readyForProduction: false,
        overallStatus: "demo",
      },
      confidence: { overall: "low" },
    });
  });

  it("tạo metadata xác định khi input nguồn và thời điểm không đổi", () => {
    const sourceSnapshot = createSourceSnapshot();
    const createdAt = new Date("2026-07-22T00:00:00.000Z");

    expect(
      createCalculationVersionMetadata(sourceSnapshot, createdAt),
    ).toEqual(createCalculationVersionMetadata(sourceSnapshot, createdAt));
  });

  it("không đổi package fingerprint chỉ vì thứ tự truy vấn thay đổi", () => {
    const createdAt = new Date("2026-07-22T00:00:00.000Z");
    const normalOrder = createCalculationVersionMetadata(
      createSourceSnapshot(packages),
      createdAt,
    );
    const reversedOrder = createCalculationVersionMetadata(
      createSourceSnapshot([...packages].reverse()),
      createdAt,
    );

    expect(reversedOrder.dataVersions.packageCatalog).toBe(
      normalOrder.dataVersions.packageCatalog,
    );
  });

  it("không đổi fingerprint vì ID database hoặc thứ tự tỉnh khác nhau", () => {
    const createdAt = new Date("2026-07-22T00:00:00.000Z");
    const secondProvince: ProvinceFactor = {
      ...province,
      id: "province-ha-noi",
      code: "ha-noi",
      name: "Hà Nội",
      factor: 0.88,
      displayOrder: 2,
    };
    const baseline = createCalculationVersionMetadata(
      createSourceSnapshot(packages, [province, secondProvince]),
      createdAt,
    );
    const differentDatabaseIds = packages.map((solarPackage, index) => ({
      ...solarPackage,
      id: `new-database-id-${index}`,
    }));
    const reordered = createCalculationVersionMetadata(
      createSourceSnapshot(differentDatabaseIds, [secondProvince, province]),
      createdAt,
    );

    expect(reordered.dataVersions.packageCatalog).toBe(
      baseline.dataVersions.packageCatalog,
    );
    expect(reordered.dataVersions.solarYield).toBe(
      baseline.dataVersions.solarYield,
    );
  });

  it("đổi dữ liệu package làm đổi riêng package catalog fingerprint", () => {
    const before = createCalculationVersionMetadata(
      createSourceSnapshot(),
      new Date("2026-07-22T00:00:00.000Z"),
    );
    const changedPackages = packages.map((solarPackage, index) =>
      index === 0
        ? { ...solarPackage, priceVnd: solarPackage.priceVnd + 1 }
        : solarPackage,
    );
    const after = createCalculationVersionMetadata(
      createSourceSnapshot(changedPackages),
      new Date("2026-07-22T00:00:00.000Z"),
    );

    expect(after.dataVersions.packageCatalog).not.toBe(
      before.dataVersions.packageCatalog,
    );
    expect(after.dataVersions.electricityTariff).toBe(
      before.dataVersions.electricityTariff,
    );
    expect(after.dataVersions.solarYield).toBe(
      before.dataVersions.solarYield,
    );
    expect(after.dataVersions.calculationAssumptions).toBe(
      before.dataVersions.calculationAssumptions,
    );
  });
});
