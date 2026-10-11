import { ELECTRICITY_TARIFF_REGISTRY } from "@/config/electricity-tariffs";
import { calculateElectricityEnergyCharge } from "@/lib/electricity-tariff";
import type { SolarCalculationInput } from "@/types/solar";

export interface TierComparisonRow {
  tierCode: string;
  label: string;
  fromKwh: number;
  toKwh: number | null;
  unitPriceVndPerKwh: number;
  beforeKwh: number;
  afterKwh: number;
  /** VAT-inclusive charges, consistent with the rest of the result screen. */
  beforeVnd: number;
  afterVnd: number;
}

export interface TierComparison {
  tariffVersion: string;
  vatRate: number;
  rows: TierComparisonRow[];
  totalBeforeVnd: number;
  totalAfterVnd: number;
}

/**
 * Explains the EVN tiered bill before and after solar for a typical month.
 * Solar removes the most expensive top tiers first — the key insight most
 * customers never see on their bill. Returns null for old snapshots that do
 * not carry the tariff contract used by the calculation.
 */
export function compareBillTiers(
  input: Pick<
    SolarCalculationInput,
    "electricityTariffVersion" | "tariffBillingContext" | "monthlyConsumptionKwh" | "vatRate"
  >,
  gridConsumptionAfterSolarKwh: number,
): TierComparison | null {
  if (!input.electricityTariffVersion || !input.tariffBillingContext) return null;
  const tariff = ELECTRICITY_TARIFF_REGISTRY.tariffs.find(
    (candidate) => candidate.version === input.electricityTariffVersion,
  );
  if (!tariff) return null;

  const vatMultiplier = 1 + (input.vatRate ?? 0);
  const before = calculateElectricityEnergyCharge({
    tariff,
    consumptionKwh: Math.max(0, input.monthlyConsumptionKwh),
    context: input.tariffBillingContext,
  });
  const after = calculateElectricityEnergyCharge({
    tariff,
    consumptionKwh: Math.max(
      0,
      Math.min(input.monthlyConsumptionKwh, gridConsumptionAfterSolarKwh),
    ),
    context: input.tariffBillingContext,
  });

  const rows = before.tiers.map((tier, index) => {
    const afterTier = after.tiers[index];
    return {
      tierCode: tier.tierCode,
      label: tier.label,
      fromKwh: tier.fromKwh,
      toKwh: tier.toKwh,
      unitPriceVndPerKwh: tier.unitPriceVndPerKwh,
      beforeKwh: tier.consumptionKwh,
      afterKwh: afterTier?.consumptionKwh ?? 0,
      beforeVnd: tier.rawChargeVnd * vatMultiplier,
      afterVnd: (afterTier?.rawChargeVnd ?? 0) * vatMultiplier,
    };
  });

  return {
    tariffVersion: tariff.version,
    vatRate: input.vatRate ?? 0,
    rows,
    totalBeforeVnd: rows.reduce((total, row) => total + row.beforeVnd, 0),
    totalAfterVnd: rows.reduce((total, row) => total + row.afterVnd, 0),
  };
}
