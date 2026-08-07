import type {
  CalculationSettings,
  DataGovernanceMetadata,
  DaytimeUsageLevel,
  PreferredContactTime,
  ProvinceFactorSeed,
  SolarPackageSeed,
} from "@/types/solar";

const DEMO_PACKAGE_DATA = {
  dataStatus: "demo",
  dataVersion: "demo-package-catalog-2026-07-20",
  sourceReference: "src/config/defaults.ts",
  dataOwner: "Kinh doanh + kỹ thuật — chưa chỉ định người duyệt",
  effectiveFrom: null,
  effectiveTo: null,
  approvedBy: null,
  approvedAt: null,
} as const satisfies DataGovernanceMetadata;

const DEMO_PROVINCE_DATA = {
  dataStatus: "demo",
  dataVersion: "demo-province-factors-2026-07-20",
  sourceReference: "src/config/defaults.ts",
  dataOwner: "Kỹ sư thiết kế — chưa chỉ định người duyệt",
  effectiveFrom: null,
  effectiveTo: null,
  approvedBy: null,
  approvedAt: null,
} as const satisfies DataGovernanceMetadata;

const DEMO_SETTINGS_DATA = {
  dataStatus: "demo",
  dataVersion: "demo-calculation-assumptions-2026-07-20",
  sourceReference: "src/config/defaults.ts",
  dataOwner: "Tài chính + kỹ thuật — chưa chỉ định người duyệt",
  effectiveFrom: null,
  effectiveTo: null,
  approvedBy: null,
  approvedAt: null,
} as const satisfies DataGovernanceMetadata;

export const SOLAR_INPUT_LIMITS = {
  monthlyBill: {
    min: 100_000,
    max: 500_000_000,
    example: 2_000_000,
  },
  roofAreaM2: {
    min: 5,
    max: 10_000,
  },
} as const;

export const CALCULATION_CONSTANTS = {
  daysPerMonth: 30,
  cashFlowHorizonYears: 20,
  longTermSavingYears: [5, 10, 20],
  roofConstraintInsightThreshold: 0.8,
} as const;

export const RECOMMENDATION_CONSTANTS = {
  nonBackupTargetRatio: 0.8,
  backupTargetRatio: 0.7,
  generationFitWeight: 0.5,
  selfUseWeight: 0.3,
  paybackWeight: 0.2,
  paybackPenaltyPerYear: 15,
  maximumComparedPackages: 3,
  scoreTieTolerance: 1e-9,
} as const;

export const DEFAULT_CALCULATION_SETTINGS = {
  ...DEMO_SETTINGS_DATA,
  averageElectricityPriceVndPerKwh: 2_800,
  batteryRoundTripEfficiency: 0.9,
  batteryDailyCycleFactor: 1,
  lowEstimateFactor: 0.9,
  highEstimateFactor: 1.05,
  systemLifetimeYears: 20,
  maintenanceRatePerYear: 0,
  daytimeLowRatio: 0.3,
  daytimeMediumRatio: 0.5,
  daytimeHighRatio: 0.75,
  zaloUrl: "https://zalo.me/",
  hotline: "0000 000 000",
  businessName: "Doanh nghiệp điện mặt trời mẫu",
} as const satisfies CalculationSettings;

export const DEFAULT_PROVINCES = [
  { ...DEMO_PROVINCE_DATA, code: "ho-chi-minh", name: "Hồ Chí Minh", factor: 1, displayOrder: 1 },
  { ...DEMO_PROVINCE_DATA, code: "ha-noi", name: "Hà Nội", factor: 0.88, displayOrder: 2 },
  { ...DEMO_PROVINCE_DATA, code: "da-nang", name: "Đà Nẵng", factor: 0.95, displayOrder: 3 },
  { ...DEMO_PROVINCE_DATA, code: "can-tho", name: "Cần Thơ", factor: 1.02, displayOrder: 4 },
  { ...DEMO_PROVINCE_DATA, code: "binh-duong", name: "Bình Dương", factor: 1, displayOrder: 5 },
  { ...DEMO_PROVINCE_DATA, code: "dong-nai", name: "Đồng Nai", factor: 1, displayOrder: 6 },
  { ...DEMO_PROVINCE_DATA, code: "long-an", name: "Long An", factor: 1.01, displayOrder: 7 },
  { ...DEMO_PROVINCE_DATA, code: "other", name: "Tỉnh/thành khác", factor: 0.92, displayOrder: 8 },
] as const satisfies readonly ProvinceFactorSeed[];

export const DEFAULT_SOLAR_PACKAGES = [
  {
    ...DEMO_PACKAGE_DATA,
    code: "SAVE-2KWP",
    name: "Gói tiết kiệm 2 kWp",
    description:
      "Phù hợp khách có ngân sách thấp và nhu cầu điện ban ngày vừa phải.",
    priceVnd: 18_000_000,
    capacityKwp: 2,
    baseMonthlyGenerationKwh: 240,
    requiredRoofAreaM2: 12,
    systemType: "grid-tied",
    electricalPhase: "single-phase",
    batteryCapacityKwh: 0,
    equipmentSummary:
      "Tấm pin, inverter hòa lưới, khung, tủ điện và thi công tiêu chuẩn.",
    panelBrand: "Thương hiệu mẫu",
    panelModel: "550Wp",
    inverterBrand: "Thương hiệu mẫu",
    inverterModel: "2kW Grid-tied",
    panelWarrantyYears: 12,
    inverterWarrantyYears: 5,
    active: true,
    displayOrder: 1,
  },
  {
    ...DEMO_PACKAGE_DATA,
    code: "FIT-3KWP",
    name: "Gói phù hợp 3 kWp",
    description:
      "Cân bằng giữa chi phí đầu tư, sản lượng và thời gian hoàn vốn.",
    priceVnd: 30_000_000,
    capacityKwp: 3,
    baseMonthlyGenerationKwh: 360,
    requiredRoofAreaM2: 18,
    systemType: "grid-tied",
    electricalPhase: "single-phase",
    batteryCapacityKwh: 0,
    equipmentSummary:
      "Tấm pin, inverter hòa lưới, khung, tủ điện, giám sát và thi công.",
    panelBrand: "Thương hiệu mẫu",
    panelModel: "550Wp",
    inverterBrand: "Thương hiệu mẫu",
    inverterModel: "3kW Grid-tied",
    panelWarrantyYears: 12,
    inverterWarrantyYears: 5,
    active: true,
    displayOrder: 2,
  },
  {
    ...DEMO_PACKAGE_DATA,
    code: "MAX-5KWP",
    name: "Gói nâng cao 5 kWp",
    description: "Phù hợp khách có tiền điện cao và diện tích mái lớn.",
    priceVnd: 50_000_000,
    capacityKwp: 5,
    baseMonthlyGenerationKwh: 600,
    requiredRoofAreaM2: 30,
    systemType: "grid-tied",
    electricalPhase: "single-phase",
    batteryCapacityKwh: 0,
    equipmentSummary:
      "Tấm pin, inverter hòa lưới, khung, tủ điện, giám sát và thi công.",
    panelBrand: "Thương hiệu mẫu",
    panelModel: "550Wp",
    inverterBrand: "Thương hiệu mẫu",
    inverterModel: "5kW Grid-tied",
    panelWarrantyYears: 12,
    inverterWarrantyYears: 5,
    active: true,
    displayOrder: 3,
  },
  {
    ...DEMO_PACKAGE_DATA,
    code: "HYBRID-3KWP-5KWH",
    name: "Gói Hybrid 3 kWp và pin 5 kWh",
    description: "Phù hợp khách cần điện dự phòng khi mất điện.",
    priceVnd: 48_000_000,
    capacityKwp: 3,
    baseMonthlyGenerationKwh: 360,
    requiredRoofAreaM2: 18,
    systemType: "hybrid",
    electricalPhase: "single-phase",
    batteryCapacityKwh: 5,
    equipmentSummary:
      "Tấm pin, inverter hybrid, pin lưu trữ 5 kWh, khung, tủ điện và thi công.",
    panelBrand: "Thương hiệu mẫu",
    panelModel: "550Wp",
    inverterBrand: "Thương hiệu mẫu",
    inverterModel: "3kW Hybrid",
    panelWarrantyYears: 12,
    inverterWarrantyYears: 5,
    active: true,
    displayOrder: 4,
  },
] as const satisfies readonly SolarPackageSeed[];

export const DAYTIME_USAGE_OPTIONS = [
  { value: "low", label: "Ít, dưới 30%", ratio: 0.3 },
  {
    value: "medium",
    label: "Trung bình, khoảng 30–60%",
    ratio: 0.5,
  },
  { value: "high", label: "Nhiều, trên 60%", ratio: 0.75 },
] as const satisfies readonly {
  value: DaytimeUsageLevel;
  label: string;
  ratio: number;
}[];

export const PREFERRED_CONTACT_TIME_OPTIONS = [
  { value: "morning", label: "Buổi sáng" },
  { value: "afternoon", label: "Buổi chiều" },
  { value: "evening", label: "Buổi tối" },
  { value: "anytime", label: "Liên hệ bất kỳ lúc nào" },
] as const satisfies readonly {
  value: PreferredContactTime;
  label: string;
}[];
