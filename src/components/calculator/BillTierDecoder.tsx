import { compareBillTiers } from "@/lib/bill-tier-comparison";
import { formatKwh, formatVnd } from "@/lib/formatters";
import type { SolarCalculationInput } from "@/types/solar";

interface BillTierDecoderProps {
  input: SolarCalculationInput;
  gridConsumptionAfterSolarKwh: number;
}

const priceFormatter = new Intl.NumberFormat("vi-VN");

function tierRange(fromKwh: number, toKwh: number | null): string {
  return toKwh === null
    ? `trên ${priceFormatter.format(fromKwh)} kWh`
    : `${priceFormatter.format(fromKwh)}–${priceFormatter.format(toKwh)} kWh`;
}

/** Shows which EVN tiers solar removes: the expensive top tiers go first. */
export function BillTierDecoder({ input, gridConsumptionAfterSolarKwh }: BillTierDecoderProps) {
  const comparison = compareBillTiers(input, gridConsumptionAfterSolarKwh);
  if (!comparison) return null;

  const rows = comparison.rows.filter((row) => row.beforeKwh > 0);
  if (rows.length === 0) return null;
  const maxVnd = Math.max(...rows.map((row) => row.beforeVnd));
  const removedTiers = rows.filter((row) => row.beforeKwh > 0 && row.afterKwh < row.beforeKwh - 0.5);
  const cheapestRemovedPrice =
    removedTiers.length > 0
      ? Math.min(...removedTiers.map((row) => row.unitPriceVndPerKwh))
      : null;

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 sm:p-6">
      <p className="text-sm leading-6 text-[var(--ink)]">
        Hóa đơn EVN tính theo bậc thang: dùng càng nhiều, mỗi kWh càng đắt. Điện mặt trời thay phần điện
        <strong> ở các bậc trên cùng</strong> — đắt nhất — trước
        {cheapestRemovedPrice !== null
          ? `, nên mỗi kWh tự sản xuất giúp bạn tránh khoảng ${priceFormatter.format(cheapestRemovedPrice)}–${priceFormatter.format(Math.max(...removedTiers.map((row) => row.unitPriceVndPerKwh)))} đ/kWh (trước VAT).`
          : "."}
      </p>
      <ul className="mt-5 space-y-3" aria-label="So sánh tiền điện theo từng bậc, trước và sau khi lắp">
        {rows.map((row) => {
          const beforeWidth = maxVnd > 0 ? (row.beforeVnd / maxVnd) * 100 : 0;
          const afterWidth = maxVnd > 0 ? (row.afterVnd / maxVnd) * 100 : 0;
          const removed = row.afterKwh < row.beforeKwh - 0.5;
          return (
            <li key={row.tierCode}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                <span className="font-semibold text-[var(--ink)]">
                  {row.label} · {priceFormatter.format(row.unitPriceVndPerKwh)} đ/kWh
                  <span className="ml-2 font-normal text-[var(--muted)]">{tierRange(row.fromKwh, row.toKwh)}</span>
                </span>
                <span className="text-[var(--muted)]">
                  {formatKwh(row.beforeKwh)} → <strong className={removed ? "text-[var(--brand-dark)]" : "text-[var(--ink)]"}>{formatKwh(row.afterKwh)}</strong>
                </span>
              </div>
              <div className="relative mt-1.5 h-3 overflow-hidden rounded-full bg-[var(--admin-panel)]" aria-hidden="true">
                <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--line-strong)]" style={{ width: `${beforeWidth}%` }} />
                <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--brand)]" style={{ width: `${afterWidth}%` }} />
              </div>
              <p className="sr-only">
                {row.label}: trước {formatVnd(row.beforeVnd)}, sau {formatVnd(row.afterVnd)}.
              </p>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[var(--line)] pt-4 text-sm">
        <span className="flex items-center gap-2 text-[var(--muted)]">
          <span className="h-2.5 w-5 rounded-full bg-[var(--line-strong)]" aria-hidden="true" /> Trước khi lắp: <strong className="text-[var(--ink)]">{formatVnd(comparison.totalBeforeVnd)}</strong>
        </span>
        <span className="flex items-center gap-2 text-[var(--muted)]">
          <span className="h-2.5 w-5 rounded-full bg-[var(--brand)]" aria-hidden="true" /> Sau khi lắp (tháng điển hình): <strong className="text-[var(--brand-dark)]">{formatVnd(comparison.totalAfterVnd)}</strong>
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
        Biểu giá {comparison.tariffVersion}{comparison.vatRate > 0 ? `, đã gồm VAT ${Math.round(comparison.vatRate * 100)}%` : ""}. Tháng điển hình dùng mức điện lưới trung bình năm; từng tháng thực tế thay đổi theo mùa.
      </p>
    </div>
  );
}
