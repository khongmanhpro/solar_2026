/**
 * Appliances customers plan to add soon. Monthly energy and daytime share are
 * DRAFT household assumptions for sizing, shown to the customer as such.
 */
export const PLANNED_LOAD_IDS = [
  "air-conditioner",
  "electric-motorbike",
  "electric-car",
  "water-heater",
] as const;

export type PlannedLoadId = (typeof PLANNED_LOAD_IDS)[number];

export interface PlannedLoadOption {
  id: PlannedLoadId;
  label: string;
  description: string;
  monthlyKwh: number;
  /** Share of this load used between 6h and 18h. */
  daytimeShare: number;
}

export const PLANNED_LOAD_OPTIONS: readonly PlannedLoadOption[] = [
  {
    id: "air-conditioner",
    label: "Thêm 1 máy lạnh",
    description: "1–1,5 HP inverter, ~6 giờ/ngày",
    monthlyKwh: 150,
    daytimeShare: 0.4,
  },
  {
    id: "electric-motorbike",
    label: "Xe máy điện",
    description: "Sạc ~3 lần/tuần",
    monthlyKwh: 40,
    daytimeShare: 0.3,
  },
  {
    id: "electric-car",
    label: "Ô tô điện",
    description: "~1.200 km/tháng, sạc tại nhà",
    monthlyKwh: 180,
    daytimeShare: 0.3,
  },
  {
    id: "water-heater",
    label: "Bình nóng lạnh",
    description: "~1 giờ/ngày",
    monthlyKwh: 75,
    daytimeShare: 0.2,
  },
] as const;

export function resolvePlannedLoads(ids: readonly PlannedLoadId[] | undefined) {
  const selected = new Set(ids ?? []);
  return PLANNED_LOAD_OPTIONS.filter((option) => selected.has(option.id)).map(
    ({ id, monthlyKwh, daytimeShare }) => ({ id, monthlyKwh, daytimeShare }),
  );
}
