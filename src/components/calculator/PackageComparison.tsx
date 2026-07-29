import {
  formatCustomerPackageName,
  formatKwh,
  formatPaybackYears,
  formatVnd,
} from "@/lib/formatters";
import type { PackageCalculationResult, SolarPackage } from "@/types/solar";

interface PackageComparisonProps {
  results: PackageCalculationResult[];
  packages: SolarPackage[];
  recommendedPackageId: string;
  selectedPackageId: string;
  onSelect: (packageId: string) => void;
}

function systemTypeLabel(solarPackage: SolarPackage): string {
  if (solarPackage.batteryCapacityKwh > 0) {
    return `Có pin ${solarPackage.batteryCapacityKwh} kWh`;
  }
  return "Không có pin lưu trữ";
}

export function PackageComparison({
  results,
  packages,
  recommendedPackageId,
  selectedPackageId,
  onSelect,
}: PackageComparisonProps) {
  if (results.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--line-strong)] p-6 text-sm leading-6 text-[var(--muted)]">
        Chưa có gói đủ điều kiện để so sánh với dữ liệu hiện tại.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {results.map((packageResult) => {
        const solarPackage = packages.find(
          (item) => item.id === packageResult.packageId,
        );
        if (!solarPackage) return null;

        const isRecommended = solarPackage.id === recommendedPackageId;
        const isSelected = solarPackage.id === selectedPackageId;

        return (
          <article
            className={`relative flex flex-col rounded-2xl border bg-[var(--paper)] p-5 transition ${
              isRecommended
                ? "border-[var(--success)] bg-[var(--brand-soft)]"
                : isSelected
                  ? "border-[var(--brand)]"
                  : "border-[var(--line)] hover:border-[var(--brand)]"
            }`}
            key={solarPackage.id}
          >
            {isRecommended ? (
              <span className="absolute -top-3 left-5 rounded-full bg-[var(--success)] px-3 py-1 text-xs font-semibold text-[var(--paper)]">
                Đề xuất
              </span>
            ) : null}
            <div className="flex min-h-7 items-start justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                {solarPackage.code}
              </p>
              {isSelected && !isRecommended ? (
                <span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--brand-dark)]">
                  Đang xem
                </span>
              ) : null}
            </div>
            <h4 className="mt-3 text-2xl font-semibold leading-snug text-[var(--ink)]">
              {formatCustomerPackageName(solarPackage.name)}
            </h4>
            <p className="mt-3 text-3xl font-semibold text-[var(--brand-dark)]">
              {formatVnd(solarPackage.priceVnd)}
            </p>

            <dl className="mt-5 flex-1 divide-y divide-[var(--line)] border-y border-[var(--line)] text-sm">
              {[
                ["Công suất", `${solarPackage.capacityKwp} kWp`],
                ["Sản lượng", formatKwh(packageResult.adjustedGenerationKwh)],
                ["Tiết kiệm/tháng", formatVnd(packageResult.monthlySavingsVnd)],
                ["Hóa đơn còn lại", formatVnd(packageResult.billAfterSolarVnd)],
                ["Hoàn vốn", formatPaybackYears(packageResult.paybackYears)],
                ["Diện tích mái", `${solarPackage.requiredRoofAreaM2} m²`],
                ["Lưu trữ", systemTypeLabel(solarPackage)],
              ].map(([label, value]) => (
                <div className="flex items-start justify-between gap-3 py-2.5" key={label}>
                  <dt className="text-[var(--muted)]">{label}</dt>
                  <dd className="break-words text-right font-semibold text-[var(--ink)]">{value}</dd>
                </div>
              ))}
            </dl>

            <button
              aria-pressed={isSelected}
              className={`mt-5 min-h-11 rounded-lg px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-dark)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)] ${
                isSelected
                  ? "bg-[var(--brand-dark)] text-[var(--paper)] hover:bg-[var(--ink)]"
                  : "bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--brand-dark)]"
              }`}
              type="button"
              onClick={() => onSelect(solarPackage.id)}
            >
              {isSelected ? "Đang xem gói này" : "Chọn gói này"}
            </button>
          </article>
        );
      })}
    </div>
  );
}
