import { getElectricityTariff } from "@/config/electricity-tariffs";
import type {
  CalculateElectricityBillBreakdownInput,
  ElectricityBillBreakdown,
  ElectricityConsumptionRange,
  ElectricityTariffVersion,
  EstimateElectricityConsumptionRangeInput,
  MonetaryRoundingRule,
  ResolvedTariffBillingContext,
  VatRuleVersion,
} from "@/types/electricity-tariff";
import type { ElectricityType } from "@/types/solar";

function assertNonNegativeFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} phải là số hữu hạn không âm.`);
  }
}

function assertPositiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} phải là số hữu hạn lớn hơn 0.`);
  }
}

function roundMonetaryValue(
  value: number,
  rule: MonetaryRoundingRule,
): number {
  if (rule.mode === "none") return value;

  if (!Number.isInteger(rule.decimalPlaces) || rule.decimalPlaces < 0) {
    throw new RangeError("decimalPlaces phải là số nguyên không âm.");
  }

  const factor = 10 ** rule.decimalPlaces;
  return Math.floor(value * factor + 0.5 + Number.EPSILON) / factor;
}

function assertTariffStructure(tariff: ElectricityTariffVersion): void {
  if (tariff.tiers.length === 0) {
    throw new RangeError(`Biểu giá ${tariff.version} không có bậc giá.`);
  }

  let expectedFromKwh = 0;
  tariff.tiers.forEach((tier, index) => {
    assertNonNegativeFinite(tier.fromKwh, `tiers[${index}].fromKwh`);
    assertPositiveFinite(
      tier.unitPriceVndPerKwh,
      `tiers[${index}].unitPriceVndPerKwh`,
    );

    if (tier.fromKwh !== expectedFromKwh) {
      throw new RangeError(
        `Biểu giá ${tariff.version} bị hở hoặc chồng bậc tại ${tier.code}.`,
      );
    }

    if (tier.toKwh === null) {
      if (index !== tariff.tiers.length - 1) {
        throw new RangeError("Chỉ bậc cuối được phép không có giới hạn trên.");
      }
      return;
    }

    if (!Number.isFinite(tier.toKwh) || tier.toKwh <= tier.fromKwh) {
      throw new RangeError(`Giới hạn bậc ${tier.code} không hợp lệ.`);
    }

    expectedFromKwh = tier.toKwh;
  });

  if (tariff.tiers.at(-1)?.toKwh !== null) {
    throw new RangeError(`Biểu giá ${tariff.version} thiếu bậc cuối mở.`);
  }
}

function assertVatRule(vatRule: VatRuleVersion): void {
  if (
    !Number.isInteger(vatRule.rateBps) ||
    vatRule.rateBps < 0 ||
    vatRule.rateBps > 10_000
  ) {
    throw new RangeError(`VAT ${vatRule.version} có rateBps không hợp lệ.`);
  }
}

function resolveBillingContext(
  tariff: ElectricityTariffVersion,
  context: CalculateElectricityBillBreakdownInput["context"],
): ResolvedTariffBillingContext {
  const baseBillingDays = tariff.quotaPolicy.baseBillingDays;
  assertPositiveFinite(baseBillingDays, "baseBillingDays");

  const hasBillingDays = context?.billingDays !== undefined;
  const hasReferenceDays = context?.referenceDays !== undefined;
  if (hasBillingDays !== hasReferenceDays) {
    throw new RangeError(
      "billingDays và referenceDays phải được cung cấp cùng nhau.",
    );
  }

  const householdQuotaMultiplier = context?.householdQuotaMultiplier ?? 1;
  const billingDays = context?.billingDays ?? baseBillingDays;
  const referenceDays = context?.referenceDays ?? baseBillingDays;

  assertPositiveFinite(
    householdQuotaMultiplier,
    "householdQuotaMultiplier",
  );
  assertPositiveFinite(billingDays, "billingDays");
  assertPositiveFinite(referenceDays, "referenceDays");

  if (
    householdQuotaMultiplier !== 1 &&
    !tariff.quotaPolicy.householdMultiplierSupported
  ) {
    throw new RangeError("Biểu giá không hỗ trợ nhân định mức hộ dùng chung.");
  }

  if (
    billingDays !== referenceDays &&
    !tariff.quotaPolicy.billingDayProrationSupported
  ) {
    throw new RangeError("Biểu giá không hỗ trợ điều chỉnh định mức theo ngày.");
  }

  return {
    householdQuotaMultiplier,
    billingDays,
    referenceDays,
    baseBillingDays,
    quotaScale:
      householdQuotaMultiplier * (billingDays / referenceDays),
  };
}

function assertCompatibleVatRounding(
  tariff: ElectricityTariffVersion,
  vatRule: VatRuleVersion,
): void {
  if (
    JSON.stringify(tariff.roundingPolicy.vatAmount) !==
    JSON.stringify(vatRule.roundingRule)
  ) {
    throw new RangeError(
      `Biểu giá ${tariff.version} và VAT ${vatRule.version} có quy tắc làm tròn mâu thuẫn.`,
    );
  }
}

export function calculateElectricityBill(
  electricityType: ElectricityType,
  consumptionKwh: number,
): number {
  assertNonNegativeFinite(consumptionKwh, "consumptionKwh");

  let billVnd = 0;
  let remainingKwh = consumptionKwh;

  for (const tier of getElectricityTariff(electricityType)) {
    if (remainingKwh <= 0) break;

    const tierCapacityKwh =
      tier.toKwh === null ? remainingKwh : tier.toKwh - tier.fromKwh;
    const tierConsumptionKwh = Math.min(remainingKwh, tierCapacityKwh);
    billVnd += tierConsumptionKwh * tier.unitPriceVndPerKwh;
    remainingKwh -= tierConsumptionKwh;
  }

  return billVnd;
}

export function estimateElectricityConsumptionFromBill(
  electricityType: ElectricityType,
  monthlyBillVnd: number,
): number {
  assertNonNegativeFinite(monthlyBillVnd, "monthlyBillVnd");

  let consumptionKwh = 0;
  let remainingBillVnd = monthlyBillVnd;

  for (const tier of getElectricityTariff(electricityType)) {
    if (remainingBillVnd <= 0) break;

    const tierCapacityKwh =
      tier.toKwh === null ? Number.POSITIVE_INFINITY : tier.toKwh - tier.fromKwh;
    const tierCostVnd = tierCapacityKwh * tier.unitPriceVndPerKwh;

    if (remainingBillVnd <= tierCostVnd) {
      consumptionKwh += remainingBillVnd / tier.unitPriceVndPerKwh;
      remainingBillVnd = 0;
      break;
    }

    consumptionKwh += tierCapacityKwh;
    remainingBillVnd -= tierCostVnd;
  }

  return consumptionKwh;
}

/**
 * Inverts a pre-VAT energy charge using an explicitly selected tariff. This
 * keeps compatibility callers from bypassing date/version approval at the
 * service boundary.
 */
export function estimateElectricityConsumptionFromEnergyCharge({
  tariff,
  energyChargeBeforeVatVnd,
  context,
}: Pick<
  CalculateElectricityBillBreakdownInput,
  "tariff" | "context"
> & { energyChargeBeforeVatVnd: number }): number {
  assertNonNegativeFinite(
    energyChargeBeforeVatVnd,
    "energyChargeBeforeVatVnd",
  );
  assertTariffStructure(tariff);

  const billingContext = resolveBillingContext(tariff, context);
  let consumptionKwh = 0;
  let remainingChargeVnd = energyChargeBeforeVatVnd;

  for (const tier of tariff.tiers) {
    if (remainingChargeVnd <= 0) break;

    const tierCapacityKwh =
      tier.toKwh === null
        ? Number.POSITIVE_INFINITY
        : (tier.toKwh - tier.fromKwh) * billingContext.quotaScale;
    const tierCostVnd = tierCapacityKwh * tier.unitPriceVndPerKwh;

    if (remainingChargeVnd <= tierCostVnd) {
      consumptionKwh += remainingChargeVnd / tier.unitPriceVndPerKwh;
      break;
    }

    consumptionKwh += tierCapacityKwh;
    remainingChargeVnd -= tierCostVnd;
  }

  return consumptionKwh;
}

/**
 * Pure pre-VAT energy-charge engine shared by solar savings and full bills.
 * The caller must pass an explicitly selected tariff contract.
 */
export function calculateElectricityEnergyCharge({
  tariff,
  consumptionKwh,
  context,
}: Pick<
  CalculateElectricityBillBreakdownInput,
  "tariff" | "consumptionKwh" | "context"
>): Pick<
  ElectricityBillBreakdown,
  | "billingContext"
  | "tiers"
  | "rawEnergyChargeVnd"
  | "energyChargeBeforeVatVnd"
> {
  assertNonNegativeFinite(consumptionKwh, "consumptionKwh");
  assertTariffStructure(tariff);

  const billingContext = resolveBillingContext(tariff, context);
  const tiers = tariff.tiers.map((tier) => {
    const fromKwh = tier.fromKwh * billingContext.quotaScale;
    const toKwh =
      tier.toKwh === null
        ? null
        : tier.toKwh * billingContext.quotaScale;
    const tierUpperBound = toKwh ?? consumptionKwh;
    const tierConsumptionKwh = Math.max(
      0,
      Math.min(consumptionKwh, tierUpperBound) - fromKwh,
    );
    const rawChargeVnd = tierConsumptionKwh * tier.unitPriceVndPerKwh;

    return {
      tierCode: tier.code,
      label: tier.label,
      fromKwh,
      toKwh,
      unitPriceVndPerKwh: tier.unitPriceVndPerKwh,
      consumptionKwh: tierConsumptionKwh,
      rawChargeVnd,
      chargeVnd: roundMonetaryValue(
        rawChargeVnd,
        tariff.roundingPolicy.tierCharge,
      ),
    };
  });
  const rawEnergyChargeVnd = tiers.reduce(
    (total, tier) => total + tier.chargeVnd,
    0,
  );
  const energyChargeBeforeVatVnd = roundMonetaryValue(
    rawEnergyChargeVnd,
    tariff.roundingPolicy.energySubtotal,
  );

  return {
    billingContext,
    tiers,
    rawEnergyChargeVnd,
    energyChargeBeforeVatVnd,
  };
}

/**
 * Pure forward engine. The caller must select date-valid, approved versions
 * before invoking this function; this layer only performs deterministic math.
 */
export function calculateElectricityBillBreakdown({
  tariff,
  vatRule,
  consumptionKwh,
  context,
  otherChargesVnd = 0,
}: CalculateElectricityBillBreakdownInput): ElectricityBillBreakdown {
  assertNonNegativeFinite(otherChargesVnd, "otherChargesVnd");
  assertVatRule(vatRule);
  assertCompatibleVatRounding(tariff, vatRule);
  const energy = calculateElectricityEnergyCharge({
    tariff,
    consumptionKwh,
    context,
  });
  const {
    billingContext,
    tiers,
    rawEnergyChargeVnd,
    energyChargeBeforeVatVnd,
  } = energy;
  const rawVatVnd = energyChargeBeforeVatVnd * (vatRule.rateBps / 10_000);
  const vatVnd = roundMonetaryValue(rawVatVnd, vatRule.roundingRule);
  const rawTotalPaymentVnd =
    energyChargeBeforeVatVnd + vatVnd + otherChargesVnd;
  const totalPaymentVnd = roundMonetaryValue(
    rawTotalPaymentVnd,
    tariff.roundingPolicy.totalPayment,
  );

  return {
    tariffVersion: tariff.version,
    vatRuleVersion: vatRule.version,
    consumptionKwh,
    billingContext,
    tiers,
    rawEnergyChargeVnd,
    energyChargeBeforeVatVnd,
    vatRateBps: vatRule.rateBps,
    rawVatVnd,
    vatVnd,
    otherChargesVnd,
    rawTotalPaymentVnd,
    totalPaymentVnd,
    roundingPolicy: tariff.roundingPolicy,
  };
}

function invertEnergyAndVatAmount(
  targetVnd: number,
  input: Pick<
    EstimateElectricityConsumptionRangeInput,
    "tariff" | "vatRule" | "context"
  >,
  maxKwh: number,
): number {
  if (targetVnd <= 0) return 0;

  const calculateAt = (consumptionKwh: number) =>
    calculateElectricityBillBreakdown({
      ...input,
      consumptionKwh,
      otherChargesVnd: 0,
    }).totalPaymentVnd;

  let lowerKwh = 0;
  let upperKwh = Math.min(1, maxKwh);

  while (upperKwh < maxKwh && calculateAt(upperKwh) < targetVnd) {
    lowerKwh = upperKwh;
    upperKwh = Math.min(upperKwh * 2, maxKwh);
  }

  if (calculateAt(upperKwh) < targetVnd) {
    throw new RangeError(
      `Tổng tiền vượt phạm vi suy ngược tối đa ${maxKwh} kWh.`,
    );
  }

  for (let iteration = 0; iteration < 100; iteration += 1) {
    const midpointKwh = (lowerKwh + upperKwh) / 2;
    if (calculateAt(midpointKwh) < targetVnd) {
      lowerKwh = midpointKwh;
    } else {
      upperKwh = midpointKwh;
    }
  }

  return upperKwh;
}

/**
 * Inverse engine for an observed total payment. Unknown non-energy line items
 * are represented as a caller-supplied range, so the result remains a range
 * instead of pretending to be an exact kWh value.
 */
export function estimateElectricityConsumptionRangeFromTotal({
  tariff,
  vatRule,
  totalPaymentVnd,
  otherChargesVnd,
  context,
  maxKwh = 1_000_000,
}: EstimateElectricityConsumptionRangeInput): ElectricityConsumptionRange {
  assertNonNegativeFinite(totalPaymentVnd, "totalPaymentVnd");
  assertNonNegativeFinite(otherChargesVnd.minVnd, "otherChargesVnd.minVnd");
  assertNonNegativeFinite(otherChargesVnd.maxVnd, "otherChargesVnd.maxVnd");
  assertPositiveFinite(maxKwh, "maxKwh");

  if (otherChargesVnd.minVnd > otherChargesVnd.maxVnd) {
    throw new RangeError(
      "otherChargesVnd.minVnd không được lớn hơn otherChargesVnd.maxVnd.",
    );
  }

  if (otherChargesVnd.maxVnd > totalPaymentVnd) {
    throw new RangeError(
      "Khoản phí khác tối đa không được lớn hơn tổng tiền thanh toán.",
    );
  }

  const energyAndVatTargetVnd = {
    minVnd: totalPaymentVnd - otherChargesVnd.maxVnd,
    maxVnd: totalPaymentVnd - otherChargesVnd.minVnd,
  };
  const midpointOtherChargesVnd =
    (otherChargesVnd.minVnd + otherChargesVnd.maxVnd) / 2;
  const commonInput = { tariff, vatRule, context };

  const minKwh = invertEnergyAndVatAmount(
    energyAndVatTargetVnd.minVnd,
    commonInput,
    maxKwh,
  );
  const maxKwhResult = invertEnergyAndVatAmount(
    energyAndVatTargetVnd.maxVnd,
    commonInput,
    maxKwh,
  );
  const estimatedKwh = invertEnergyAndVatAmount(
    totalPaymentVnd - midpointOtherChargesVnd,
    commonInput,
    maxKwh,
  );

  return {
    minKwh,
    estimatedKwh,
    maxKwh: maxKwhResult,
    totalPaymentVnd,
    otherChargesVnd: { ...otherChargesVnd },
    energyAndVatTargetVnd,
    tariffVersion: tariff.version,
    vatRuleVersion: vatRule.version,
  };
}
