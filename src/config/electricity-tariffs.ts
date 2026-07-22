import type { ElectricityType } from "@/types/solar";

export interface ElectricityTariffTier {
  label: string;
  fromKwh: number;
  toKwh: number | null;
  unitPriceVndPerKwh: number;
}

export interface ElectricityTypeOption {
  value: ElectricityType;
  label: string;
  description: string;
}

export const ELECTRICITY_TYPE_OPTIONS = [
  {
    value: "residential",
    label: "Điện sinh hoạt hộ gia đình",
    description: "Tính lũy tiến theo 5 bậc sản lượng, chưa bao gồm VAT.",
  },
] as const satisfies readonly ElectricityTypeOption[];

export const RESIDENTIAL_ELECTRICITY_TARIFF = [
  {
    label: "Bậc 1",
    fromKwh: 0,
    toKwh: 100,
    unitPriceVndPerKwh: 1_984,
  },
  {
    label: "Bậc 2",
    fromKwh: 100,
    toKwh: 200,
    unitPriceVndPerKwh: 2_380,
  },
  {
    label: "Bậc 3",
    fromKwh: 200,
    toKwh: 400,
    unitPriceVndPerKwh: 2_998,
  },
  {
    label: "Bậc 4",
    fromKwh: 400,
    toKwh: 700,
    unitPriceVndPerKwh: 3_571,
  },
  {
    label: "Bậc 5",
    fromKwh: 700,
    toKwh: null,
    unitPriceVndPerKwh: 3_967,
  },
] as const satisfies readonly ElectricityTariffTier[];

export function getElectricityTariff(type: ElectricityType) {
  switch (type) {
    case "residential":
      return RESIDENTIAL_ELECTRICITY_TARIFF;
  }
}
