import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  DataStatus as PrismaDataStatus,
  ElectricalPhase as PrismaElectricalPhase,
  PrismaClient,
  SolarSystemType as PrismaSolarSystemType,
} from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

import {
  CALCULATION_ALGORITHM_VERSION,
  CALCULATION_SNAPSHOT_SCHEMA_VERSION,
} from "@/config/data-governance";
import {
  DEFAULT_CALCULATION_SETTINGS,
  DEFAULT_PROVINCES,
  DEFAULT_SOLAR_PACKAGES,
} from "@/config/defaults";
import {
  QD1279_RESIDENTIAL_TARIFF,
  VAT_8_PERCENT_NQ204,
} from "@/config/electricity-tariffs";
import { calculateElectricityBillBreakdown } from "@/lib/electricity-tariff";
import { AppError } from "@/server/errors";
import { createServiceContainer } from "@/server/container";

const validCalculationInput = {
  inputContractVersion: "legacy-v1",
  billAmountBasis: "energy_charge_before_vat",
  customerConfirmed: true,
  monthlyBill: 2_000_000,
  electricityType: "residential",
  province: "ho-chi-minh",
  daytimeUsageLevel: "high",
  roofAreaM2: 25,
  backupRequired: false,
} as const;

const expectedLegacyInputSummary = {
  monthlyBill: validCalculationInput.monthlyBill,
  electricityType: validCalculationInput.electricityType,
  province: validCalculationInput.province,
  daytimeUsageLevel: validCalculationInput.daytimeUsageLevel,
  roofAreaM2: validCalculationInput.roofAreaM2,
  backupRequired: validCalculationInput.backupRequired,
} as const;

const validCustomerCalculationInput = {
  schemaVersion: "2.0.0",
  energy: {
    method: "kwh",
    observations: [
      { period: "2026-04", valueKwh: 333.33 },
      { period: "2026-05", valueKwh: 333.33 },
      { period: "2026-06", valueKwh: 333.33 },
    ],
  },
  site: {
    province: "ho-chi-minh",
    daytimeBehavior: "some_daytime_use",
    roof: { known: false },
    backup: { required: false },
  },
} as const;

const migrationPaths = [
  "../prisma/migrations/20260720054649_init/migration.sql",
  "../prisma/migrations/20260720170000_add_electricity_type/migration.sql",
  "../prisma/migrations/20260722120000_add_data_governance/migration.sql",
  "../prisma/migrations/20260722123000_backfill_governance_sources/migration.sql",
  "../prisma/migrations/20260722130000_phase1_customer_input/migration.sql",
  "../prisma/migrations/20260806090000_add_electrical_phase/migration.sql",
  "../prisma/migrations/20260806120000_add_pvgis_monthly_yield/migration.sql",
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
      data: {
        id: "default",
        ...DEFAULT_CALCULATION_SETTINGS,
        dataStatus: PrismaDataStatus.DEMO,
      },
    });
    await prisma.provinceFactor.createMany({
      data: DEFAULT_PROVINCES.map((province, index) => ({
        id: `province-${index}`,
        ...province,
        dataStatus: PrismaDataStatus.DEMO,
      })),
    });
    await prisma.solarPackage.createMany({
      data: DEFAULT_SOLAR_PACKAGES.map((solarPackage, index) => ({
        id: `package-${index}`,
        ...solarPackage,
        dataStatus: PrismaDataStatus.DEMO,
        systemType:
          solarPackage.systemType === "grid-tied"
            ? PrismaSolarSystemType.GRID_TIED
            : PrismaSolarSystemType.HYBRID,
        electricalPhase: PrismaElectricalPhase.SINGLE_PHASE,
      })),
    });
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
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
    expect(result.metadata).toMatchObject({
      snapshotSchemaVersion: CALCULATION_SNAPSHOT_SCHEMA_VERSION,
      algorithmVersion: CALCULATION_ALGORITHM_VERSION,
      dataReadiness: {
        readyForProduction: false,
        overallStatus: "demo",
      },
    });
    expect(result.metadata.algorithmFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(result.metadata.dataVersion).toMatch(
      /^data-bundle\+sha256\.[a-f0-9]{64}$/,
    );
    expect(stored).toMatchObject({
      snapshotSchemaVersion: result.metadata.snapshotSchemaVersion,
      algorithmVersion: result.metadata.algorithmVersion,
      algorithmFingerprint: result.metadata.algorithmFingerprint,
      dataVersion: result.metadata.dataVersion,
      dataStatus: "DEMO",
    });
    expect(stored?.dataVersions).toEqual(result.metadata.dataVersions);
    expect(stored).toMatchObject({
      inputContractVersion: result.inputSummary.inputContractVersion,
      energyInputSource: result.inputSummary.energyInputMethod,
      inputMonthCount: result.inputSummary.inputMonthCount,
      normalizedMonthlyConsumptionKwh:
        result.normalizedInput.monthlyConsumptionKwh.value.expected,
      consumptionLowerKwh:
        result.normalizedInput.monthlyConsumptionKwh.value.lowerBound,
      consumptionUpperKwh:
        result.normalizedInput.monthlyConsumptionKwh.value.upperBound,
      roofAreaKnown: result.inputSummary.roofAreaM2 !== null,
      roofAreaM2: result.inputSummary.roofAreaM2,
      essentialLoadWatts: result.inputSummary.essentialLoadWatts,
      backupHours: result.inputSummary.backupHours,
    });
    expect(stored?.resultJson).toMatchObject({
      inputSummary: expectedLegacyInputSummary,
      metadata: result.metadata,
      sourceSnapshot: {
        normalizedInput: result.normalizedInput,
        tariff: {
          electricityType: "residential",
          vatRate: null,
          roundingRule: "versioned",
        },
        provinceFactor: {
          code: "ho-chi-minh",
          factor: 1,
        },
      },
    });
  });

  it("lưu pha khách chọn trong calculation và snapshot 2.2", async () => {
    const result = await services.calculations.create({
      ...validCustomerCalculationInput,
      schemaVersion: "2.2.0",
      site: {
        ...validCustomerCalculationInput.site,
        electricalPhase: "single-phase",
      },
    });
    const stored = await prisma.calculation.findUnique({
      where: { id: result.calculationId },
    });

    expect(stored?.electricalPhase).toBe(PrismaElectricalPhase.SINGLE_PHASE);
    expect(result.inputSummary.electricalPhase).toBe("single-phase");
    expect(result.sourceSnapshot.siteInput.electricalPhase).toMatchObject({
      value: "single-phase",
      origin: "customer",
    });
  });

  it("chỉ dùng catalog trial trong development khi bật cờ", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TRIAL_MARKET_DATA_ENABLED", "true");
    const source = DEFAULT_SOLAR_PACKAGES[1];
    await prisma.solarPackage.create({
      data: {
        id: "trial-package",
        ...source,
        code: "TRIAL-FIT-3KWP",
        name: "Gói thử nghiệm từ workbook",
        dataStatus: PrismaDataStatus.DRAFT,
        dataVersion: "market-data-trial-fixture-v1",
        sourceReference: "workbook:test; trial-only",
        systemType: PrismaSolarSystemType.GRID_TIED,
        electricalPhase: PrismaElectricalPhase.SINGLE_PHASE,
      },
    });

    const result = await services.calculations.create(validCalculationInput);

    expect(result.sourceSnapshot.packages).toHaveLength(1);
    expect(result.sourceSnapshot.packages[0]).toMatchObject({
      id: "trial-package",
      dataStatus: "draft",
      dataVersion: "market-data-trial-fixture-v1",
    });
    expect(result.sourceSnapshot.dataManifest.packageCatalog.version).toBe(
      "market-data-trial-fixture-v1",
    );
    expect(result.metadata.dataVersions.packageCatalog).toMatch(
      /^market-data-trial-fixture-v1\+sha256\./,
    );
    expect(result.recommendedPackage?.packageId).toBe("trial-package");
  });

  it("cho phép catalog preview trên VPS production khi bật đủ hai cờ", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRIAL_MARKET_DATA_ENABLED", "true");
    vi.stubEnv("PUBLIC_PREVIEW_MODE_ENABLED", "true");
    const source = DEFAULT_SOLAR_PACKAGES[1];
    await prisma.solarPackage.create({
      data: {
        id: "public-preview-package",
        ...source,
        code: "PUBLIC-PREVIEW-FIT-3KWP",
        name: "Gói preview từ workbook",
        dataStatus: PrismaDataStatus.DRAFT,
        dataVersion: "market-data-trial-public-preview-v1",
        sourceReference: "workbook:test; public-preview",
        systemType: PrismaSolarSystemType.GRID_TIED,
        electricalPhase: PrismaElectricalPhase.SINGLE_PHASE,
      },
    });

    const result = await services.calculations.create(validCalculationInput);

    expect(result.sourceSnapshot.packages).toHaveLength(1);
    expect(result.sourceSnapshot.packages[0]).toMatchObject({
      id: "public-preview-package",
      dataStatus: "draft",
      dataVersion: "market-data-trial-public-preview-v1",
    });
    expect(result.metadata.dataReadiness.readyForProduction).toBe(false);
    expect(result.recommendedPackage?.packageId).toBe(
      "public-preview-package",
    );
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
    expect(result.metadata.algorithmVersion).toBe(
      CALCULATION_ALGORITHM_VERSION,
    );
    expect(stored?.dataVersions).toEqual(result.metadata.dataVersions);
  });

  it("V2 lưu kWh trực tiếp, từng quan sát và mái chưa biết mà không tạo tiền khách khai", async () => {
    const result = await services.calculations.create(
      validCustomerCalculationInput,
    );
    const stored = await prisma.calculation.findUnique({
      where: { id: result.calculationId },
    });

    expect(result.inputSummary).toMatchObject({
      inputContractVersion: "2.0.0",
      energyInputMethod: "kwh",
      inputMonthCount: 3,
      monthlyConsumptionKwh: 333.33,
      roofAreaM2: null,
    });
    expect(result.normalizedInput.observations).toHaveLength(3);
    expect(
      result.normalizedInput.monthlyConsumptionKwh.value.expected,
    ).toBeCloseTo(333.33, 10);
    expect(result.sourceSnapshot.customerInput).toEqual(
      validCustomerCalculationInput,
    );
    expect(stored).toMatchObject({
      inputContractVersion: "2.0.0",
      energyInputSource: "kwh",
      inputMonthCount: 3,
      normalizedMonthlyConsumptionKwh: 333.33,
      reportedAmountVnd: null,
      reportedAmountBasis: null,
      roofAreaKnown: false,
      roofAreaM2: null,
    });
  });

  it("từ chối tổng thanh toán chưa tách được và không ghi DB", async () => {
    await expect(
      services.calculations.create({
        ...validCustomerCalculationInput,
        energy: {
          method: "money",
          amountBasis: "total_payment",
          observations: [{ totalPaymentVnd: 50_000 }],
        },
      }),
    ).rejects.toMatchObject({
      code: "MONEY_CONTEXT_REQUIRED",
      status: 422,
    });
    expect(await prisma.calculation.count()).toBe(0);
  });

  it("V2.1 suy ngược hóa đơn chuẩn, lưu tariff/VAT từng kỳ và chỉ chốt gói ổn định", async () => {
    const reference = calculateElectricityBillBreakdown({
      tariff: QD1279_RESIDENTIAL_TARIFF,
      vatRule: VAT_8_PERCENT_NQ204,
      consumptionKwh: 450,
      context: { householdQuotaMultiplier: 1 },
    });
    const result = await services.calculations.create({
      ...validCustomerCalculationInput,
      schemaVersion: "2.1.0",
      energy: {
        method: "money",
        amountBasis: "total_payment",
        billingContext: { kind: "standard_single_household" },
        observations: [
          {
            period: "2026-06",
            totalPaymentVnd: reference.totalPaymentVnd,
          },
        ],
      },
    });
    const stored = await prisma.calculation.findUnique({
      where: { id: result.calculationId },
    });

    expect(result.inputSummary.monthlyConsumptionKwh).toBeCloseTo(450, 2);
    expect(result.normalizedInput.moneyConversions?.[0]).toMatchObject({
      tariffVersion: QD1279_RESIDENTIAL_TARIFF.version,
      vatRuleVersion: VAT_8_PERCENT_NQ204.version,
      exact: true,
    });
    expect(result.recommendationStability).toMatchObject({
      evaluated: true,
      stable: true,
    });
    expect(result.recommendedPackage).not.toBeNull();
    expect(result.sourceSnapshot.tariff).toMatchObject({
      selectedTariffVersions: [QD1279_RESIDENTIAL_TARIFF.version],
      selectedVatRuleVersions: [VAT_8_PERCENT_NQ204.version],
      vatRate: 0.08,
      roundingRule: "versioned",
    });
    expect(stored).toMatchObject({
      inputContractVersion: "2.1.0",
      energyInputSource: "money",
      reportedAmountVnd: reference.totalPaymentVnd,
      reportedAmountBasis: "total_payment",
    });
    expect(stored?.normalizedMonthlyConsumptionKwh).toBeCloseTo(
      result.normalizedInput.monthlyConsumptionKwh.value.expected,
      10,
    );
  });

  it("hóa đơn chưa rõ thành phần chỉ trả khoảng và không tự chốt gói", async () => {
    const result = await services.calculations.create({
      ...validCustomerCalculationInput,
      schemaVersion: "2.1.0",
      energy: {
        method: "money",
        amountBasis: "total_payment",
        billingContext: { kind: "unknown" },
        observations: [
          { period: "2026-06", totalPaymentVnd: 2_160_000 },
        ],
      },
    });
    const stored = await prisma.calculation.findUnique({
      where: { id: result.calculationId },
    });

    expect(result.normalizedInput.monthlyConsumptionKwh.value.lowerBound).toBe(0);
    expect(result.normalizedInput.monthlyConsumptionKwh.value.upperBound).toBeGreaterThan(0);
    expect(result.recommendationStability).toMatchObject({
      evaluated: true,
      stable: false,
    });
    expect(result.recommendedPackage).toBeNull();
    expect(stored?.recommendedPackageId).toBeNull();
  });

  it("không tự dùng VAT ngoài khoảng registry", async () => {
    await expect(
      services.calculations.create({
        ...validCustomerCalculationInput,
        schemaVersion: "2.1.0",
        energy: {
          method: "money",
          amountBasis: "total_payment",
          billingContext: { kind: "standard_single_household" },
          observations: [
            { period: "2025-06", totalPaymentVnd: 2_160_000 },
          ],
        },
      }),
    ).rejects.toMatchObject({ code: "VAT_RULE_GAP", status: 422 });
    expect(await prisma.calculation.count()).toBe(0);
  });

  it("production không dùng tariff/VAT chưa phê duyệt cho phép suy ngược tiền", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(
      services.calculations.create({
        ...validCustomerCalculationInput,
        schemaVersion: "2.1.0",
        energy: {
          method: "money",
          amountBasis: "total_payment",
          billingContext: { kind: "standard_single_household" },
          observations: [
            { period: "2026-06", totalPaymentVnd: 2_160_000 },
          ],
        },
      }),
    ).rejects.toMatchObject({ code: "TARIFF_UNAPPROVED", status: 503 });
    expect(await prisma.calculation.count()).toBe(0);
  });

  it("production cũng chặn biểu giá chưa duyệt khi khách nhập kWh trực tiếp", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(
      services.calculations.create(validCustomerCalculationInput),
    ).rejects.toMatchObject({ code: "TARIFF_UNAPPROVED", status: 503 });
    expect(await prisma.calculation.count()).toBe(0);
  });

  it("từ chối OCR chưa có pipeline tin cậy và không ghi DB", async () => {
    await expect(
      services.calculations.create({
        ...validCustomerCalculationInput,
        energy: {
          method: "invoice_ocr",
          uploadId: "upload-fixture-unconfirmed",
          extractionVersion: "pending",
          observations: [
            {
              period: "2026-06",
              valueKwh: 333.33,
              customerConfirmed: false,
            },
          ],
        },
      }),
    ).rejects.toMatchObject({ code: "OCR_NOT_CONFIRMED", status: 422 });

    await expect(
      services.calculations.create({
        ...validCustomerCalculationInput,
        energy: {
          method: "invoice_ocr",
          uploadId: "upload-fixture-1",
          extractionVersion: "pending",
          observations: [],
        },
      }),
    ).rejects.toMatchObject({
      code: "OCR_PIPELINE_NOT_AVAILABLE",
      status: 422,
    });
    expect(await prisma.calculation.count()).toBe(0);
  });

  it("chặn dữ liệu DEMO trong production mà không lưu calculation", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const mutableTariff = QD1279_RESIDENTIAL_TARIFF as unknown as {
      status: "draft" | "verified";
      approvalStatus: "requires_internal_approval" | "approved";
    };
    const previousStatus = mutableTariff.status;
    const previousApprovalStatus = mutableTariff.approvalStatus;
    mutableTariff.status = "verified";
    mutableTariff.approvalStatus = "approved";

    try {
      await expect(
        services.calculations.create(validCalculationInput),
      ).rejects.toMatchObject({
        code: "CALCULATION_DATA_NOT_VERIFIED",
        status: 503,
      });
      expect(await prisma.calculation.count()).toBe(0);
    } finally {
      mutableTariff.status = previousStatus;
      mutableTariff.approvalStatus = previousApprovalStatus;
    }
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
      inputSummary: expectedLegacyInputSummary,
    });
  });

  it("tự xóa snapshot quá hạn chưa có lead nhưng giữ hồ sơ đã được khách gửi", async () => {
    const unlinked = await services.calculations.create(validCalculationInput);
    const linked = await services.calculations.create(validCalculationInput);
    await services.leads.create({
      fullName: "Nguyễn Văn An",
      phone: "0901234567",
      preferredContactTime: "anytime",
      calculationId: linked.calculationId,
    });
    const expiredAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1_000);
    await prisma.calculation.updateMany({ data: { createdAt: expiredAt } });

    await services.calculations.create(validCalculationInput);

    expect(
      await prisma.calculation.findUnique({
        where: { id: unlinked.calculationId },
      }),
    ).toBeNull();
    expect(
      await prisma.calculation.findUnique({
        where: { id: linked.calculationId },
      }),
    ).not.toBeNull();
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
    const basePackage = DEFAULT_SOLAR_PACKAGES[0];
    const created = await services.packages.create({
      code: "CUSTOM-4KWP",
      name: "Gói tùy chỉnh 4 kWp",
      description: basePackage.description,
      priceVnd: basePackage.priceVnd,
      capacityKwp: 4,
      baseMonthlyGenerationKwh: basePackage.baseMonthlyGenerationKwh,
      requiredRoofAreaM2: basePackage.requiredRoofAreaM2,
      systemType: basePackage.systemType,
      electricalPhase: basePackage.electricalPhase,
      batteryCapacityKwh: basePackage.batteryCapacityKwh,
      equipmentSummary: basePackage.equipmentSummary,
      panelBrand: basePackage.panelBrand,
      panelModel: basePackage.panelModel,
      inverterBrand: basePackage.inverterBrand,
      inverterModel: basePackage.inverterModel,
      panelWarrantyYears: basePackage.panelWarrantyYears,
      inverterWarrantyYears: basePackage.inverterWarrantyYears,
      active: basePackage.active,
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
      sourceSnapshot: {
        packages: Array<{ id: string; priceVnd: number }>;
      };
    };
    const storedBeforePackage = storedBeforeResult.comparedPackages.find(
      (item) => item.packageId === "package-1",
    );
    const storedBeforePackageInput =
      storedBeforeResult.sourceSnapshot.packages.find(
        (item) => item.id === "package-1",
      );

    expect(afterPackage?.paybackYears).not.toBe(beforePackage?.paybackYears);
    expect(after.metadata.dataVersions.packageCatalog).not.toBe(
      before.metadata.dataVersions.packageCatalog,
    );
    expect(storedBeforePackage?.paybackYears).toBeCloseTo(
      beforePackage?.paybackYears ?? 0,
      10,
    );
    expect(storedBeforePackageInput?.priceVnd).toBe(30_000_000);
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
    expect(detail.calculation.result.inputSummary).toMatchObject(
      expectedLegacyInputSummary,
    );
  });
});
