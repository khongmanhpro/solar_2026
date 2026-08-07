import { describe, expect, it } from "vitest";

import {
  BACKUP_DEVICE_PRESETS,
  calculateBackupDeviceWatts,
  getBackupDeviceCautions,
  getBackupDeviceLabels,
} from "@/config/backup-devices";

describe("backup device catalog", () => {
  it("converts the family preset into an internal load estimate", () => {
    const familyPreset = BACKUP_DEVICE_PRESETS.find((preset) => preset.id === "family");

    expect(familyPreset).toBeDefined();
    expect(calculateBackupDeviceWatts(familyPreset?.deviceIds ?? [])).toBe(530);
    expect(getBackupDeviceLabels(familyPreset?.deviceIds ?? [])).toEqual([
      "Tủ lạnh",
      "Đèn trong nhà",
      "Wi-Fi / camera",
      "Quạt",
      "Tivi",
    ]);
  });

  it("does not double-count a device when ids are repeated", () => {
    expect(calculateBackupDeviceWatts(["refrigerator", "refrigerator"])).toBe(180);
    expect(calculateBackupDeviceWatts([])).toBe(0);
  });

  it("keeps motor and compressor cautions visible to the UI", () => {
    expect(getBackupDeviceCautions(["water-pump", "air-conditioner"])).toEqual([
      "Máy bơm nước: Cần kiểm tra dòng khởi động khi khảo sát.",
      "Điều hòa: Cần xác nhận công suất máy và dòng khởi động.",
    ]);
  });
});
