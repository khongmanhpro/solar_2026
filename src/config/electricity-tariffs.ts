import type { ElectricityType } from "@/types/solar";
import tariffRegistryJson from "../../data/electricity-tariffs.json";
import { parseElectricityTariffRegistry } from "@/lib/tariff-registry-validation";
import type {
  ElectricityTariffVersion,
  VatRuleVersion,
} from "@/types/electricity-tariff";

export type { ElectricityTariffTier } from "@/types/electricity-tariff";

export interface ElectricityTypeOption {
  value: ElectricityType;
  label: string;
  description: string;
}

export const ELECTRICITY_TYPE_OPTIONS = [
  {
    value: "residential",
    label: "Điện sinh hoạt hộ gia đình",
    description:
      "Điện sinh hoạt lũy tiến; engine mới chọn phiên bản biểu giá theo kỳ hóa đơn.",
  },
] as const satisfies readonly ElectricityTypeOption[];

export const ELECTRICITY_TARIFF_REGISTRY =
  parseElectricityTariffRegistry(tariffRegistryJson);

function requireTariffVersion(version: string): ElectricityTariffVersion {
  const tariff = ELECTRICITY_TARIFF_REGISTRY.tariffs.find(
    (candidate) => candidate.version === version,
  );

  if (!tariff) {
    throw new Error(`Không tìm thấy phiên bản biểu giá ${version}.`);
  }

  return tariff;
}

function requireVatRuleVersion(version: string): VatRuleVersion {
  const vatRule = ELECTRICITY_TARIFF_REGISTRY.vatRules.find(
    (candidate) => candidate.version === version,
  );

  if (!vatRule) {
    throw new Error(`Không tìm thấy phiên bản VAT ${version}.`);
  }

  return vatRule;
}

export const QD1279_RESIDENTIAL_TARIFF = requireTariffVersion(
  "qd1279-2025-05-10-v1",
);

export const QD14_FIVE_TIER_CANDIDATE = requireTariffVersion(
  "qd14-5-tier-screenshot-candidate-2025-05-29-v1",
);

export const VAT_8_PERCENT_NQ204 = requireVatRuleVersion(
  "vat-8-nq204-2025-07-01-v1",
);

/**
 * Legacy compatibility wrapper. Existing callers keep their signature while
 * using the official six-tier QD1279 rates. Date-aware production flows must
 * still go through the selector and its approval gate.
 */
export const RESIDENTIAL_ELECTRICITY_TARIFF =
  QD1279_RESIDENTIAL_TARIFF.tiers;

export function getElectricityTariff(type: ElectricityType) {
  switch (type) {
    case "residential":
      return RESIDENTIAL_ELECTRICITY_TARIFF;
  }
}
