import "dotenv/config";

import { PrismaClient, DataStatus, type Prisma } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

import provinces from "./province-coordinates.json";
import {
  assertUniqueProvinceCoordinates,
  assertValidIrradianceFactor,
} from "../src/lib/province-irradiance-validation";

const NASA_POWER_BASE =
  "https://power.larc.nasa.gov/api/temporal/monthly/point";
const REQUEST_DELAY_MS = 500;
const REQUEST_TIMEOUT_MS = 20_000;
const REFERENCE_PROVINCE_CODE = "ho-chi-minh";
const DATA_SOURCE =
  "NASA POWER / POWER Single Point Monthly (ALLSKY_SFC_SW_DWN)";
const DATA_VERSION = `nasa-power-province-factors-${new Date().toISOString().split("T")[0]}`;

type ProvinceCoordinate = {
  code: string;
  name: string;
  lat: number;
  lon: number;
};

type NASA_POWERMonthlyResponse = {
  properties: {
    parameter: {
      ALLSKY_SFC_SW_DWN: Record<string, number>;
    };
  };
};

const db = new PrismaClient();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveDatabasePath(databaseUrl: string): string {
  // SQLite URL examples: file:./dev.db, file:/data/dev.db
  const stripped = databaseUrl.replace(/^file:/, "");
  const candidates: string[] = [];

  if (path.isAbsolute(stripped)) {
    candidates.push(stripped);
  } else {
    candidates.push(path.resolve(stripped));
    candidates.push(path.resolve("prisma", stripped));
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(
    `Database file not found. Tried: ${candidates.join(", ")}`,
  );
}

async function backupDatabase(dbPath: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${dbPath}.backup-${timestamp}`;
  const escapedBackupPath = backupPath.replace(/'/g, "''");
  await db.$executeRawUnsafe(`VACUUM INTO '${escapedBackupPath}'`);
  return backupPath;
}

async function fetchYearlyGhi(lat: number, lon: number): Promise<number> {
  const url = `${NASA_POWER_BASE}?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${lon}&latitude=${lat}&start=2020&end=2024&format=JSON`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`NASA POWER HTTP ${response.status} at ${lat},${lon}`);
    }

    const data = (await response.json()) as NASA_POWERMonthlyResponse;
    const values = data.properties.parameter.ALLSKY_SFC_SW_DWN;
    const annualKeys = Object.keys(values).filter((key) => key.endsWith("13"));

    const annualDailies: number[] = [];
    for (const key of annualKeys) {
      const value = values[key];
      if (value === -999 || !Number.isFinite(value)) continue;
      annualDailies.push(value);
    }

    if (annualDailies.length === 0) {
      throw new Error(`No valid annual GHI data at ${lat},${lon}`);
    }

    const averageDaily =
      annualDailies.reduce((sum, value) => sum + value, 0) /
      annualDailies.length;
    return averageDaily * 365;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`NASA POWER request timed out at ${lat},${lon}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function buildProvinceInput(params: {
  province: ProvinceCoordinate;
  factor: number;
  yearlyGhi: number;
  displayOrder: number;
  markVerified: boolean;
}): Prisma.ProvinceFactorCreateInput {
  const { province, factor, yearlyGhi, displayOrder, markVerified } = params;
  const now = new Date();

  return {
    code: province.code,
    name: province.name,
    factor,
    displayOrder,
    active: true,
    dataStatus: markVerified ? DataStatus.VERIFIED : DataStatus.DRAFT,
    dataVersion: DATA_VERSION,
    sourceReference: `${DATA_SOURCE}; yearly GHI ${yearlyGhi.toFixed(2)} kWh/m² from lat=${province.lat}, lon=${province.lon}`,
    dataOwner: "NASA POWER / auto-sync script",
    effectiveFrom: now,
    effectiveTo: null,
    approvedBy: markVerified ? "sync-province-irradiance" : null,
    approvedAt: markVerified ? now : null,
  };
}

async function main() {
  const markVerified = process.argv.includes("--mark-verified");
  const dryRun = process.argv.includes("--dry-run");
  const skipBackup = process.argv.includes("--skip-backup");

  assertUniqueProvinceCoordinates(provinces);

  const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  const dbPath = resolveDatabasePath(databaseUrl);

  console.log(`Database path: ${dbPath}`);

  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file not found: ${dbPath}`);
  }

  if (!dryRun && !skipBackup) {
    const backupPath = await backupDatabase(dbPath);
    console.log(`Database backed up to: ${backupPath}`);
  }

  const referenceProvince = provinces.find(
    (province) => province.code === REFERENCE_PROVINCE_CODE,
  );
  if (!referenceProvince) {
    throw new Error(`Reference province ${REFERENCE_PROVINCE_CODE} not found`);
  }

  console.log(
    `Fetching reference GHI for ${referenceProvince.name} (${referenceProvince.code})...`,
  );
  const referenceGhi = await fetchYearlyGhi(
    referenceProvince.lat,
    referenceProvince.lon,
  );
  console.log(
    `Reference yearly GHI: ${referenceGhi.toFixed(2)} kWh/m² (factor = 1.0000)`,
  );

  // Small delay before processing provinces to be polite to the API
  await sleep(REQUEST_DELAY_MS);

  const existingProvinces = await db.provinceFactor.findMany();
  const existingByCode = new Map(
    existingProvinces.map((province) => [province.code, province]),
  );
  const maxDisplayOrder = existingProvinces.reduce(
    (max, province) => Math.max(max, province.displayOrder),
    0,
  );

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (let index = 0; index < provinces.length; index++) {
    const province = provinces[index];
    try {
      const yearlyGhi = await fetchYearlyGhi(province.lat, province.lon);
      const factor = yearlyGhi / referenceGhi;

      assertValidIrradianceFactor(factor);

      const existing = existingByCode.get(province.code);
      const displayOrder =
        existing?.displayOrder ?? maxDisplayOrder + index + 1;

      const input = buildProvinceInput({
        province,
        factor,
        yearlyGhi,
        displayOrder,
        markVerified: false,
      });

      if (dryRun) {
        console.log(
          `[DRY RUN] ${province.code}: ${province.name} | yearly GHI ${yearlyGhi.toFixed(2)} kWh/m² | factor ${factor.toFixed(4)}`,
        );
      } else {
        await db.provinceFactor.upsert({
          where: { code: province.code },
          update: input,
          create: input,
        });
        console.log(
          `${existing ? "Updated" : "Created"} ${province.code}: factor ${factor.toFixed(4)}`,
        );
      }

      if (existing) {
        updated++;
      } else {
        created++;
      }
    } catch (error) {
      console.error(`Failed ${province.code} (${province.name}):`, error);
      failed++;
    }

    if (index < provinces.length - 1) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  console.log(
    `\nDone. Created: ${created}, Updated: ${updated}, Failed: ${failed}`,
  );
  if (failed > 0) {
    process.exitCode = 1;
    console.error(
      "Partial sync: dữ liệu đã ghi chỉ ở trạng thái DRAFT; không có dữ liệu nào được tự đánh dấu VERIFIED.",
    );
    return;
  }
  if (markVerified && !dryRun) {
    await db.provinceFactor.updateMany({
      where: { dataVersion: DATA_VERSION },
      data: {
        dataStatus: DataStatus.VERIFIED,
        approvedBy: "sync-province-irradiance",
        approvedAt: new Date(),
      },
    });
    console.log(
      "Provinces marked as VERIFIED. Production calculations will use this data.",
    );
  } else if (markVerified) {
    console.log("Dry run completed. No province status was changed.");
  } else {
    console.log(
      "Provinces marked as DRAFT. Run with --mark-verified after review, or approve via admin.",
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error("Script failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
