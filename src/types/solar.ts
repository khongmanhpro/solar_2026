export const DAYTIME_USAGE_LEVELS = ["low", "medium", "high"] as const;
export type DaytimeUsageLevel = (typeof DAYTIME_USAGE_LEVELS)[number];

export const ELECTRICITY_TYPES = ["residential"] as const;
export type ElectricityType = (typeof ELECTRICITY_TYPES)[number];

export const SOLAR_SYSTEM_TYPES = ["grid-tied", "hybrid"] as const;
export type SolarSystemType = (typeof SOLAR_SYSTEM_TYPES)[number];

export const PREFERRED_CONTACT_TIMES = [
  "morning",
  "afternoon",
  "evening",
  "anytime",
] as const;
export type PreferredContactTime = (typeof PREFERRED_CONTACT_TIMES)[number];

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "survey_scheduled",
  "quoted",
  "won",
  "lost",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface SolarCalculationInput {
  monthlyBill: number;
  electricityType: ElectricityType;
  province: string;
  daytimeUsageLevel: DaytimeUsageLevel;
  roofAreaM2: number;
  backupRequired: boolean;
}

export interface SolarPackage {
  id: string;
  code: string;
  name: string;
  description: string;
  priceVnd: number;
  capacityKwp: number;
  baseMonthlyGenerationKwh: number;
  requiredRoofAreaM2: number;
  systemType: SolarSystemType;
  batteryCapacityKwh: number;
  equipmentSummary: string;
  panelBrand: string;
  panelModel: string;
  inverterBrand: string;
  inverterModel: string;
  panelWarrantyYears: number;
  inverterWarrantyYears: number;
  active: boolean;
  displayOrder: number;
}

export type SolarPackageSeed = Omit<SolarPackage, "id">;

export interface CalculationSettings {
  averageElectricityPriceVndPerKwh: number;
  batteryRoundTripEfficiency: number;
  batteryDailyCycleFactor: number;
  lowEstimateFactor: number;
  highEstimateFactor: number;
  systemLifetimeYears: number;
  maintenanceRatePerYear: number;
  daytimeLowRatio: number;
  daytimeMediumRatio: number;
  daytimeHighRatio: number;
  zaloUrl: string;
  hotline: string;
  businessName: string;
}

export interface ProvinceFactor {
  id: string;
  code: string;
  name: string;
  factor: number;
  active: boolean;
  displayOrder: number;
}

export type ProvinceFactorSeed = Omit<ProvinceFactor, "id" | "active"> & {
  active?: boolean;
};

export interface CalculationScenarioResult {
  adjustedGenerationKwh: number;
  solarSurplusKwh: number;
  directSolarUseKwh: number;
  batteryUseKwh: number;
  totalSolarUseKwh: number;
  gridConsumptionAfterSolarKwh: number;
  monthlySavingsVnd: number;
  billAfterSolarVnd: number;
  reductionPercent: number;
  yearlySavingsVnd: number;
  paybackMonths: number | null;
  paybackYears: number | null;
  selfConsumptionRate: number;
}

export interface CashFlowPoint {
  year: number;
  cumulativeCashFlowVnd: number;
}

export interface LongTermSavings {
  saving5YearsVnd: number;
  saving10YearsVnd: number;
  saving20YearsVnd: number;
}

export interface UnscoredPackageCalculationResult
  extends CalculationScenarioResult {
  packageId: string;
  estimatedMonthlyConsumptionKwh: number;
  daytimeDemandKwh: number;
  lowEstimate: CalculationScenarioResult;
  highEstimate: CalculationScenarioResult;
  cashFlow: CashFlowPoint[];
  breakEvenYear: number | null;
  longTermSavings: LongTermSavings;
}

export interface PackageScoreBreakdown {
  targetGenerationKwh: number;
  generationFitScore: number;
  selfUseScore: number;
  paybackScore: number;
}

export interface PackageCalculationResult
  extends UnscoredPackageCalculationResult {
  score: number;
  scoreBreakdown: PackageScoreBreakdown;
}

export interface SolarRecommendationResult {
  recommendedPackage: PackageCalculationResult | null;
  comparedPackages: PackageCalculationResult[];
  inputSummary: SolarCalculationInput;
  assumptions: CalculationSettings;
}

export interface LeadInput {
  fullName: string;
  phone: string;
  address?: string;
  preferredContactTime: PreferredContactTime;
  note?: string;
  calculationId: string;
}

export interface LeadRecord extends LeadInput {
  id: string;
  status: LeadStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminLeadRecord extends LeadRecord {
  calculation: {
    monthlyBill: number;
    electricityType: ElectricityType;
    province: string;
    recommendedPackageName: string | null;
    createdAt: Date;
  };
}

export interface AdminLeadDetail extends LeadRecord {
  calculation: {
    monthlyBill: number;
    electricityType: ElectricityType;
    province: string;
    daytimeUsageLevel: DaytimeUsageLevel;
    roofAreaM2: number;
    backupRequired: boolean;
    recommendedPackageName: string | null;
    createdAt: Date;
    result: SolarRecommendationResult;
  };
}

export interface CalculationResponse extends SolarRecommendationResult {
  calculationId: string;
}
