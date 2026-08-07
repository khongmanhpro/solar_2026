export const STANDARD_PACKAGE_PHASES = [
  "single-phase",
  "three-phase",
] as const;
export type StandardPackagePhase = (typeof STANDARD_PACKAGE_PHASES)[number];

export const STANDARD_PRICE_STATUSES = [
  "source-quote",
  "reference-only",
  "supplier-confirmed",
] as const;
export type StandardPriceStatus = (typeof STANDARD_PRICE_STATUSES)[number];

export const STANDARD_VAT_STATUSES = [
  "included",
  "excluded",
  "ambiguous",
  "unknown",
] as const;
export type StandardVatStatus = (typeof STANDARD_VAT_STATUSES)[number];

export const STANDARD_PACKAGE_TECHNICAL_STATUSES = [
  "draft",
  "approved",
  "suspended",
] as const;
export type StandardPackageTechnicalStatus =
  (typeof STANDARD_PACKAGE_TECHNICAL_STATUSES)[number];

export const STANDARD_PACKAGE_EVIDENCE_TYPES = [
  "methodology",
  "customer-quote",
  "supplier-price-list",
  "manufacturer-datasheet",
] as const;
export type StandardPackageEvidenceType =
  (typeof STANDARD_PACKAGE_EVIDENCE_TYPES)[number];

export interface StandardPackageEvidence {
  id: string;
  type: StandardPackageEvidenceType;
  title: string;
  reference: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  reportedModel?: string;
}

export interface StandardPackageTechnicalReview {
  status: StandardPackageTechnicalStatus;
  statusReason: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  sourceReferences: readonly StandardPackageEvidence[];
}

export interface StandardDcAcRatioPolicy {
  minimum: number;
  maximum: number;
  exceptionReason: string | null;
}

export interface StandardPanelElectricalSpec {
  vocV: number;
  vmpV: number;
  iscA: number;
  impA: number;
  tempCoeffVocPctPerC: number;
  tempCoeffVmpPctPerC: number;
  maxSystemVoltageV: number;
}

export interface StandardInverterElectricalSpec {
  maxPvKw: number;
  maxDcVoltageV: number;
  mpptVoltageMinV: number;
  mpptVoltageMaxV: number;
  mpptCount: number;
  stringsPerMppt: number;
  maxInputCurrentPerMpptA: number;
  nominalAcVoltageV: number;
  maxAcCurrentA: number;
}

export interface StandardPvString {
  mppt: number;
  panelCount: number;
  vocColdV: number;
  vmpHotV: number;
  inputCurrentA: number;
}

export interface StandardStringPlan {
  minAmbientC: number;
  maxCellC: number;
  strings: readonly StandardPvString[];
}

export interface StandardBatteryElectricalSpec {
  usableKwh: number;
  dischargeEfficiency: number;
  maxContinuousDischargeKw: number;
  compatibleInverterModels: readonly string[];
}

export interface StandardBackupPlan {
  protectedLoadKw: number;
  surgeLoadKw: number;
  targetHours: number;
  estimatedHours: number;
  phase: StandardPackagePhase;
  transferMethod: "eps" | "ats" | "manual";
}

export interface StandardPackageTechnicalDesign {
  dcAcRatioPolicy: StandardDcAcRatioPolicy;
  panelElectrical: StandardPanelElectricalSpec | null;
  inverterElectrical: StandardInverterElectricalSpec | null;
  stringPlan: StandardStringPlan | null;
  batteryElectrical: StandardBatteryElectricalSpec | null;
  backupPlan: StandardBackupPlan | null;
}

export interface StandardPackageBomDetailLine {
  description: string;
  quantity: number;
  unit: string;
  unitPriceVnd: number;
  totalVnd: number;
}

export interface StandardPackageBomLine {
  code: string;
  category:
    | "panel"
    | "inverter"
    | "battery"
    | "mounting"
    | "electrical"
    | "installation"
    | "service";
  description: string;
  quantity: number;
  unit: string;
  unitPriceVnd: number | null;
  totalVnd: number | null;
  required: boolean;
  detailLines?: StandardPackageBomDetailLine[];
  detailSubtotalToleranceVnd?: number;
}

export interface StandardPackagePricing {
  referenceTotalVnd: number;
  priceStatus: StandardPriceStatus;
  vatRate: number | null;
  vatStatus: StandardVatStatus;
  sourceWrittenTotalVnd?: number | null;
  bomComplete: boolean;
  bomLines: StandardPackageBomLine[];
  pricingNotes: string[];
}

export interface StandardPackageDefinition {
  code: string;
  phase: StandardPackagePhase;
  panel: {
    brand: string;
    model: string;
    powerWp: number;
    quantity: number;
    lengthM: number;
    widthM: number;
  };
  inverter: {
    brand: string;
    model: string;
    powerKw: number;
  };
  battery: {
    nominalKwh: number;
  };
  technicalReview: StandardPackageTechnicalReview;
  technicalDesign: StandardPackageTechnicalDesign;
  pricing: StandardPackagePricing;
  includedScope: string[];
  excludedScope: string[];
  engineeringReviewRequired: string[];
}
