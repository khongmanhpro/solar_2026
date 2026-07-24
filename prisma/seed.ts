import "dotenv/config";

import {
  DataStatus as PrismaDataStatus,
  PrismaClient,
  SolarSystemType,
} from "@prisma/client";

import {
  DEFAULT_CALCULATION_SETTINGS,
  DEFAULT_PROVINCES,
  DEFAULT_SOLAR_PACKAGES,
} from "../src/config/defaults";
import type { DataGovernanceMetadata } from "../src/types/solar";

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
  for (const solarPackage of DEFAULT_SOLAR_PACKAGES) {
    const existing = await prisma.solarPackage.findUnique({
      where: { code: solarPackage.code },
      select: { dataStatus: true },
    });
    if (existing) continue;

    const data = {
      ...solarPackage,
      ...toPrismaDemoGovernance(solarPackage),
      systemType: toPrismaSystemType(solarPackage.systemType),
    };

    await prisma.solarPackage.create({ data });
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
