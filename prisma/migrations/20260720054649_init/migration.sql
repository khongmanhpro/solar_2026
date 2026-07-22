-- CreateTable
CREATE TABLE "SolarPackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceVnd" INTEGER NOT NULL,
    "capacityKwp" REAL NOT NULL,
    "baseMonthlyGenerationKwh" REAL NOT NULL,
    "requiredRoofAreaM2" REAL NOT NULL,
    "systemType" TEXT NOT NULL,
    "batteryCapacityKwh" REAL NOT NULL DEFAULT 0,
    "equipmentSummary" TEXT NOT NULL,
    "panelBrand" TEXT NOT NULL,
    "panelModel" TEXT NOT NULL,
    "inverterBrand" TEXT NOT NULL,
    "inverterModel" TEXT NOT NULL,
    "panelWarrantyYears" INTEGER NOT NULL,
    "inverterWarrantyYears" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CalculationSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "averageElectricityPriceVndPerKwh" INTEGER NOT NULL,
    "batteryRoundTripEfficiency" REAL NOT NULL,
    "batteryDailyCycleFactor" REAL NOT NULL,
    "lowEstimateFactor" REAL NOT NULL,
    "highEstimateFactor" REAL NOT NULL,
    "systemLifetimeYears" INTEGER NOT NULL,
    "maintenanceRatePerYear" REAL NOT NULL,
    "daytimeLowRatio" REAL NOT NULL,
    "daytimeMediumRatio" REAL NOT NULL,
    "daytimeHighRatio" REAL NOT NULL,
    "zaloUrl" TEXT NOT NULL,
    "hotline" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProvinceFactor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "factor" REAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Calculation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monthlyBill" INTEGER NOT NULL,
    "province" TEXT NOT NULL,
    "daytimeUsageLevel" TEXT NOT NULL,
    "roofAreaM2" REAL NOT NULL,
    "backupRequired" BOOLEAN NOT NULL,
    "recommendedPackageId" TEXT,
    "resultJson" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Calculation_recommendedPackageId_fkey" FOREIGN KEY ("recommendedPackageId") REFERENCES "SolarPackage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "preferredContactTime" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "calculationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_calculationId_fkey" FOREIGN KEY ("calculationId") REFERENCES "Calculation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SolarPackage_code_key" ON "SolarPackage"("code");

-- CreateIndex
CREATE INDEX "SolarPackage_active_displayOrder_idx" ON "SolarPackage"("active", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProvinceFactor_code_key" ON "ProvinceFactor"("code");

-- CreateIndex
CREATE INDEX "ProvinceFactor_active_displayOrder_idx" ON "ProvinceFactor"("active", "displayOrder");

-- CreateIndex
CREATE INDEX "Calculation_createdAt_idx" ON "Calculation"("createdAt");

-- CreateIndex
CREATE INDEX "Calculation_recommendedPackageId_idx" ON "Calculation"("recommendedPackageId");

-- CreateIndex
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_calculationId_idx" ON "Lead"("calculationId");
