export const NORMALIZED_ENERGY_INPUT_SCHEMA_VERSION = "2.2.0" as const;

/** Current customer contract. The 2.0.0 parser remains available so saved
 * Phase 1 requests can still be replayed. */
export const CUSTOMER_CALCULATION_REQUEST_SCHEMA_VERSION = "2.2.0" as const;
export const CUSTOMER_CALCULATION_REQUEST_SCHEMA_VERSION_V2_1 =
  "2.1.0" as const;
export const CUSTOMER_CALCULATION_REQUEST_SCHEMA_VERSION_V2_0 =
  "2.0.0" as const;

export const DAYTIME_BEHAVIORS = [
  "rarely_home_daytime",
  "some_daytime_use",
  "usually_home_daytime",
] as const;
export type DaytimeBehavior = (typeof DAYTIME_BEHAVIORS)[number];

export const ENERGY_INPUT_SOURCES = [
  "kwh",
  "money",
  "invoice_ocr",
] as const;
export type EnergyInputSource = (typeof ENERGY_INPUT_SOURCES)[number];

export interface CustomerKwhObservation {
  period?: string;
  valueKwh: number;
}

export interface CustomerMoneyObservation {
  period?: string;
  totalPaymentVnd: number;
}

export interface CustomerDatedMoneyObservation
  extends CustomerMoneyObservation {
  period: string;
}

export type CustomerMoneyBillingContext =
  | {
      /** Customer confirms: one household, normal billing period, no debt,
       * adjustment or non-energy line in the entered total. */
      kind: "standard_single_household";
    }
  | {
      /** Advanced path for a shared meter, a changed meter-reading period or
       * a known non-energy amount. Nothing in this branch is defaulted. */
      kind: "known";
      householdCount: number;
      otherChargesVnd: number;
      periodAdjustment:
        | { kind: "standard" }
        | {
            kind: "custom";
            billingDays: number;
            referenceDays: number;
          };
    }
  | {
      /** The total can only be converted to a deliberately broad range. */
      kind: "unknown";
    };

export interface CustomerInvoiceOcrObservation {
  period?: string;
  valueKwh: number;
  customerConfirmed: boolean;
}

export type CustomerEnergyInputV2_0 =
  | {
      method: "kwh";
      observations: CustomerKwhObservation[];
    }
  | {
      method: "money";
      amountBasis: "total_payment";
      observations: CustomerMoneyObservation[];
    }
  | {
      method: "invoice_ocr";
      uploadId: string;
      extractionVersion: string;
      observations: CustomerInvoiceOcrObservation[];
    };

export type CustomerEnergyInput =
  | {
      method: "kwh";
      observations: CustomerKwhObservation[];
    }
  | {
      method: "money";
      amountBasis: "total_payment";
      billingContext: CustomerMoneyBillingContext;
      observations: CustomerDatedMoneyObservation[];
    }
  | {
      method: "invoice_ocr";
      uploadId: string;
      extractionVersion: string;
      observations: CustomerInvoiceOcrObservation[];
    };

export type CustomerRoofInput =
  | { known: false }
  | { known: true; areaM2: number };

export type CustomerBackupInput =
  | { required: false }
  | {
      required: true;
      essentialLoadWatts: number | null;
      backupHours: number | null;
    };

export interface CustomerSiteInput {
  province: string;
  daytimeBehavior: DaytimeBehavior;
  roof: CustomerRoofInput;
  backup: CustomerBackupInput;
}

export const ELECTRICAL_PHASES = ["single-phase", "three-phase"] as const;
export type ElectricalPhase = (typeof ELECTRICAL_PHASES)[number];

export interface CustomerSiteInputV2_2 extends CustomerSiteInput {
  electricalPhase: ElectricalPhase;
}

/** Read-only compatibility shape for requests saved during Phase 1. */
export interface CustomerCalculationRequestV2_0 {
  schemaVersion: typeof CUSTOMER_CALCULATION_REQUEST_SCHEMA_VERSION_V2_0;
  energy: CustomerEnergyInputV2_0;
  site: CustomerSiteInput;
}

/** Read-only compatibility shape for requests saved during Phase 2.1. */
export interface CustomerCalculationRequestV2_1 {
  schemaVersion: typeof CUSTOMER_CALCULATION_REQUEST_SCHEMA_VERSION_V2_1;
  energy: CustomerEnergyInput;
  site: CustomerSiteInput;
}

/** Current customer request contract. Electrical phase is explicitly selected. */
export interface CustomerCalculationRequestV2 {
  schemaVersion: typeof CUSTOMER_CALCULATION_REQUEST_SCHEMA_VERSION;
  energy: CustomerEnergyInput;
  site: CustomerSiteInputV2_2;
}

export type CustomerCalculationRequest =
  | CustomerCalculationRequestV2_0
  | CustomerCalculationRequestV2_1
  | CustomerCalculationRequestV2;

export const INPUT_FIELD_ORIGINS = [
  "customer",
  "ocr",
  "dataset",
  "derived",
  "default",
] as const;
export type InputFieldOrigin = (typeof INPUT_FIELD_ORIGINS)[number];

export const CONFIDENCE_LEVELS = [
  "insufficient",
  "low",
  "medium",
  "high",
] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const INPUT_QUALITY_LEVELS = [
  "preliminary",
  "good",
  "survey_required",
] as const;
export type InputQualityLevel = (typeof INPUT_QUALITY_LEVELS)[number];

export const BILL_AMOUNT_BASES = [
  "total_payment",
  "energy_charge_before_vat",
] as const;
export type BillAmountBasis = (typeof BILL_AMOUNT_BASES)[number];

/**
 * The customer-facing V2 flow treats an entered amount as the final amount
 * payable. Older callers must explicitly opt into the pre-VAT legacy basis.
 */
export const DEFAULT_BILL_AMOUNT_BASIS = "total_payment" as const;

export interface ProvenancedValue<T> {
  value: T;
  origin: InputFieldOrigin;
  confidence: ConfidenceLevel;
  customerConfirmed: boolean;
  derivedFrom?: string[];
  assumptionRef?: string;
  reasons: string[];
}

export interface NumericEstimate {
  expected: number;
  lowerBound: number;
  upperBound: number;
}

export interface BillingPeriod {
  startDate?: string;
  endDate?: string;
  days?: number;
}

export const ENERGY_OBSERVATION_KINDS = [
  "kwh",
  "total_payment_vnd",
  "energy_charge_before_vat_vnd",
] as const;
export type EnergyObservationKind =
  (typeof ENERGY_OBSERVATION_KINDS)[number];

export interface NormalizedEnergyObservation {
  path: string;
  period?: string;
  kind: EnergyObservationKind;
  amount: ProvenancedValue<number>;
}

export interface NormalizedBillAmount {
  amountBasis: BillAmountBasis;
  energyChargeBeforeVatVnd?: ProvenancedValue<number>;
  energyChargeBeforeVatEstimateVnd?: ProvenancedValue<NumericEstimate>;
  vatRate?: ProvenancedValue<number>;
  vatVnd?: ProvenancedValue<number>;
  vatEstimateVnd?: ProvenancedValue<NumericEstimate>;
  otherChargesVnd?: ProvenancedValue<number>;
  otherChargesEstimateVnd?: ProvenancedValue<NumericEstimate>;
  totalPaymentVnd?: ProvenancedValue<number>;
}

export interface NormalizedMoneyConversion {
  observationPath: string;
  period: string;
  tariffVersion: string;
  vatRuleVersion: string;
  vatRate: number;
  billingContextKind: CustomerMoneyBillingContext["kind"];
  householdCount: number | null;
  billingDayScale: number | null;
  totalPaymentVnd: number;
  energyChargeBeforeVatVnd: NumericEstimate;
  vatVnd: NumericEstimate;
  otherChargesVnd: NumericEstimate;
  consumptionKwh: NumericEstimate;
  exact: boolean;
  warnings: string[];
}

export interface NormalizedEnergyInput {
  schemaVersion: typeof NORMALIZED_ENERGY_INPUT_SCHEMA_VERSION;
  source: EnergyInputSource;
  electricityType: ProvenancedValue<"residential">;
  billingPeriod?: ProvenancedValue<BillingPeriod>;
  observations: NormalizedEnergyObservation[];
  monthlyConsumptionKwh: ProvenancedValue<NumericEstimate>;
  bill?: NormalizedBillAmount;
  moneyConversions?: NormalizedMoneyConversion[];
  tariffVersion: string;
  tariffVersions?: string[];
  quality: InputQualityLevel;
  warnings: string[];
}

export const INPUT_READINESS_ISSUE_CODES = [
  "INVALID_INPUT",
  "INVALID_ESTIMATE",
  "MISSING_ENERGY_VALUE",
  "SOURCE_VALUE_MISMATCH",
  "OCR_NOT_CONFIRMED",
  "UNCONFIRMED_PRIMARY_VALUE",
  "MISSING_PROVENANCE",
  "MISSING_TARIFF_VERSION",
] as const;
export type InputReadinessIssueCode =
  (typeof INPUT_READINESS_ISSUE_CODES)[number];

export interface InputReadinessIssue {
  code: InputReadinessIssueCode;
  path: string;
  message: string;
}

export interface InputReadinessReport {
  readyForCalculation: boolean;
  issues: InputReadinessIssue[];
}

export interface InputConfidenceReport {
  overall: ConfidenceLevel;
  reasons: string[];
}
