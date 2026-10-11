-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "preferredContactTime" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "calculationId" TEXT NOT NULL,
    "selectedPackageId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_calculationId_fkey" FOREIGN KEY ("calculationId") REFERENCES "Calculation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Lead_selectedPackageId_fkey" FOREIGN KEY ("selectedPackageId") REFERENCES "SolarPackage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("address", "calculationId", "createdAt", "fullName", "id", "note", "phone", "preferredContactTime", "status", "updatedAt") SELECT "address", "calculationId", "createdAt", "fullName", "id", "note", "phone", "preferredContactTime", "status", "updatedAt" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");
CREATE INDEX "Lead_calculationId_idx" ON "Lead"("calculationId");
CREATE INDEX "Lead_selectedPackageId_idx" ON "Lead"("selectedPackageId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

