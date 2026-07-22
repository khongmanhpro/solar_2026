import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  PrismaClient,
  SolarSystemType as PrismaSolarSystemType,
} from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
  DEFAULT_CALCULATION_SETTINGS,
  DEFAULT_PROVINCES,
  DEFAULT_SOLAR_PACKAGES,
} from "@/config/defaults";
import { AppError } from "@/server/errors";
import { createServiceContainer } from "@/server/container";

const validCalculationInput = {
  monthlyBill: 2_000_000,
  electricityType: "residential",
  province: "ho-chi-minh",
  daytimeUsageLevel: "high",
  roofAreaM2: 25,
  backupRequired: false,
} as const;

const migrationPaths = [
  "../prisma/migrations/20260720054649_init/migration.sql",
  "../prisma/migrations/20260720170000_add_electricity_type/migration.sql",
].map((migrationPath) => new URL(migrationPath, import.meta.url));

describe("service integration", () => {
  let databaseDirectory: string;
  let prisma: PrismaClient;
  let services: ReturnType<typeof createServiceContainer>;

  beforeEach(async () => {
    databaseDirectory = await mkdtemp(
      path.join(tmpdir(), "solar-api-test-"),
    );
    const databasePath = path.join(databaseDirectory, "test.db");
    const migrationSql = (
      await Promise.all(
        migrationPaths.map((migrationPath) => readFile(migrationPath, "utf8")),
      )
    ).join("\n");
    const sqlite = new DatabaseSync(databasePath);
    sqlite.exec(migrationSql);
    sqlite.close();

    prisma = new PrismaClient({
      datasources: { db: { url: `file:${databasePath}` } },
    });
    services = createServiceContainer(prisma);

    await prisma.calculationSetting.create({
      data: { id: "default", ...DEFAULT_CALCULATION_SETTINGS },
    });
    await prisma.provinceFactor.createMany({
      data: DEFAULT_PROVINCES.map((province, index) => ({
        id: `province-${index}`,
        ...province,
      })),
    });
    await prisma.solarPackage.createMany({
      data: DEFAULT_SOLAR_PACKAGES.map((solarPackage, index) => ({
        id: `package-${index}`,
        ...solarPackage,
        systemType:
          solarPackage.systemType === "grid-tied"
            ? PrismaSolarSystemType.GRID_TIED
            : PrismaSolarSystemType.HYBRID,
      })),
    });
  });

  afterEach(async () => {
    await prisma.$disconnect();
    await rm(databaseDirectory, { recursive: true, force: true });
  });

  it("tính toán, lưu snapshot và trả calculationId", async () => {
    const result = await services.calculations.create(validCalculationInput);
    const stored = await prisma.calculation.findUnique({
      where: { id: result.calculationId },
    });

    expect(result.recommendedPackage?.packageId).toBe("package-1");
    expect(stored).not.toBeNull();
    expect(stored?.recommendedPackageId).toBe("package-1");
    expect(stored?.resultJson).toMatchObject({
      inputSummary: validCalculationInput,
    });
  });

  it("vẫn lưu calculation khi không có package phù hợp", async () => {
    const result = await services.calculations.create({
      ...validCalculationInput,
      roofAreaM2: 10,
    });
    const stored = await prisma.calculation.findUnique({
      where: { id: result.calculationId },
    });

    expect(result.recommendedPackage).toBeNull();
    expect(result.comparedPackages).toEqual([]);
    expect(stored?.recommendedPackageId).toBeNull();
  });

  it("tạo lead và liên kết đúng calculation", async () => {
    const calculation = await services.calculations.create(
      validCalculationInput,
    );
    const lead = await services.leads.create({
      fullName: "Nguyễn Văn An",
      phone: "+84 901 234 567",
      preferredContactTime: "morning",
      calculationId: calculation.calculationId,
    });
    const stored = await prisma.lead.findUnique({
      where: { id: lead.id },
      include: { calculation: true },
    });

    expect(lead.phone).toBe("0901234567");
    expect(stored?.calculationId).toBe(calculation.calculationId);
    expect(stored?.status).toBe("NEW");
    expect(stored?.calculation.recommendedPackageId).toBe("package-1");
    expect(stored?.calculation.resultJson).toMatchObject({
      inputSummary: validCalculationInput,
    });
  });

  it("từ chối lead tham chiếu calculation không tồn tại", async () => {
    await expect(
      services.leads.create({
        fullName: "Nguyễn Văn An",
        phone: "0901234567",
        preferredContactTime: "anytime",
        calculationId: "missing-calculation",
      }),
    ).rejects.toBeInstanceOf(AppError);
    expect(await prisma.lead.count()).toBe(0);
  });

  it("thêm, sửa và vô hiệu hóa package mà không xóa cứng", async () => {
    const created = await services.packages.create({
      ...DEFAULT_SOLAR_PACKAGES[0],
      code: "CUSTOM-4KWP",
      name: "Gói tùy chỉnh 4 kWp",
      capacityKwp: 4,
      displayOrder: 10,
    });
    const updated = await services.packages.update(created.id, {
      priceVnd: 40_000_000,
    });
    const disabled = await services.packages.disable(created.id);

    expect(updated.priceVnd).toBe(40_000_000);
    expect(disabled.active).toBe(false);
    expect(await prisma.solarPackage.count({ where: { id: created.id } })).toBe(
      1,
    );
  });

  it("cập nhật package làm thay đổi phép tính kế tiếp, không sửa snapshot cũ", async () => {
    const before = await services.calculations.create(validCalculationInput);
    const beforePackage = before.comparedPackages.find(
      (item) => item.packageId === "package-1",
    );

    await services.packages.update("package-1", { priceVnd: 180_000_000 });
    const after = await services.calculations.create(validCalculationInput);
    const afterPackage = after.comparedPackages.find(
      (item) => item.packageId === "package-1",
    );
    const storedBefore = await prisma.calculation.findUnique({
      where: { id: before.calculationId },
    });
    const storedBeforeResult = storedBefore?.resultJson as unknown as {
      comparedPackages: Array<{ packageId: string; paybackYears: number }>;
    };
    const storedBeforePackage = storedBeforeResult.comparedPackages.find(
      (item) => item.packageId === "package-1",
    );

    expect(afterPackage?.paybackYears).not.toBe(beforePackage?.paybackYears);
    expect(storedBeforePackage?.paybackYears).toBeCloseTo(
      beforePackage?.paybackYears ?? 0,
      10,
    );
  });

  it("merge settings trước khi kiểm tra invariant và lưu", async () => {
    const updated = await services.settings.update({
      averageElectricityPriceVndPerKwh: 3_000,
    });

    expect(updated.averageElectricityPriceVndPerKwh).toBe(3_000);
    expect(updated.daytimeMediumRatio).toBe(0.5);

    await expect(
      services.settings.update({ daytimeMediumRatio: 0.2 }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("cập nhật settings làm thay đổi phép tính kế tiếp", async () => {
    const before = await services.calculations.create(validCalculationInput);
    await services.settings.update({
      lowEstimateFactor: 0.8,
    });
    const after = await services.calculations.create(validCalculationInput);

    expect(after.recommendedPackage?.lowEstimate.adjustedGenerationKwh).not.toBe(
      before.recommendedPackage?.lowEstimate.adjustedGenerationKwh,
    );
    expect(after.assumptions.lowEstimateFactor).toBe(0.8);
  });

  it("cập nhật province factor làm thay đổi phép tính tiếp theo", async () => {
    const province = (await services.provinces.list()).find(
      (item) => item.code === "ho-chi-minh",
    );

    if (!province) throw new Error("Thiếu province fixture.");

    await services.provinces.update(province.id, { factor: 0.5 });
    const result = await services.calculations.create(validCalculationInput);
    const package3Kwp = result.comparedPackages.find(
      (item) => item.packageId === "package-1",
    );

    expect(package3Kwp?.adjustedGenerationKwh).toBe(180);
  });

  it("cập nhật trạng thái lead và trả dữ liệu quản trị", async () => {
    const calculation = await services.calculations.create(
      validCalculationInput,
    );
    const lead = await services.leads.create({
      fullName: "Nguyễn Văn An",
      phone: "0901234567",
      preferredContactTime: "afternoon",
      calculationId: calculation.calculationId,
    });
    const updated = await services.leads.updateStatus(lead.id, {
      status: "survey_scheduled",
    });
    const list = await services.leads.list();
    const detail = await services.leads.get(lead.id);

    expect(updated.status).toBe("survey_scheduled");
    expect(list[0]?.calculation.recommendedPackageName).toBe(
      "Gói phù hợp 3 kWp",
    );
    expect(detail.calculation.roofAreaM2).toBe(validCalculationInput.roofAreaM2);
    expect(detail.calculation.electricityType).toBe("residential");
    expect(detail.calculation.result.inputSummary).toEqual(validCalculationInput);
  });
});
