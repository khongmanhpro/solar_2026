-- Preserve legacy rows without pretending their original sources are known.
-- They remain DEMO and must be explicitly reviewed before production use.

UPDATE "SolarPackage"
SET "sourceReference" = 'Legacy database before governance migration; source not yet supplied',
    "dataOwner" = 'Chưa chỉ định'
WHERE "sourceReference" IS NULL OR "dataOwner" IS NULL;

UPDATE "CalculationSetting"
SET "sourceReference" = 'Legacy database before governance migration; source not yet supplied',
    "dataOwner" = 'Chưa chỉ định'
WHERE "sourceReference" IS NULL OR "dataOwner" IS NULL;

UPDATE "ProvinceFactor"
SET "sourceReference" = 'Legacy database before governance migration; source not yet supplied',
    "dataOwner" = 'Chưa chỉ định'
WHERE "sourceReference" IS NULL OR "dataOwner" IS NULL;
