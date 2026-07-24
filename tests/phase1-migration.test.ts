import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

const legacyMigrationPaths = [
  "../prisma/migrations/20260720054649_init/migration.sql",
  "../prisma/migrations/20260720170000_add_electricity_type/migration.sql",
  "../prisma/migrations/20260722120000_add_data_governance/migration.sql",
  "../prisma/migrations/20260722123000_backfill_governance_sources/migration.sql",
].map((migrationPath) => new URL(migrationPath, import.meta.url));

const phase1MigrationPath = new URL(
  "../prisma/migrations/20260722130000_phase1_customer_input/migration.sql",
  import.meta.url,
);

describe("Phase 1 customer input migration", () => {
  let databaseDirectory: string | undefined;

  afterEach(async () => {
    if (databaseDirectory) {
      await rm(databaseDirectory, { recursive: true, force: true });
      databaseDirectory = undefined;
    }
  });

  it("giữ calculation cũ và khóa ngoại Lead khi cho phép chưa biết diện tích mái", async () => {
    databaseDirectory = await mkdtemp(
      path.join(tmpdir(), "solar-phase1-migration-"),
    );
    const databasePath = path.join(databaseDirectory, "test.db");
    const sqlite = new DatabaseSync(databasePath);

    try {
      for (const migrationPath of legacyMigrationPaths) {
        sqlite.exec(await readFile(migrationPath, "utf8"));
      }

      sqlite.exec(`
        INSERT INTO "SolarPackage" (
          "id", "code", "name", "description", "priceVnd", "capacityKwp",
          "baseMonthlyGenerationKwh", "requiredRoofAreaM2", "systemType",
          "batteryCapacityKwh", "equipmentSummary", "panelBrand", "panelModel",
          "inverterBrand", "inverterModel", "panelWarrantyYears",
          "inverterWarrantyYears", "active", "displayOrder", "updatedAt"
        ) VALUES (
          'package-legacy', 'LEGACY', 'Legacy', 'Legacy package', 10000000, 3,
          300, 20, 'GRID_TIED', 0, 'Legacy', 'Legacy', 'Legacy', 'Legacy',
          'Legacy', 10, 10, true, 1, CURRENT_TIMESTAMP
        );

        INSERT INTO "Calculation" (
          "id", "monthlyBill", "electricityType", "province",
          "daytimeUsageLevel", "roofAreaM2", "backupRequired",
          "recommendedPackageId", "resultJson"
        ) VALUES (
          'calculation-legacy', 2000000, 'RESIDENTIAL', 'ho-chi-minh',
          'HIGH', 30, false, 'package-legacy', '{}'
        );

        INSERT INTO "Lead" (
          "id", "fullName", "phone", "preferredContactTime",
          "calculationId", "updatedAt"
        ) VALUES (
          'lead-legacy', 'Nguyễn Văn An', '0901234567', 'morning',
          'calculation-legacy', CURRENT_TIMESTAMP
        );
      `);

      sqlite.exec(await readFile(phase1MigrationPath, "utf8"));

      const calculation = sqlite
        .prepare(`
          SELECT "inputContractVersion", "energyInputSource",
                 "reportedAmountVnd", "reportedAmountBasis",
                 "inputMonthCount", "roofAreaKnown", "roofAreaM2",
                 "normalizedMonthlyConsumptionKwh"
          FROM "Calculation"
          WHERE "id" = 'calculation-legacy'
        `)
        .get();
      const lead = sqlite
        .prepare(`SELECT "calculationId" FROM "Lead" WHERE "id" = 'lead-legacy'`)
        .get();
      const roofColumn = sqlite
        .prepare(`PRAGMA table_info("Calculation")`)
        .all()
        .find((column) => column.name === "roofAreaM2");

      expect(calculation).toMatchObject({
        inputContractVersion: "legacy-v1",
        energyInputSource: "legacy_money",
        reportedAmountVnd: 2_000_000,
        reportedAmountBasis: "energy_charge_before_vat",
        inputMonthCount: 1,
        roofAreaKnown: 1,
        roofAreaM2: 30,
        normalizedMonthlyConsumptionKwh: null,
      });
      expect(lead).toMatchObject({ calculationId: "calculation-legacy" });
      expect(roofColumn).toMatchObject({ notnull: 0 });
      expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([]);

      sqlite.exec(`
        UPDATE "Calculation"
        SET "roofAreaKnown" = false, "roofAreaM2" = NULL
        WHERE "id" = 'calculation-legacy';
      `);
      expect(
        sqlite
          .prepare(
            `SELECT "roofAreaKnown", "roofAreaM2" FROM "Calculation" WHERE "id" = 'calculation-legacy'`,
          )
          .get(),
      ).toMatchObject({ roofAreaKnown: 0, roofAreaM2: null });
      expect(() =>
        sqlite.exec(
          `DELETE FROM "Calculation" WHERE "id" = 'calculation-legacy'`,
        ),
      ).toThrow();
    } finally {
      sqlite.close();
    }
  });
});
