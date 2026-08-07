export const BACKUP_DEVICE_CATALOG_VERSION = "household-backup-devices-v1";

export type BackupDeviceId =
  | "refrigerator"
  | "lights"
  | "wifi-camera"
  | "fans"
  | "television"
  | "water-pump"
  | "roller-shutter"
  | "air-conditioner";

export interface BackupDeviceOption {
  id: BackupDeviceId;
  label: string;
  description: string;
  estimatedWatts: number;
  caution?: string;
}

/**
 * Customer-friendly sizing estimates. These are not equipment nameplate values;
 * they are conservative household assumptions for an initial consultation.
 */
export const BACKUP_DEVICE_OPTIONS: readonly BackupDeviceOption[] = [
  {
    id: "refrigerator",
    label: "Tủ lạnh",
    description: "Một chiếc",
    estimatedWatts: 180,
  },
  {
    id: "lights",
    label: "Đèn trong nhà",
    description: "Một số phòng",
    estimatedWatts: 100,
  },
  {
    id: "wifi-camera",
    label: "Wi-Fi / camera",
    description: "Modem và camera",
    estimatedWatts: 30,
  },
  {
    id: "fans",
    label: "Quạt",
    description: "Tối đa hai chiếc",
    estimatedWatts: 120,
  },
  {
    id: "television",
    label: "Tivi",
    description: "Một chiếc",
    estimatedWatts: 100,
  },
  {
    id: "water-pump",
    label: "Máy bơm nước",
    description: "Một máy gia đình",
    estimatedWatts: 750,
    caution: "Cần kiểm tra dòng khởi động khi khảo sát.",
  },
  {
    id: "roller-shutter",
    label: "Cửa cuốn",
    description: "Một bộ motor",
    estimatedWatts: 500,
    caution: "Cần kiểm tra motor khi khảo sát.",
  },
  {
    id: "air-conditioner",
    label: "Điều hòa",
    description: "Một máy khoảng 1 HP",
    estimatedWatts: 1_200,
    caution: "Cần xác nhận công suất máy và dòng khởi động.",
  },
] as const;

export const BACKUP_DEVICE_PRESETS = [
  {
    id: "essential",
    label: "Cơ bản",
    description: "Tủ lạnh, đèn và Wi-Fi",
    deviceIds: ["refrigerator", "lights", "wifi-camera"] as BackupDeviceId[],
  },
  {
    id: "family",
    label: "Gia đình",
    description: "Thêm quạt và tivi",
    deviceIds: [
      "refrigerator",
      "lights",
      "wifi-camera",
      "fans",
      "television",
    ] as BackupDeviceId[],
  },
  {
    id: "comfort",
    label: "Tiện nghi",
    description: "Thêm cửa cuốn",
    deviceIds: [
      "refrigerator",
      "lights",
      "wifi-camera",
      "fans",
      "television",
      "roller-shutter",
    ] as BackupDeviceId[],
  },
] as const;

export function calculateBackupDeviceWatts(
  deviceIds: readonly BackupDeviceId[],
): number {
  const selected = new Set(deviceIds);
  return BACKUP_DEVICE_OPTIONS.reduce(
    (total, device) => total + (selected.has(device.id) ? device.estimatedWatts : 0),
    0,
  );
}

export function getBackupDeviceLabels(
  deviceIds: readonly BackupDeviceId[],
): string[] {
  const selected = new Set(deviceIds);
  return BACKUP_DEVICE_OPTIONS
    .filter((device) => selected.has(device.id))
    .map((device) => device.label);
}

export function getBackupDeviceCautions(
  deviceIds: readonly BackupDeviceId[],
): string[] {
  const selected = new Set(deviceIds);
  return BACKUP_DEVICE_OPTIONS
    .filter((device) => selected.has(device.id) && device.caution)
    .map((device) => `${device.label}: ${device.caution}`);
}
