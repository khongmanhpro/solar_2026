import "dotenv/config";

import { PrismaClient, DataStatus } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

import provinces from "./province-coordinates.json";
import {
  fetchPvgisMonthlyYield,
  PVGIS_API_VERSION,
  PVGIS_SYSTEM_LOSS_PERCENT,
} from "../src/lib/pvgis-client";

const REQUEST_DELAY_MS = 500;
const REQUEST_RETRIES = 2;
const REFERENCE_PROVINCE_CODE = "ho-chi-minh";
const DATA_VERSION = `pvgis-pvcalc-v${PVGIS_API_VERSION}-${new Date().toISOString().slice(0, 10)}`;
const COORDINATE_FALLBACK_OFFSETS = [
  [0, 0],
  [0.003333, 0.033333],
  [0, -0.05],
  [0.05, 0],
  [-0.05, 0],
  [0, 0.05],
] as const;

type ProvinceCoordinate = {
  code: string;
  name: string;
  lat: number;
  lon: number;
};

const db = new PrismaClient();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getArgument(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function resolveDatabasePath(databaseUrl: string): string {
  const stripped = databaseUrl.replace(/^file:/, "");
  const candidates = path.isAbsolute(stripped)
    ? [stripped]
    : [path.resolve(stripped), path.resolve("prisma", stripped)];

  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  if (!existing) {
    throw new Error(`Database file not found. Tried: ${candidates.join(", ")}`);
  }
  return existing;
}

async function backupDatabase(dbPath: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${dbPath}.backup-${timestamp}`;
  const escapedBackupPath = backupPath.replace(/'/g, "''");
  await db.$executeRawUnsafe(`VACUUM INTO '${escapedBackupPath}'`);
  return backupPath;
}

async function fetchWithRetry(province: ProvinceCoordinate) {
  let lastError: unknown;
  for (const [latitudeOffset, longitudeOffset] of COORDINATE_FALLBACK_OFFSETS) {
    const latitude = province.lat + latitudeOffset;
    const longitude = province.lon + longitudeOffset;

    for (let attempt = 0; attempt <= REQUEST_RETRIES; attempt++) {
      try {
        const result = await fetchPvgisMonthlyYield({ latitude, longitude });
        return {
          ...result,
          queriedLatitude: latitude,
          queriedLongitude: longitude,
          usedCoordinateFallback: latitudeOffset !== 0 || longitudeOffset !== 0,
        };
      } catch (error) {
        lastError = error;
        if (attempt < REQUEST_RETRIES) await sleep(1_000 * (attempt + 1));
      }
    }

    const isServerError =
      lastError instanceof Error && lastError.message.includes("PVGIS HTTP 5");
    if (!isServerError) break;
  }

  if (lastError instanceof Error && lastError.message.includes("PVGIS HTTP 5")) {
    throw new Error(
      `PVGIS không trả được dữ liệu tại ${province.lat},${province.lon} hoặc các điểm lân cận. ${lastError.message}`,
    );
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

type ProvinceYieldData = {
  factor: number;
  latitude: number;
  longitude: number;
  monthlyYieldKwhPerKwpJson: string;
  dataStatus: DataStatus;
  dataVersion: string;
  sourceReference: string;
  dataOwner: string;
  effectiveFrom: Date;
  effectiveTo: null;
  approvedBy: null;
  approvedAt: null;
};

function buildProvinceData(params: {
  province: ProvinceCoordinate;
  factor: number;
  monthlyYieldKwhPerKwp: number[];
  radiationDatabase: string;
  queriedLatitude: number;
  queriedLongitude: number;
  usedCoordinateFallback: boolean;
}): ProvinceYieldData {
  const {
    province,
    factor,
    monthlyYieldKwhPerKwp,
    radiationDatabase,
    queriedLatitude,
    queriedLongitude,
    usedCoordinateFallback,
  } = params;
  const now = new Date();
  const coordinateNote = usedCoordinateFallback
    ? `; fallback query lat=${queriedLatitude}, lon=${queriedLongitude}`
    : "";

  return {
    factor,
    latitude: province.lat,
    longitude: province.lon,
    monthlyYieldKwhPerKwpJson: JSON.stringify(monthlyYieldKwhPerKwp),
    dataStatus: DataStatus.DRAFT,
    dataVersion: DATA_VERSION,
    sourceReference: `PVGIS ${PVGIS_API_VERSION} PVcalc; radiation DB ${radiationDatabase}; peakpower=1 kWp; loss=${PVGIS_SYSTEM_LOSS_PERCENT}%; optimalangles=1; requested lat=${province.lat}, lon=${province.lon}${coordinateNote}`,
    dataOwner: "PVGIS / sync-province-pvgis.ts — cần kỹ thuật duyệt",
    effectiveFrom: now,
    effectiveTo: null,
    approvedBy: null,
    approvedAt: null,
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const skipBackup = process.argv.includes("--skip-backup");
  const selectedCode = getArgument("--province");
  const allProvinces = provinces as ProvinceCoordinate[];
  const selectedProvinces = selectedCode
    ? allProvinces.filter((province) => province.code === selectedCode)
    : allProvinces;

  if (selectedProvinces.length === 0) {
    throw new Error(`Không tìm thấy tỉnh/thành: ${selectedCode}`);
  }

  const referenceProvince = allProvinces.find(
    (province) => province.code === REFERENCE_PROVINCE_CODE,
  );
  if (!referenceProvince) throw new Error("Không có tỉnh tham chiếu Hồ Chí Minh.");

  console.log(
    `PVGIS ${PVGIS_API_VERSION} · ${apply ? "APPLY DRAFT" : "DRY RUN"} · ${selectedProvinces.length} tỉnh/thành`,
  );
  const reference = await fetchWithRetry(referenceProvince);
  console.log(
    `Reference ${referenceProvince.name}: ${reference.yearlyYieldKwhPerKwp.toFixed(2)} kWh/kWp/năm`,
  );

  if (apply && !skipBackup) {
    const databasePath = resolveDatabasePath(process.env.DATABASE_URL ?? "file:./dev.db");
    console.log(`Database backup: ${await backupDatabase(databasePath)}`);
  }

  const existingDisplayOrders = apply
    ? new Map(
        (
          await db.provinceFactor.findMany({
            select: { code: true, displayOrder: true },
          })
        ).map((province) => [province.code, province.displayOrder]),
      )
    : new Map<string, number>();

  let succeeded = 0;
  let failed = 0;
  for (const province of selectedProvinces) {
    try {
      const result = await fetchWithRetry(province);
      const factor = result.yearlyYieldKwhPerKwp / reference.yearlyYieldKwhPerKwp;

      if (apply) {
        const data = buildProvinceData({
          province,
          factor,
          monthlyYieldKwhPerKwp: result.monthlyYieldKwhPerKwp,
          radiationDatabase: result.radiationDatabase,
          queriedLatitude: result.queriedLatitude,
          queriedLongitude: result.queriedLongitude,
          usedCoordinateFallback: result.usedCoordinateFallback,
        });
        const defaultDisplayOrder = allProvinces.findIndex(
          (candidate) => candidate.code === province.code,
        ) + 1;

        await db.provinceFactor.upsert({
          where: { code: province.code },
          update: data,
          create: {
            ...data,
            code: province.code,
            name: province.name,
            active: true,
            displayOrder:
              existingDisplayOrders.get(province.code) ?? defaultDisplayOrder,
          },
        });
      }

      console.log(
        `${apply ? "Updated" : "[DRY RUN]"} ${province.code}: ${result.yearlyYieldKwhPerKwp.toFixed(2)} kWh/kWp/năm · factor ${factor.toFixed(4)} · tháng ${result.monthlyYieldKwhPerKwp.map((value) => value.toFixed(1)).join(", ")}`,
      );
      succeeded++;
    } catch (error) {
      console.error(`Failed ${province.code}:`, error);
      failed++;
    }
    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`Done. Succeeded: ${succeeded}, Failed: ${failed}`);
  if (failed > 0) process.exitCode = 1;
  if (!apply) {
    console.log("Chưa ghi database. Dùng --apply sau khi kỹ thuật duyệt dữ liệu PVGIS.");
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
