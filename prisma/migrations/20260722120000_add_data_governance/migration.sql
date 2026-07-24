-- All existing business data is intentionally backfilled as DEMO.
-- Nothing in this migration is promoted to VERIFIED automatically.

ALTER TABLE "SolarPackage" ADD COLUMN "dataStatus" TEXT NOT NULL DEFAULT 'DEMO';
ALTER TABLE "SolarPackage" ADD COLUMN "dataVersion" TEXT NOT NULL DEFAULT 'demo-package-catalog-2026-07-20';
ALTER TABLE "SolarPackage" ADD COLUMN "sourceReference" TEXT;
ALTER TABLE "SolarPackage" ADD COLUMN "dataOwner" TEXT;
ALTER TABLE "SolarPackage" ADD COLUMN "effectiveFrom" DATETIME;
ALTER TABLE "SolarPackage" ADD COLUMN "effectiveTo" DATETIME;
ALTER TABLE "SolarPackage" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "SolarPackage" ADD COLUMN "approvedAt" DATETIME;

ALTER TABLE "CalculationSetting" ADD COLUMN "dataStatus" TEXT NOT NULL DEFAULT 'DEMO';
ALTER TABLE "CalculationSetting" ADD COLUMN "dataVersion" TEXT NOT NULL DEFAULT 'demo-calculation-assumptions-2026-07-20';
ALTER TABLE "CalculationSetting" ADD COLUMN "sourceReference" TEXT;
ALTER TABLE "CalculationSetting" ADD COLUMN "dataOwner" TEXT;
ALTER TABLE "CalculationSetting" ADD COLUMN "effectiveFrom" DATETIME;
ALTER TABLE "CalculationSetting" ADD COLUMN "effectiveTo" DATETIME;
ALTER TABLE "CalculationSetting" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "CalculationSetting" ADD COLUMN "approvedAt" DATETIME;

ALTER TABLE "ProvinceFactor" ADD COLUMN "dataStatus" TEXT NOT NULL DEFAULT 'DEMO';
ALTER TABLE "ProvinceFactor" ADD COLUMN "dataVersion" TEXT NOT NULL DEFAULT 'demo-province-factors-2026-07-20';
ALTER TABLE "ProvinceFactor" ADD COLUMN "sourceReference" TEXT;
ALTER TABLE "ProvinceFactor" ADD COLUMN "dataOwner" TEXT;
ALTER TABLE "ProvinceFactor" ADD COLUMN "effectiveFrom" DATETIME;
ALTER TABLE "ProvinceFactor" ADD COLUMN "effectiveTo" DATETIME;
ALTER TABLE "ProvinceFactor" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "ProvinceFactor" ADD COLUMN "approvedAt" DATETIME;

ALTER TABLE "Calculation" ADD COLUMN "snapshotSchemaVersion" TEXT NOT NULL DEFAULT 'legacy-v1';
ALTER TABLE "Calculation" ADD COLUMN "algorithmVersion" TEXT NOT NULL DEFAULT 'legacy-unknown';
ALTER TABLE "Calculation" ADD COLUMN "algorithmFingerprint" TEXT NOT NULL DEFAULT 'legacy-unknown';
ALTER TABLE "Calculation" ADD COLUMN "dataVersion" TEXT NOT NULL DEFAULT 'legacy-unknown';
ALTER TABLE "Calculation" ADD COLUMN "dataVersions" JSONB;
ALTER TABLE "Calculation" ADD COLUMN "dataStatus" TEXT NOT NULL DEFAULT 'DEMO';

CREATE INDEX "Calculation_dataStatus_createdAt_idx"
ON "Calculation"("dataStatus", "createdAt");
