-- Existing calculations were created before tariff selection existed.
-- The MVP only supported residential usage, so the backfill is unambiguous.
ALTER TABLE "Calculation"
ADD COLUMN "electricityType" TEXT NOT NULL DEFAULT 'RESIDENTIAL';
