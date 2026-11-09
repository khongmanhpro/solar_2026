/**
 * Dev-only sanity check: print how packages rank for a few reference
 * households, using the same repositories and engine as the live app.
 *
 *   npx tsx scripts/review-rank-check.ts
 */
import { PrismaClient } from "@prisma/client";
import { recommendSolarPackages } from "@/lib/solar-recommendation";
import {
  CalculationSettingsRepository,
  ProvinceFactorRepository,
  SolarPackageRepository,
} from "@/server/repositories";
import type { SolarCalculationInput } from "@/types/solar";

const prisma = new PrismaClient();

const SCENARIOS = [
  { label: "HCM 300 kWh, no backup", province: "ho-chi-minh", kwh: 300 },
  { label: "HCM 491 kWh, no backup", province: "ho-chi-minh", kwh: 491 },
  { label: "HCM 800 kWh, no backup", province: "ho-chi-minh", kwh: 800 },
  { label: "HN 491 kWh, no backup", province: "ha-noi", kwh: 491 },
] as const;

async function main() {
  const packages = await new SolarPackageRepository(prisma).list(true);
  const settings = await new CalculationSettingsRepository(prisma).get();
  const provinces = await new ProvinceFactorRepository(prisma).list(true);
  if (!settings) throw new Error("No calculation settings row (id=default).");
  if (provinces.length === 0) throw new Error("No active provinces.");

  for (const s of SCENARIOS) {
    const prov = provinces.find((p) => p.code === s.province);
    if (!prov) throw new Error(`Province not found: ${s.province}`);
    const input: SolarCalculationInput = {
      inputContractVersion: "2.0.0",
      energyInputMethod: "kwh",
      inputMonthCount: 1,
      monthlyConsumptionKwh: s.kwh,
      monthlyBill: s.kwh * 3000,
      electricityType: "residential",
      electricalPhase: "single-phase",
      province: prov.code,
      daytimeUsageLevel: "medium",
      roofAreaM2: null,
      backupRequired: false,
      essentialLoadWatts: null,
      backupHours: null,
    };
    const result = recommendSolarPackages({
      input,
      packages,
      settings,
      provinceFactor: prov.factor,
      provinceMonthlyYieldKwhPerKwp: prov.monthlyYieldKwhPerKwp,
      allowUnapprovedTariffData: true,
    });

    console.log(`\n=== ${s.label} (province ${prov.code}) ===`);
    if (!result.recommendedPackage) {
      console.log("  no recommendation:", result.noRecommendationReason);
      continue;
    }
    for (const p of result.comparedPackages) {
      const pkg = packages.find((x) => x.id === p.packageId);
      if (!pkg) continue;
      const npvM = p.financial ? (p.financial.npvVnd / 1e6).toFixed(0) : "-";
      console.log(
        `  ${pkg.code.padEnd(22)} price=${(pkg.priceVnd / 1e6).toFixed(0)}tr kwp=${pkg.capacityKwp} batt=${pkg.batteryCapacityKwh} score=${p.score.toFixed(1)} payback=${p.paybackYears?.toFixed(2) ?? "-"} npv=${npvM}tr selfUse=${(p.selfConsumptionRate * 100).toFixed(1)}%`,
      );
    }
  }
}

main().finally(() => prisma.$disconnect());
