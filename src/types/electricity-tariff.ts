import type { ElectricityType } from "@/types/solar";

export type IsoDate = string;
export type YearMonth = string;

export type TariffLifecycleStatus =
  | "draft"
  | "pending"
  | "verified"
  | "retired";

export type InternalApprovalStatus =
  | "requires_internal_approval"
  | "approved";

export type TariffValueStatus = "official_source" | "candidate_derived";

export interface ElectricityTariffTier {
  code: string;
  label: string;
  fromKwh: number;
  toKwh: number | null;
  unitPriceVndPerKwh: number;
}

export type MonetaryRoundingRule =
  | { mode: "none" }
  | { mode: "half_up"; decimalPlaces: number };

export interface ElectricityRoundingPolicy {
  tierCharge: MonetaryRoundingRule;
  energySubtotal: MonetaryRoundingRule;
  vatAmount: MonetaryRoundingRule;
  totalPayment: MonetaryRoundingRule;
}

export interface TariffEffectivePeriod {
  /** Inclusive calendar date. */
  from: IsoDate | null;
  /** Inclusive calendar date; null means open-ended. */
  to: IsoDate | null;
}

export interface TariffSourceReference {
  kind: "official_document" | "official_web_page" | "customer_screenshot";
  title: string;
  authority: string;
  documentNumber: string | null;
  issuedOn: IsoDate | null;
  url: string | null;
}

export interface TariffQuotaPolicy {
  baseBillingDays: number;
  householdMultiplierSupported: boolean;
  billingDayProrationSupported: boolean;
}

export interface ElectricityTariffVersion {
  id: string;
  version: string;
  electricityType: ElectricityType;
  currency: "VND";
  unit: "kWh";
  status: TariffLifecycleStatus;
  approvalStatus: InternalApprovalStatus;
  selectable: boolean;
  valueStatus: TariffValueStatus;
  effectivePeriod: TariffEffectivePeriod;
  sources: readonly TariffSourceReference[];
  notes: readonly string[];
  quotaPolicy: TariffQuotaPolicy;
  roundingPolicy: ElectricityRoundingPolicy;
  tiers: readonly ElectricityTariffTier[];
}

export interface VatRuleVersion {
  id: string;
  version: string;
  rateBps: number;
  status: TariffLifecycleStatus;
  approvalStatus: InternalApprovalStatus;
  selectable: boolean;
  effectivePeriod: TariffEffectivePeriod;
  sources: readonly TariffSourceReference[];
  notes: readonly string[];
  roundingRule: MonetaryRoundingRule;
}

export interface ElectricityTariffRegistry {
  schemaVersion: string;
  registryVersion: string;
  tariffs: readonly ElectricityTariffVersion[];
  vatRules: readonly VatRuleVersion[];
}

export interface TariffBillingContext {
  /** Number of household quotas attached to the meter. Defaults to 1. */
  householdQuotaMultiplier?: number;
  /** Actual number of days in the billing cycle. Supply with referenceDays. */
  billingDays?: number;
  /**
   * Denominator used to prorate tier quotas. For changed meter-reading cycles,
   * this is normally the number of days in the immediately preceding month.
   */
  referenceDays?: number;
}

export interface ResolvedTariffBillingContext {
  householdQuotaMultiplier: number;
  billingDays: number;
  referenceDays: number;
  baseBillingDays: number;
  quotaScale: number;
}

export interface ElectricityBillTierBreakdown {
  tierCode: string;
  label: string;
  fromKwh: number;
  toKwh: number | null;
  unitPriceVndPerKwh: number;
  consumptionKwh: number;
  rawChargeVnd: number;
  chargeVnd: number;
}

export interface ElectricityBillBreakdown {
  tariffVersion: string;
  vatRuleVersion: string;
  consumptionKwh: number;
  billingContext: ResolvedTariffBillingContext;
  tiers: readonly ElectricityBillTierBreakdown[];
  rawEnergyChargeVnd: number;
  energyChargeBeforeVatVnd: number;
  vatRateBps: number;
  rawVatVnd: number;
  vatVnd: number;
  otherChargesVnd: number;
  rawTotalPaymentVnd: number;
  totalPaymentVnd: number;
  roundingPolicy: ElectricityRoundingPolicy;
}

export interface CalculateElectricityBillBreakdownInput {
  tariff: ElectricityTariffVersion;
  vatRule: VatRuleVersion;
  consumptionKwh: number;
  context?: TariffBillingContext;
  otherChargesVnd?: number;
}

export interface VndRange {
  minVnd: number;
  maxVnd: number;
}

export interface ElectricityConsumptionRange {
  minKwh: number;
  estimatedKwh: number;
  maxKwh: number;
  totalPaymentVnd: number;
  otherChargesVnd: VndRange;
  energyAndVatTargetVnd: VndRange;
  tariffVersion: string;
  vatRuleVersion: string;
}

export interface EstimateElectricityConsumptionRangeInput {
  tariff: ElectricityTariffVersion;
  vatRule: VatRuleVersion;
  totalPaymentVnd: number;
  otherChargesVnd: VndRange;
  context?: TariffBillingContext;
  /** Safety ceiling for inverse search. Defaults to 1,000,000 kWh. */
  maxKwh?: number;
}

export type TariffSelectionPoint =
  | { date: IsoDate; period?: never }
  | { date?: never; period: YearMonth };

export type TariffSelectionRequest = TariffSelectionPoint & {
  electricityType?: ElectricityType;
  allowUnapproved?: boolean;
};

export type VatSelectionRequest = TariffSelectionPoint & {
  allowUnapproved?: boolean;
};

export type TariffSelectionErrorCode =
  | "INVALID_DATE"
  | "INVALID_PERIOD"
  | "TARIFF_VERSION_NOT_FOUND"
  | "TARIFF_GAP"
  | "TARIFF_OVERLAP"
  | "TARIFF_PERIOD_SPANS_VERSIONS"
  | "TARIFF_NOT_SELECTABLE"
  | "TARIFF_UNAPPROVED"
  | "VAT_RULE_VERSION_NOT_FOUND"
  | "VAT_RULE_GAP"
  | "VAT_RULE_OVERLAP"
  | "VAT_RULE_PERIOD_SPANS_VERSIONS"
  | "VAT_RULE_NOT_SELECTABLE"
  | "VAT_RULE_UNAPPROVED";
