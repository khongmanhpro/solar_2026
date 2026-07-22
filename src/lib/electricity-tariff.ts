import { getElectricityTariff } from "@/config/electricity-tariffs";
import type { ElectricityType } from "@/types/solar";

function assertNonNegativeFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} phải là số hữu hạn không âm.`);
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
