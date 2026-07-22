import {
  DaytimeUsageLevel as PrismaDaytimeUsageLevel,
  ElectricityType as PrismaElectricityType,
  LeadStatus as PrismaLeadStatus,
  Prisma,
  type PrismaClient,
  SolarSystemType as PrismaSolarSystemType,
} from "@prisma/client";

import type {
  AdminLeadDetail,
  CalculationSettings,
  ElectricityType,
  LeadInput,
  LeadRecord,
  LeadStatus,
  ProvinceFactor,
  SolarCalculationInput,
  SolarPackage,
  SolarSystemType,
} from "@/types/solar";
import type {
  CalculationSettingsUpdateData,
  ProvinceFactorData,
  ProvinceFactorUpdateData,
  SolarPackageCreateData,
  SolarPackageUpdateData,
} from "@/lib/validations";

const prismaSystemTypeByDomain: Record<
  SolarSystemType,
  PrismaSolarSystemType
> = {
  "grid-tied": PrismaSolarSystemType.GRID_TIED,
  hybrid: PrismaSolarSystemType.HYBRID,
};

const domainSystemTypeByPrisma: Record<
  PrismaSolarSystemType,
  SolarSystemType
> = {
  GRID_TIED: "grid-tied",
  HYBRID: "hybrid",
};

const prismaDaytimeLevelByDomain = {
  low: PrismaDaytimeUsageLevel.LOW,
  medium: PrismaDaytimeUsageLevel.MEDIUM,
  high: PrismaDaytimeUsageLevel.HIGH,
} as const;

const prismaElectricityTypeByDomain: Record<
  ElectricityType,
  PrismaElectricityType
> = {
  residential: PrismaElectricityType.RESIDENTIAL,
};

const domainElectricityTypeByPrisma: Record<
  PrismaElectricityType,
  ElectricityType
> = {
  RESIDENTIAL: "residential",
};

const prismaLeadStatusByDomain: Record<LeadStatus, PrismaLeadStatus> = {
  new: PrismaLeadStatus.NEW,
  contacted: PrismaLeadStatus.CONTACTED,
  survey_scheduled: PrismaLeadStatus.SURVEY_SCHEDULED,
  quoted: PrismaLeadStatus.QUOTED,
  won: PrismaLeadStatus.WON,
  lost: PrismaLeadStatus.LOST,
};

const domainLeadStatusByPrisma: Record<PrismaLeadStatus, LeadStatus> = {
  NEW: "new",
  CONTACTED: "contacted",
  SURVEY_SCHEDULED: "survey_scheduled",
  QUOTED: "quoted",
  WON: "won",
  LOST: "lost",
};

const domainDaytimeLevelByPrisma = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;

type PrismaSolarPackageRecord = Prisma.SolarPackageGetPayload<Record<string, never>>;
type PrismaProvinceFactorRecord = Prisma.ProvinceFactorGetPayload<Record<string, never>>;
type PrismaLeadRecord = Prisma.LeadGetPayload<Record<string, never>>;
type PrismaCalculationSettingsRecord =
  Prisma.CalculationSettingGetPayload<Record<string, never>>;

function mapSolarPackage(record: PrismaSolarPackageRecord): SolarPackage {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description,
    priceVnd: record.priceVnd,
    capacityKwp: record.capacityKwp,
    baseMonthlyGenerationKwh: record.baseMonthlyGenerationKwh,
    requiredRoofAreaM2: record.requiredRoofAreaM2,
    systemType: domainSystemTypeByPrisma[record.systemType],
    batteryCapacityKwh: record.batteryCapacityKwh,
    equipmentSummary: record.equipmentSummary,
    panelBrand: record.panelBrand,
    panelModel: record.panelModel,
    inverterBrand: record.inverterBrand,
    inverterModel: record.inverterModel,
    panelWarrantyYears: record.panelWarrantyYears,
    inverterWarrantyYears: record.inverterWarrantyYears,
    active: record.active,
    displayOrder: record.displayOrder,
  };
}

function mapProvinceFactor(record: PrismaProvinceFactorRecord): ProvinceFactor {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    factor: record.factor,
    active: record.active,
    displayOrder: record.displayOrder,
  };
}

function mapLead(record: PrismaLeadRecord): LeadRecord {
  return {
    id: record.id,
    fullName: record.fullName,
    phone: record.phone,
    address: record.address ?? undefined,
    preferredContactTime:
      record.preferredContactTime as LeadRecord["preferredContactTime"],
    note: record.note ?? undefined,
    calculationId: record.calculationId,
    status: domainLeadStatusByPrisma[record.status],
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapCalculationSettings(
  record: PrismaCalculationSettingsRecord,
): CalculationSettings {
  return {
    averageElectricityPriceVndPerKwh:
      record.averageElectricityPriceVndPerKwh,
    batteryRoundTripEfficiency: record.batteryRoundTripEfficiency,
    batteryDailyCycleFactor: record.batteryDailyCycleFactor,
    lowEstimateFactor: record.lowEstimateFactor,
    highEstimateFactor: record.highEstimateFactor,
    systemLifetimeYears: record.systemLifetimeYears,
    maintenanceRatePerYear: record.maintenanceRatePerYear,
    daytimeLowRatio: record.daytimeLowRatio,
    daytimeMediumRatio: record.daytimeMediumRatio,
    daytimeHighRatio: record.daytimeHighRatio,
    zaloUrl: record.zaloUrl,
    hotline: record.hotline,
    businessName: record.businessName,
  };
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export class SolarPackageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(activeOnly = false): Promise<SolarPackage[]> {
    const records = await this.prisma.solarPackage.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    });
    return records.map(mapSolarPackage);
  }

  async findById(id: string): Promise<SolarPackage | null> {
    const record = await this.prisma.solarPackage.findUnique({ where: { id } });
    return record ? mapSolarPackage(record) : null;
  }

  async create(data: SolarPackageCreateData): Promise<SolarPackage> {
    const record = await this.prisma.solarPackage.create({
      data: {
        ...data,
        systemType: prismaSystemTypeByDomain[data.systemType],
      },
    });
    return mapSolarPackage(record);
  }

  async update(
    id: string,
    data: SolarPackageUpdateData,
  ): Promise<SolarPackage> {
    const { systemType, ...remainingData } = data;
    const record = await this.prisma.solarPackage.update({
      where: { id },
      data: {
        ...remainingData,
        ...(systemType
          ? { systemType: prismaSystemTypeByDomain[systemType] }
          : {}),
      },
    });
    return mapSolarPackage(record);
  }
}

export class CalculationSettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async get(): Promise<CalculationSettings | null> {
    const record = await this.prisma.calculationSetting.findUnique({
      where: { id: "default" },
    });

    return record ? mapCalculationSettings(record) : null;
  }

  async update(
    data: CalculationSettingsUpdateData,
  ): Promise<CalculationSettings> {
    const record = await this.prisma.calculationSetting.update({
      where: { id: "default" },
      data,
    });
    return mapCalculationSettings(record);
  }
}

export class ProvinceFactorRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(activeOnly = false): Promise<ProvinceFactor[]> {
    const records = await this.prisma.provinceFactor.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    });
    return records.map(mapProvinceFactor);
  }

  async findActiveByCode(code: string): Promise<ProvinceFactor | null> {
    const record = await this.prisma.provinceFactor.findFirst({
      where: { code, active: true },
    });
    return record ? mapProvinceFactor(record) : null;
  }

  async create(data: ProvinceFactorData): Promise<ProvinceFactor> {
    const record = await this.prisma.provinceFactor.create({ data });
    return mapProvinceFactor(record);
  }

  async update(
    id: string,
    data: ProvinceFactorUpdateData,
  ): Promise<ProvinceFactor> {
    const record = await this.prisma.provinceFactor.update({
      where: { id },
      data,
    });
    return mapProvinceFactor(record);
  }
}

export class CalculationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    input: SolarCalculationInput,
    recommendedPackageId: string | null,
    result: unknown,
  ) {
    return this.prisma.calculation.create({
      data: {
        monthlyBill: input.monthlyBill,
        electricityType:
          prismaElectricityTypeByDomain[input.electricityType],
        province: input.province,
        daytimeUsageLevel:
          prismaDaytimeLevelByDomain[input.daytimeUsageLevel],
        roofAreaM2: input.roofAreaM2,
        backupRequired: input.backupRequired,
        recommendedPackageId,
        resultJson: toJsonValue(result),
      },
    });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.calculation.count({ where: { id } });
    return count > 0;
  }
}

export class LeadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: LeadInput): Promise<LeadRecord> {
    const record = await this.prisma.lead.create({ data: input });
    return mapLead(record);
  }

  async list() {
    const records = await this.prisma.lead.findMany({
      include: {
        calculation: {
          include: { recommendedPackage: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return records.map((record) => ({
      ...mapLead(record),
      calculation: {
        monthlyBill: record.calculation.monthlyBill,
        electricityType:
          domainElectricityTypeByPrisma[record.calculation.electricityType],
        province: record.calculation.province,
        recommendedPackageName:
          record.calculation.recommendedPackage?.name ?? null,
        createdAt: record.calculation.createdAt,
      },
    }));
  }

  async findById(id: string): Promise<AdminLeadDetail | null> {
    const record = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        calculation: {
          include: { recommendedPackage: { select: { name: true } } },
        },
      },
    });

    if (!record) return null;

    return {
      ...mapLead(record),
      calculation: {
        monthlyBill: record.calculation.monthlyBill,
        electricityType:
          domainElectricityTypeByPrisma[record.calculation.electricityType],
        province: record.calculation.province,
        daytimeUsageLevel:
          domainDaytimeLevelByPrisma[record.calculation.daytimeUsageLevel],
        roofAreaM2: record.calculation.roofAreaM2,
        backupRequired: record.calculation.backupRequired,
        recommendedPackageName:
          record.calculation.recommendedPackage?.name ?? null,
        createdAt: record.calculation.createdAt,
        result:
          record.calculation.resultJson as unknown as AdminLeadDetail["calculation"]["result"],
      },
    };
  }

  async updateStatus(id: string, status: LeadStatus): Promise<LeadRecord> {
    const record = await this.prisma.lead.update({
      where: { id },
      data: { status: prismaLeadStatusByDomain[status] },
    });
    return mapLead(record);
  }
}
