-- Phase 1 stores the customer's original input and the normalized kWh range.
-- Existing rows remain traceable as legacy pre-VAT money inputs.
-- Rebuilding the table is required by SQLite to make roofAreaM2 nullable.

PRAGMA foreign_keys=OFF;
PRAGMA defer_foreign_keys=ON;

BEGIN TRANSACTION;

CREATE TABLE "new_Calculation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inputContractVersion" TEXT NOT NULL DEFAULT 'legacy-v1',
    "energyInputSource" TEXT NOT NULL DEFAULT 'legacy_money',
    "reportedAmountVnd" INTEGER,
    "reportedAmountBasis" TEXT,
    "normalizedMonthlyConsumptionKwh" REAL,
    "consumptionLowerKwh" REAL,
    "consumptionUpperKwh" REAL,
    "inputMonthCount" INTEGER NOT NULL DEFAULT 1,
    "monthlyBill" INTEGER NOT NULL,
    "electricityType" TEXT NOT NULL DEFAULT 'RESIDENTIAL',
    "province" TEXT NOT NULL,
    "daytimeUsageLevel" TEXT NOT NULL,
    "roofAreaKnown" BOOLEAN NOT NULL DEFAULT true,
    "roofAreaM2" REAL,
    "backupRequired" BOOLEAN NOT NULL,
    "essentialLoadWatts" INTEGER,
    "backupHours" REAL,
    "recommendedPackageId" TEXT,
    "resultJson" JSONB NOT NULL,
    "snapshotSchemaVersion" TEXT NOT NULL DEFAULT 'legacy-v1',
    "algorithmVersion" TEXT NOT NULL DEFAULT 'legacy-unknown',
    "algorithmFingerprint" TEXT NOT NULL DEFAULT 'legacy-unknown',
    "dataVersion" TEXT NOT NULL DEFAULT 'legacy-unknown',
    "dataVersions" JSONB,
    "dataStatus" TEXT NOT NULL DEFAULT 'DEMO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Calculation_recommendedPackageId_fkey"
      FOREIGN KEY ("recommendedPackageId") REFERENCES "SolarPackage" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Calculation" (
    "id",
    "inputContractVersion",
    "energyInputSource",
    "reportedAmountVnd",
    "reportedAmountBasis",
    "inputMonthCount",
    "monthlyBill",
    "electricityType",
    "province",
    "daytimeUsageLevel",
    "roofAreaKnown",
    "roofAreaM2",
    "backupRequired",
    "recommendedPackageId",
    "resultJson",
    "snapshotSchemaVersion",
    "algorithmVersion",
    "algorithmFingerprint",
    "dataVersion",
    "dataVersions",
    "dataStatus",
    "createdAt"
)
SELECT
    "id",
    'legacy-v1',
    'legacy_money',
    "monthlyBill",
    'energy_charge_before_vat',
    1,
    "monthlyBill",
    "electricityType",
    "province",
    "daytimeUsageLevel",
    true,
    "roofAreaM2",
    "backupRequired",
    "recommendedPackageId",
    "resultJson",
    "snapshotSchemaVersion",
    "algorithmVersion",
    "algorithmFingerprint",
    "dataVersion",
    "dataVersions",
    "dataStatus",
    "createdAt"
FROM "Calculation";

DROP TABLE "Calculation";
ALTER TABLE "new_Calculation" RENAME TO "Calculation";

CREATE INDEX "Calculation_createdAt_idx" ON "Calculation"("createdAt");
CREATE INDEX "Calculation_recommendedPackageId_idx"
ON "Calculation"("recommendedPackageId");
CREATE INDEX "Calculation_dataStatus_createdAt_idx"
ON "Calculation"("dataStatus", "createdAt");

COMMIT;

PRAGMA defer_foreign_keys=OFF;
PRAGMA foreign_keys=ON;
