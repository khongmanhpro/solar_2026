import type { PrismaClient } from "@prisma/client";

import { db } from "@/lib/db";
import {
  CalculationRepository,
  CalculationSettingsRepository,
  LeadRepository,
  ProvinceFactorRepository,
  SolarPackageRepository,
} from "@/server/repositories";
import {
  CalculationService,
  CalculationSettingsService,
  LeadService,
  ProvinceFactorService,
  SolarPackageService,
} from "@/server/services";

export function createServiceContainer(prisma: PrismaClient) {
  const packageRepository = new SolarPackageRepository(prisma);
  const settingsRepository = new CalculationSettingsRepository(prisma);
  const provinceRepository = new ProvinceFactorRepository(prisma);
  const calculationRepository = new CalculationRepository(prisma);
  const leadRepository = new LeadRepository(prisma);

  return {
    calculations: new CalculationService(
      packageRepository,
      settingsRepository,
      provinceRepository,
      calculationRepository,
    ),
    leads: new LeadService(leadRepository, calculationRepository),
    packages: new SolarPackageService(packageRepository),
    settings: new CalculationSettingsService(settingsRepository),
    provinces: new ProvinceFactorService(provinceRepository),
  };
}

export const services = createServiceContainer(db);
