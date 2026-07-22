import "dotenv/config";

import { PrismaClient, SolarSystemType } from "@prisma/client";

import {
  DEFAULT_CALCULATION_SETTINGS,
  DEFAULT_PROVINCES,
  DEFAULT_SOLAR_PACKAGES,
} from "../src/config/defaults";

const prisma = new PrismaClient();

function toPrismaSystemType(systemType: "grid-tied" | "hybrid") {
  return systemType === "grid-tied"
    ? SolarSystemType.GRID_TIED
    : SolarSystemType.HYBRID;
}

async function seedSettings() {
  await prisma.calculationSetting.upsert({
    where: { id: "default" },
    update: DEFAULT_CALCULATION_SETTINGS,
    create: {
      id: "default",
      ...DEFAULT_CALCULATION_SETTINGS,
    },
  });
}

async function seedPackages() {
  for (const solarPackage of DEFAULT_SOLAR_PACKAGES) {
    const data = {
      ...solarPackage,
      systemType: toPrismaSystemType(solarPackage.systemType),
    };

    await prisma.solarPackage.upsert({
      where: { code: solarPackage.code },
      update: data,
      create: data,
    });
  }
}

async function seedProvinces() {
  for (const province of DEFAULT_PROVINCES) {
    await prisma.provinceFactor.upsert({
      where: { code: province.code },
      update: province,
      create: province,
    });
  }
}

async function main() {
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
