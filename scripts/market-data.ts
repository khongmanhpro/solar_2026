import "dotenv/config";

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  DataStatus as PrismaDataStatus,
  ElectricalPhase as PrismaElectricalPhase,
  PrismaClient,
  SolarSystemType,
} from "@prisma/client";
import readExcelFile from "read-excel-file/node";

import {
  assessDraftPackageImport,
  buildMarketDataCandidate,
  buildTrialMarketRelease,
  hasBlockingImportIssues,
  TRIAL_PACKAGE_DATA_VERSION_PREFIX,
  type WorkbookCell,
} from "../src/lib/market-data-import";

const command = process.argv[2];
const workbookPath = process.argv[3];

if (!command || !workbookPath || !["validate", "preview", "preview-trial", "build-candidate", "import-draft", "import-trial"].includes(command)) {
  console.error("Cách dùng: tsx scripts/market-data.ts <validate|preview|preview-trial|build-candidate|import-draft|import-trial> <file.xlsx> [output.json|--confirm-draft-import|--confirm-trial-import]");
  process.exitCode = 2;
} else {
  const resolvedWorkbookPath = path.resolve(workbookPath);
  const workbookBytes = await fs.readFile(resolvedWorkbookPath);
  const sourceSha256 = createHash("sha256").update(workbookBytes).digest("hex");
  const sheets = await readExcelFile(resolvedWorkbookPath);
  const bundle = buildMarketDataCandidate(
    sheets.map(({ sheet, data }) => ({ sheet, data: data as WorkbookCell[][] })),
    { fileName: path.basename(resolvedWorkbookPath), sourceSha256 },
  );
  const errors = bundle.issues.filter((issue) => issue.severity === "error");
  const warnings = bundle.issues.filter((issue) => issue.severity === "warning");
  const isDatabaseImport = command === "import-draft" || command === "import-trial";
  const isTrialImport = command === "import-trial";
  const summary = {
    datasetVersion: bundle.datasetVersion,
    sourceSha256: bundle.source.sha256,
    packages: bundle.readiness.packageCount,
    publishedPackages: bundle.readiness.publishedPackageCount,
    currentEngineCompatiblePackages: bundle.readiness.currentEngineCompatiblePackageCount,
    equipment: bundle.readiness.equipmentCount,
    serviceRegions: bundle.readiness.serviceRegionCount,
    supplierPrices: bundle.readiness.supplierPriceCount,
    financialAssumptions: bundle.readiness.financialAssumptionCount,
    approvedRegionalYield: bundle.readiness.approvedRegionalYieldCount,
    passedAcceptanceCases: bundle.readiness.passedAcceptanceCaseCount,
    productionReady: false,
    blockers: bundle.readiness.productionBlockers,
    errors: errors.length,
    warnings: warnings.length,
    impact: {
      ...bundle.impact,
      databaseWrites: isDatabaseImport,
      changesCalculationResults: isTrialImport,
      safeNextAction: isTrialImport
        ? "Tạo backup rồi upsert catalog trial DRAFT; chỉ development có env toggle mới sử dụng."
        : bundle.impact.safeNextAction,
    },
  };

  if (command === "preview") {
    console.log(JSON.stringify({ ...summary, packagePreview: bundle.packages.map((item) => ({ code: item.code, priceVnd: item.referencePriceVnd, status: item.sourceStatus, published: item.sourcePublished, currentEngineCompatible: item.currentEngineCompatible, blockers: item.currentEngineBlockers })) }, null, 2));
  } else if (command === "preview-trial") {
    const trialRelease = buildTrialMarketRelease(bundle);
    console.log(
      JSON.stringify(
        {
          ...summary,
          trialRelease: {
            dataVersion: trialRelease.dataVersion,
            derivationNotes: trialRelease.derivationNotes,
            calculationAssumptions:
              trialRelease.calculationAssumptions,
            packages: trialRelease.packages,
          },
        },
        null,
        2,
      ),
    );
  } else {
    console.log(JSON.stringify(summary, null, 2));
  }

  if (hasBlockingImportIssues(bundle)) {
    console.error(JSON.stringify(errors, null, 2));
    process.exitCode = 1;
  } else if (command === "build-candidate") {
    const outputPath = path.resolve(process.argv[4] ?? "data/market-data-candidate.json");
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
    console.log(`Đã tạo bundle ứng viên: ${outputPath}`);
  } else if (command === "import-draft") {
    const sourcePreflight = assessDraftPackageImport(bundle);
    if (!sourcePreflight.allowed) {
      throw new Error(
        `Import bị chặn trước khi kết nối cơ sở dữ liệu: ${sourcePreflight.blockers.join(" | ")}`,
      );
    }
    if (process.argv[4] !== "--confirm-draft-import") {
      throw new Error("Import cần cờ --confirm-draft-import sau khi đã review preview.");
    }
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl?.startsWith("file:")) {
      throw new Error("Import hiện chỉ hỗ trợ SQLite qua DATABASE_URL=file:...");
    }
    const stripped = databaseUrl.slice("file:".length);
    const databasePath = path.isAbsolute(stripped)
      ? stripped
      : path.resolve("prisma", stripped);
    const prisma = new PrismaClient();
    try {
      const existingCodes = (
        await prisma.solarPackage.findMany({ select: { code: true } })
      ).map((item) => item.code);
      const preflight = assessDraftPackageImport(bundle, existingCodes);
      if (!preflight.allowed) {
        throw new Error(`Import bị chặn: ${preflight.blockers.join(" | ")}`);
      }
      const backupPath = `${databasePath}.backup-before-${bundle.datasetVersion}`;
      await fs.copyFile(databasePath, backupPath);
      await prisma.$transaction(
        preflight.importablePackages.map((item) =>
          prisma.solarPackage.create({
            data: {
              code: item.code,
              name: item.name,
              description: item.description,
              priceVnd: Math.round(item.referencePriceVnd!),
              capacityKwp: item.capacityKwp!,
              baseMonthlyGenerationKwh: item.baseMonthlyGenerationKwh!,
              requiredRoofAreaM2: item.requiredRoofAreaM2!,
              systemType:
                item.systemType === "hybrid"
                  ? SolarSystemType.HYBRID
                  : SolarSystemType.GRID_TIED,
              electricalPhase:
                item.phase === "three-phase"
                  ? PrismaElectricalPhase.THREE_PHASE
                  : PrismaElectricalPhase.SINGLE_PHASE,
              batteryCapacityKwh: item.batteryNominalKwh,
              equipmentSummary: item.equipmentSummary,
              panelBrand: item.panelBrand,
              panelModel: item.panelModel,
              inverterBrand: item.inverterBrand,
              inverterModel: item.inverterModel,
              panelWarrantyYears: Math.round(item.panelWarrantyYears ?? 0),
              inverterWarrantyYears: Math.round(
                item.inverterWarrantyYears ?? 0,
              ),
              active: false,
              displayOrder: item.displayOrder,
              dataStatus: PrismaDataStatus.DRAFT,
              dataVersion: bundle.datasetVersion,
              sourceReference: [
                `sha256:${bundle.source.sha256}`,
                item.sourceReference,
              ]
                .filter(Boolean)
                .join("; "),
              dataOwner: "Kinh doanh + kỹ thuật — chờ phê duyệt",
              effectiveFrom: item.effectiveFrom
                ? new Date(item.effectiveFrom)
                : null,
              effectiveTo: item.effectiveTo ? new Date(item.effectiveTo) : null,
              approvedBy: null,
              approvedAt: null,
            },
          }),
        ),
      );
      console.log(
        `Đã nhập ${preflight.importablePackages.length} gói ở trạng thái DRAFT, active=false. Backup: ${backupPath}`,
      );
    } finally {
      await prisma.$disconnect();
    }
  } else if (command === "import-trial") {
    const trialRelease = buildTrialMarketRelease(bundle);
    if (process.argv[4] !== "--confirm-trial-import") {
      throw new Error(
        "Import thử nghiệm cần cờ --confirm-trial-import sau khi review preview-trial.",
      );
    }
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl?.startsWith("file:")) {
      throw new Error(
        "Import thử nghiệm hiện chỉ hỗ trợ SQLite qua DATABASE_URL=file:...",
      );
    }
    const stripped = databaseUrl.slice("file:".length);
    const databasePath = path.isAbsolute(stripped)
      ? stripped
      : path.resolve("prisma", stripped);
    const prisma = new PrismaClient();
    try {
      const existingPackages = await prisma.solarPackage.findMany({
        where: {
          code: { in: trialRelease.packages.map((item) => item.code) },
        },
        select: { code: true, dataVersion: true },
      });
      const protectedConflicts = existingPackages.filter(
        (item) =>
          !item.dataVersion.startsWith(TRIAL_PACKAGE_DATA_VERSION_PREFIX),
      );
      if (protectedConflicts.length > 0) {
        throw new Error(
          `Import thử nghiệm không được ghi đè dữ liệu ngoài trial: ${protectedConflicts.map((item) => item.code).join(", ")}.`,
        );
      }

      const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
      const backupPath = `${databasePath}.backup-before-${trialRelease.dataVersion}-${timestamp}`;
      await fs.copyFile(databasePath, backupPath);
      await prisma.$transaction(
        trialRelease.packages.map((item) => {
          const data = {
            name: item.name,
            description: item.description,
            priceVnd: item.priceVnd,
            capacityKwp: item.capacityKwp,
            baseMonthlyGenerationKwh:
              item.baseMonthlyGenerationKwh,
            requiredRoofAreaM2: item.requiredRoofAreaM2,
            systemType:
              item.systemType === "hybrid"
                ? SolarSystemType.HYBRID
                : SolarSystemType.GRID_TIED,
            electricalPhase:
              item.electricalPhase === "three-phase"
                ? PrismaElectricalPhase.THREE_PHASE
                : PrismaElectricalPhase.SINGLE_PHASE,
            batteryCapacityKwh: item.batteryCapacityKwh,
            equipmentSummary: item.equipmentSummary,
            panelBrand: item.panelBrand,
            panelModel: item.panelModel,
            inverterBrand: item.inverterBrand,
            inverterModel: item.inverterModel,
            panelWarrantyYears: item.panelWarrantyYears,
            inverterWarrantyYears: item.inverterWarrantyYears,
            active: true,
            displayOrder: item.displayOrder,
            dataStatus: PrismaDataStatus.DRAFT,
            dataVersion: trialRelease.dataVersion,
            sourceReference: item.sourceReference,
            dataOwner: "Dữ liệu thử nghiệm — kinh doanh + kỹ thuật",
            effectiveFrom: item.effectiveFrom
              ? new Date(item.effectiveFrom)
              : null,
            effectiveTo: item.effectiveTo
              ? new Date(item.effectiveTo)
              : null,
            approvedBy: null,
            approvedAt: null,
          };
          return prisma.solarPackage.upsert({
            where: { code: item.code },
            update: data,
            create: { code: item.code, ...data },
          });
        }),
      );
      console.log(
        `Đã kích hoạt ${trialRelease.packages.length} gói thử nghiệm DRAFT. Backup: ${backupPath}`,
      );
      console.log(
        "Đặt TRIAL_MARKET_DATA_ENABLED=true trong development để API/engine chọn catalog này.",
      );
    } finally {
      await prisma.$disconnect();
    }
  }
}
