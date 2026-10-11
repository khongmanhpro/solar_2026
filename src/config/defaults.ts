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
  /** Billing month normalised to 30 days; PV intensity uses real month days. */
  daysPerMonth: 30,
  daysInMonth: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
  /** Fallback horizon when settings are unavailable (legacy helpers). */
  cashFlowHorizonYears: 20,
  longTermSavingYears: [5, 10, 20],
  roofConstraintInsightThreshold: 0.8,
  /**
   * Normalised clear-day PV shape (share of daily energy per hour, 0h-23h).
   * Mean of Hà Nội and TP.HCM profiles in the NLMT course workbooks; the 14
   * Bắc Bộ / Đông Nam Bộ provinces share the same shape within ±1 point.
   */
  solarHourlyProfile: [
    0, 0, 0, 0, 0, 0, 0.0132, 0.0485, 0.0836, 0.1087, 0.1237, 0.1307,
    0.1299, 0.1208, 0.1047, 0.0794, 0.0449, 0.0120, 0, 0, 0, 0, 0, 0,
  ],
  /** Weather variability: day types whose weighted mean factor is 1.0. */
  dayTypes: [
    { id: "sunny", generationFactor: 1.3, weight: 0.4 },
    { id: "average", generationFactor: 1.0, weight: 0.4 },
    { id: "overcast", generationFactor: 0.4, weight: 0.2 },
  ],
  /** Household load: daytime share spread over 6h-18h; night share split
   * between the 18h-22h evening peak and 22h-6h. */
  load: {
    daytimeStartHour: 6,
    daytimeEndHour: 18,
    eveningPeakEndHour: 22,
    eveningShareOfNight: 0.6,
  },
  battery: {
    depthOfDischarge: 0.9,
    /** Hybrid inverter idle/self consumption, drawn around the clock. */
    hybridStandbyLoadWatts: 40,
    backupInverterEfficiency: 0.9,
    /** Simulated days per day type so state of charge carries overnight. */
    warmUpDays: 3,
  },
  finance: {
    degradationFirstYear: 0.01,
    degradationPerYear: 0.005,
    tariffEscalationRate: 0.03,
    maintenanceEscalationRate: 0.03,
    discountRate: 0.08,
    /** Packages do not store inverter kW yet; estimate from kWp. */
    assumedDcAcRatio: 1.15,
    inverterReplacementYear: 12,
    inverterReplacementVndPerKw: { "grid-tied": 2_500_000, hybrid: 3_300_000 },
    batteryReplacementYear: 12,
    batteryReplacementVndPerKwh: 2_000_000,
  },
} as const;

/**
 * Rooftop self-consumption rules (DRAFT — verify against the official texts
 * before publishing as approved data).
 */
export const REGULATION_CONSTANTS = {
  surplusSale: {
    /** Households may sell surplus up to this share of generated output. */
    maxShareOfGeneration: 0.5,
    /** Previous-year average wholesale market price; not yet published for 2026. */
    priceVndPerKwh: 800,
    status: "draft",
    legalBasis: "Nghị định 58/2025/NĐ-CP, sửa đổi bởi Nghị định 243/2026/NĐ-CP (hiệu lực 26/06/2026)",
    priceNote:
      "Giá bằng giá điện năng thị trường bình quân năm trước do đơn vị vận hành hệ thống công bố; mức ~800 đ/kWh là ước tính, chưa có số chính thức năm 2026.",
  },
  notificationThresholdKw: 100,
} as const;

export const RECOMMENDATION_CONSTANTS = {
  economicWeight: 0.4,
  billReductionWeight: 0.35,
  selfUseWeight: 0.25,
  paybackFullScoreYears: 4,
  paybackZeroScoreYears: 12,
  /** Packages beyond this payback (or with negative NPV) are not recommended. */
  maxViablePaybackYears: 10,
  /** A cheaper package within this NPV shortfall that pays back no later is
   * preferred: same lifetime value for less capital and risk. */
  capitalEfficiencyNpvTolerance: 0.05,
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
  maintenanceRatePerYear: 0.008,
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
