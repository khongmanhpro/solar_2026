"use client";

import { useState } from "react";

import {
  BACKUP_DEVICE_OPTIONS,
  calculateBackupDeviceWatts,
  getBackupDeviceCautions,
  type BackupDeviceId,
} from "@/config/backup-devices";
import { backupPowerWarning, batteryUpgradeValue, estimateBackup } from "@/lib/backup-planner";
import { requiredBackupReserveKwh } from "@/lib/energy-simulation";
import { formatCustomerPackageName, formatVnd } from "@/lib/formatters";
import type { PackageCalculationResult, SolarPackage } from "@/types/solar";

interface BackupPlannerProps {
  selectedPackage: SolarPackage;
  selectedResult: PackageCalculationResult;
  alternatives: { solarPackage: SolarPackage; result: PackageCalculationResult }[];
  onSelectPackage: (packageId: string) => void;
  /** Outage load the customer declared in the form; the planner starts there. */
  declaredBackup?: { watts: number; hours: number | null } | null;
}

const DEFAULT_DEVICES: BackupDeviceId[] = ["refrigerator", "lights", "wifi-camera", "fans"];
const hoursFormatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const kwhFormatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

const SAME_PV_TOLERANCE_KWP = 0.1;

function formatHours(hours: number | null): string {
  if (hours === null) return "—";
  if (hours >= 48) return "trên 2 ngày";
  return `khoảng ${hoursFormatter.format(Math.max(1, hours))} giờ`;
}

/**
 * Honest battery storytelling: a battery is bought for outages, so show how
 * long chosen appliances run — and what the battery adds over grid-tied.
 */
export function BackupPlanner({
  selectedPackage,
  selectedResult,
  alternatives,
  onSelectPackage,
  declaredBackup = null,
}: BackupPlannerProps) {
  const declared = declaredBackup && declaredBackup.watts > 0 ? declaredBackup : null;
  // null = showing the load the customer declared; a list = exploring devices.
  const [deviceIds, setDeviceIds] = useState<BackupDeviceId[] | null>(
    declared ? null : DEFAULT_DEVICES,
  );
  const usingDeclared = deviceIds === null && declared !== null;
  const hasBattery = selectedPackage.batteryCapacityKwh > 0;
  const hybridAlternative = alternatives.find((item) => item.solarPackage.batteryCapacityKwh > 0);
  // The "battery value" comparison is only honest between packages with the
  // same PV array; otherwise the gap includes extra panels, not just the battery.
  const samePvArray = (item: (typeof alternatives)[number]) =>
    Math.abs(item.solarPackage.capacityKwp - selectedPackage.capacityKwp) <= SAME_PV_TOLERANCE_KWP;
  const gridAlternative = alternatives.find(
    (item) => item.solarPackage.batteryCapacityKwh === 0 && samePvArray(item),
  );
  const hybridSamePv = alternatives.find(
    (item) => item.solarPackage.batteryCapacityKwh > 0 && samePvArray(item),
  );
  const batteryPackage = hasBattery ? selectedPackage : hybridAlternative?.solarPackage ?? null;
  const loadWatts = usingDeclared ? declared.watts : calculateBackupDeviceWatts(deviceIds ?? []);
  const reserveKwh = declared ? requiredBackupReserveKwh(declared.watts, declared.hours) : 0;
  const estimate = batteryPackage
    ? estimateBackup(batteryPackage, loadWatts)
    : null;
  const cautions = getBackupDeviceCautions(deviceIds ?? []);
  const upgrade =
    hasBattery && gridAlternative
      ? batteryUpgradeValue(
          { priceVnd: selectedPackage.priceVnd, monthlySavingsVnd: selectedResult.monthlySavingsVnd },
          { priceVnd: gridAlternative.solarPackage.priceVnd, monthlySavingsVnd: gridAlternative.result.monthlySavingsVnd },
        )
      : !hasBattery && hybridSamePv
        ? batteryUpgradeValue(
            { priceVnd: hybridSamePv.solarPackage.priceVnd, monthlySavingsVnd: hybridSamePv.result.monthlySavingsVnd },
            { priceVnd: selectedPackage.priceVnd, monthlySavingsVnd: selectedResult.monthlySavingsVnd },
          )
        : null;

  function toggle(id: BackupDeviceId) {
    setDeviceIds((current) => {
      const list = current ?? [];
      return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <div className="rounded-[10px] border border-[var(--line)] bg-[var(--paper)] p-5 sm:p-6">
        {hasBattery ? (
          <p className="text-sm leading-6 text-[var(--ink)]">
            Pin {selectedPackage.batteryCapacityKwh} kWh dùng được khoảng {hoursFormatter.format(estimate?.usableKwh ?? 0)} kWh.
            {usingDeclared ? " Đang tính theo nhu cầu bạn khai; có thể chọn thiết bị khác để thử:" : " Chọn thiết bị bạn muốn giữ khi mất điện:"}
          </p>
        ) : (
          <p className="text-sm leading-6 text-[var(--ink)]">
            <strong>Gói hòa lưới tự ngắt khi lưới điện mất</strong> (yêu cầu an toàn), nên không có điện dự phòng.
            {batteryPackage
              ? ` Nếu chọn gói có pin ${batteryPackage.batteryCapacityKwh} kWh, thiết bị bạn chọn dưới đây sẽ chạy được:`
              : " Hiện chưa có gói có pin phù hợp trong phần so sánh."}
          </p>
        )}

        {batteryPackage ? (
          <>
            {declared ? (
              <div className="mt-4 rounded-[10px] border border-[var(--line-strong)] p-4 text-sm leading-6 text-[var(--ink)]">
                <p>
                  <strong>Theo nhu cầu bạn khai:</strong> {hoursFormatter.format(declared.watts)} W
                  {declared.hours ? ` trong ${kwhFormatter.format(declared.hours)} giờ` : ""}.
                </p>
                {hasBattery && reserveKwh > 0 ? (
                  <p className="mt-1 text-[var(--muted)]">
                    Để luôn sẵn điện cho nhu cầu này, pin giữ lại khoảng {kwhFormatter.format(reserveKwh)} kWh không dùng hằng ngày,
                    nên tiền tiết kiệm thấp hơn so với khi không cần dự phòng.
                  </p>
                ) : null}
                {usingDeclared ? null : (
                  <button
                    className="mt-2 text-sm font-semibold text-[var(--brand-dark)] underline underline-offset-2"
                    onClick={() => setDeviceIds(null)}
                    type="button"
                  >
                    Quay lại nhu cầu bạn khai
                  </button>
                )}
              </div>
            ) : null}
            <fieldset className="mt-4">
              <legend className="sr-only">Thiết bị cần giữ khi mất điện</legend>
              <div className="flex flex-wrap gap-2">
                {BACKUP_DEVICE_OPTIONS.map((device) => {
                  const checked = deviceIds?.includes(device.id) ?? false;
                  return (
                    <label
                      className={`cursor-pointer rounded-full border px-3 py-2 text-sm transition focus-within:ring-2 focus-within:ring-[var(--brand-dark)] ${
                        checked
                          ? "border-[var(--brand)] bg-[var(--brand-soft)] font-semibold text-[var(--brand-dark)]"
                          : "border-[var(--line-strong)] text-[var(--ink)] hover:border-[var(--brand)]"
                      }`}
                      key={device.id}
                    >
                      <input
                        checked={checked}
                        className="sr-only"
                        onChange={() => toggle(device.id)}
                        type="checkbox"
                      />
                      {device.label} · {device.estimatedWatts} W
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="mt-5 rounded-[10px] bg-[var(--ink)] p-5 text-[var(--paper)]" aria-live="polite">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--focus)]">Khi pin đầy, mất điện lưới</p>
              <p className="mt-2 text-3xl font-semibold">{formatHours(estimate?.hours ?? null)}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--line)]">
                {usingDeclared ? "Tải bạn khai" : "Tải"} {hoursFormatter.format(loadWatts)} W tính theo công suất danh định — con số thận trọng; tủ lạnh và máy lạnh inverter thường chạy lâu hơn.
                Ban ngày có nắng, tấm pin tiếp tục sạc thêm.
              </p>
            </div>
            {estimate?.exceedsBackupPower ? (
              <p className="mt-3 rounded-[8px] bg-[var(--warning-soft)] p-3 text-sm text-[var(--warning-ink)]" role="alert">
                {backupPowerWarning(estimate.backupKw, estimate.backupKwSource)}
              </p>
            ) : null}
            {cautions.length > 0 ? (
              <ul className="mt-3 list-disc pl-5 text-xs leading-5 text-[var(--muted)]">
                {cautions.map((caution) => <li key={caution}>{caution}</li>)}
              </ul>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="rounded-[10px] border border-[var(--line)] bg-[var(--admin-panel)] p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--brand)]">Pin có đáng tiền không?</p>
        {upgrade ? (
          <>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">Chi phí thêm cho pin</dt>
                <dd className="font-semibold text-[var(--ink)]">{formatVnd(upgrade.extraPriceVnd)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">Tiết kiệm thêm mỗi tháng</dt>
                <dd className="font-semibold text-[var(--ink)]">{formatVnd(Math.max(0, upgrade.extraMonthlySavingsVnd))}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">Riêng phần pin tự hoàn vốn</dt>
                <dd className="font-semibold text-[var(--ink)]">
                  {upgrade.standalonePaybackYears === null ? "Không hoàn vốn" : `~${upgrade.standalonePaybackYears.toFixed(0)} năm`}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-sm leading-6 text-[var(--ink)]">
              {upgrade.standalonePaybackYears !== null && upgrade.standalonePaybackYears <= 8
                ? "Pin vừa giúp tiết kiệm thêm vừa có điện khi mất điện."
                : "Giá trị chính của pin là có điện khi mất điện lưới, không phải tiền tiết kiệm. Chỉ nên chọn nếu khu vực bạn hay cúp điện hoặc cần giữ thiết bị quan trọng."}
            </p>
            {!hasBattery && hybridAlternative ? (
              <button
                className="mt-4 min-h-11 rounded-[8px] bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-[var(--paper)] hover:bg-[var(--brand-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-dark)] focus-visible:ring-offset-2"
                onClick={() => onSelectPackage(hybridAlternative.solarPackage.id)}
                type="button"
              >
                Xem {formatCustomerPackageName(hybridAlternative.solarPackage.name)}
              </button>
            ) : null}
            {hasBattery && gridAlternative ? (
              <button
                className="mt-4 min-h-11 rounded-[8px] border border-[var(--line-strong)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] hover:border-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-dark)] focus-visible:ring-offset-2"
                onClick={() => onSelectPackage(gridAlternative.solarPackage.id)}
                type="button"
              >
                So với {formatCustomerPackageName(gridAlternative.solarPackage.name)}
              </button>
            ) : null}
          </>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[var(--ink)]">
            Chưa có phương án đối chiếu có/không pin trong phần so sánh. Kỹ sư sẽ tư vấn khi khảo sát nếu bạn cần điện dự phòng.
          </p>
        )}
      </div>
    </div>
  );
}
