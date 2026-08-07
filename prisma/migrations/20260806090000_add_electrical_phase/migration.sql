-- SQLite stores Prisma enums as TEXT. Package phase is required for all
-- current catalog entries; historical calculations predate collection.
ALTER TABLE "SolarPackage" ADD COLUMN "electricalPhase" TEXT NOT NULL DEFAULT 'SINGLE_PHASE';

ALTER TABLE "Calculation" ADD COLUMN "electricalPhase" TEXT;

-- The old catalog did not carry a phase field. All prior package records are
-- safely backfilled by the default above, except the two known 3-phase codes.
UPDATE "SolarPackage"
SET "electricalPhase" = 'THREE_PHASE'
WHERE "code" IN ('HOME-HY-3P-8K-16K', 'HOME-HY-3P-12K-16K');
