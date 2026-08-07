import "dotenv/config";

import {
  DataStatus as PrismaDataStatus,
  ElectricalPhase as PrismaElectricalPhase,
  PrismaClient,
  SolarSystemType,
} from "@prisma/client";

import {
  DEFAULT_CALCULATION_SETTINGS,
  DEFAULT_PROVINCES,
} from "../src/config/defaults";
import {
  CUSTOMER_REFERENCE_PACKAGES,
} from "../src/config/customer-reference-packages";
import { assertReferencePackageOwnership } from "../src/lib/customer-reference-package-seed";
import { STANDARD_PACKAGE_CATALOG } from "../src/config/standard-package-catalog";
import {
  isTrialMarketDataEnabled,
  TRIAL_PACKAGE_DATA_VERSION_PREFIX,
} from "../src/config/trial-market-data";
import {
  buildTrialMarketRelease,
  type MarketDataCandidateBundle,
} from "../src/lib/market-data-import";
import type { DataGovernanceMetadata } from "../src/types/solar";
import { validateStandardPackageCatalog } from "../src/lib/standard-package-validation";
import marketDataCandidate from "../data/market-data-candidate.json";

const prisma = new PrismaClient();

function toPrismaDemoGovernance(value: DataGovernanceMetadata) {
  return {
    dataStatus: PrismaDataStatus.DEMO,
    dataVersion: value.dataVersion,
    sourceReference: value.sourceReference,
    dataOwner: value.dataOwner,
    effectiveFrom: value.effectiveFrom
      ? new Date(value.effectiveFrom)
      : null,
    effectiveTo: value.effectiveTo ? new Date(value.effectiveTo) : null,
    approvedBy: null,
    approvedAt: value.approvedAt ? new Date(value.approvedAt) : null,
  };
}

function toPrismaSystemType(systemType: "grid-tied" | "hybrid") {
  return systemType === "grid-tied"
    ? SolarSystemType.GRID_TIED
    : SolarSystemType.HYBRID;
}

function toPrismaElectricalPhase(
  electricalPhase: "single-phase" | "three-phase",
) {
  return electricalPhase === "single-phase"
    ? PrismaElectricalPhase.SINGLE_PHASE
    : PrismaElectricalPhase.THREE_PHASE;
}

function trialDate(value: string | null): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

async function seedSettings() {
  const existing = await prisma.calculationSetting.findUnique({
    where: { id: "default" },
    select: { dataStatus: true },
  });
  if (existing) return;

  const data = {
    ...DEFAULT_CALCULATION_SETTINGS,
    ...toPrismaDemoGovernance(DEFAULT_CALCULATION_SETTINGS),
  };
  await prisma.calculationSetting.create({
    data: {
      id: "default",
      ...data,
    },
  });
}

async function seedPackages() {
  const validation = validateStandardPackageCatalog(
    CUSTOMER_REFERENCE_PACKAGES.map((solarPackage) => ({
      id: solarPackage.code,
      ...solarPackage,
    })),
    STANDARD_PACKAGE_CATALOG,
  );
  if (!validation.valid) {
    throw new Error(
      `Catalog gói chuẩn không hợp lệ:\n${validation.errors
        .map((item) => `${item.packageCode}: ${item.message}`)
        .join("\n")}`,
    );
  }
  if (validation.warnings.length > 0) {
    console.warn(
      `Catalog gói chuẩn có ${validation.warnings.length} cảnh báo cần khảo sát/duyệt trước khi chốt báo giá.`,
    );
  }

  for (const solarPackage of CUSTOMER_REFERENCE_PACKAGES) {
    const existing = await prisma.solarPackage.findUnique({
      where: { code: solarPackage.code },
      select: { dataVersion: true },
    });
    assertReferencePackageOwnership(solarPackage.code, existing?.dataVersion);

    const data = {
      ...solarPackage,
      ...toPrismaDemoGovernance(solarPackage),
      systemType: toPrismaSystemType(solarPackage.systemType),
      electricalPhase: toPrismaElectricalPhase(solarPackage.electricalPhase),
    };
    await prisma.solarPackage.upsert({
      where: { code: solarPackage.code },
      create: data,
      update: data,
    });
  }
}

async function seedTrialPackages() {
  if (!isTrialMarketDataEnabled()) return;

  const release = buildTrialMarketRelease(
    marketDataCandidate as unknown as MarketDataCandidateBundle,
  );

  for (const solarPackage of release.packages) {
    const existing = await prisma.solarPackage.findUnique({
      where: { code: solarPackage.code },
      select: { dataVersion: true },
    });
    if (
      existing &&
      !existing.dataVersion.startsWith(TRIAL_PACKAGE_DATA_VERSION_PREFIX)
    ) {
      throw new Error(
        `Không ghi đè gói ${solarPackage.code} vì record hiện tại không thuộc catalog preview.`,
      );
    }

    const data = {
      ...solarPackage,
      systemType: toPrismaSystemType(solarPackage.systemType),
      electricalPhase: toPrismaElectricalPhase(solarPackage.electricalPhase),
      active: true,
      dataStatus: PrismaDataStatus.DRAFT,
      dataVersion: release.dataVersion,
      dataOwner: "Dữ liệu preview — kinh doanh + kỹ thuật",
      effectiveFrom: trialDate(solarPackage.effectiveFrom),
      effectiveTo: trialDate(solarPackage.effectiveTo),
      approvedBy: null,
      approvedAt: null,
    };

    await prisma.solarPackage.upsert({
      where: { code: solarPackage.code },
      create: data,
      update: data,
    });
  }
}

async function seedProvinces() {
  for (const province of DEFAULT_PROVINCES) {
    const existing = await prisma.provinceFactor.findUnique({
      where: { code: province.code },
      select: { dataStatus: true },
    });
    if (existing) continue;

    const data = {
      ...province,
      ...toPrismaDemoGovernance(province),
    };
    await prisma.provinceFactor.create({ data });
  }
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Không được chạy seed dữ liệu DEMO trong môi trường production.",
    );
  }

  await seedSettings();
  await seedPackages();
  await seedTrialPackages();
  await seedProvinces();

  const [packageCount, provinceCount, settingCount] = await Promise.all([
    prisma.solarPackage.count(),
    prisma.provinceFactor.count(),
    prisma.calculationSetting.count(),
  ]);

  console.log(
    `Đã seed ${packageCount} gói, ${provinceCount} tỉnh/thành và ${settingCount} bộ cấu hình.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("Seed database thất bại:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
