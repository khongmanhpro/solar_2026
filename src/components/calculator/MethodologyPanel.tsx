import { CALCULATION_CONSTANTS, REGULATION_CONSTANTS } from "@/config/defaults";
import { formatPaybackYears, formatPercent, formatVnd } from "@/lib/formatters";
import type { CalculationResponse, PackageCalculationResult } from "@/types/solar";

interface MethodologyPanelProps {
  result: CalculationResponse;
  selectedResult: PackageCalculationResult;
}

const DATA_STATUS_COPY: Record<string, { label: string; tone: "ok" | "warn" }> = {
  verified: { label: "Dữ liệu đã được kỹ sư duyệt", tone: "ok" },
  draft: { label: "Dữ liệu thật, đang chờ kỹ sư duyệt", tone: "warn" },
  demo: { label: "Dữ liệu mẫu — chỉ để tham khảo", tone: "warn" },
  expired: { label: "Có dữ liệu đã hết hiệu lực", tone: "warn" },
  disabled: { label: "Có dữ liệu đã bị vô hiệu", tone: "warn" },
};

const CONFIDENCE_COPY: Record<string, string> = {
  high: "Cao — có từ 3 kỳ hóa đơn gần đây",
  medium: "Trung bình — dựa trên 1–2 kỳ hóa đơn",
  low: "Thấp — thành phần hóa đơn chưa rõ",
  insufficient: "Chưa đủ dữ liệu",
};

const DAYTIME_LABEL = { low: "Ít ở nhà ban ngày", medium: "Có dùng một phần ban ngày", high: "Thường ở nhà ban ngày" } as const;

/**
 * "How we calculated this" — every source, assumption and the conservative
 * case, so customers can judge the estimate instead of trusting a number.
 */
export function MethodologyPanel({ result, selectedResult }: MethodologyPanelProps) {
  const settings = result.assumptions;
  const finance = CALCULATION_CONSTANTS.finance;
  const status = DATA_STATUS_COPY[result.metadata?.dataReadiness?.overallStatus ?? ""] ?? null;
  const confidence = CONFIDENCE_COPY[result.metadata?.confidence?.overall ?? ""] ?? null;
  const province = result.sourceSnapshot?.provinceFactor;
  const daytimeRatio = {
    low: settings.daytimeLowRatio,
    medium: settings.daytimeMediumRatio,
    high: settings.daytimeHighRatio,
  }[result.inputSummary.daytimeUsageLevel];
  const low = selectedResult.lowEstimate;
  const surplusSale = selectedResult.surplusSale;

  return (
    <details className="group rounded-[10px] border border-[var(--line-strong)] bg-[var(--paper)] p-5 sm:p-6">
      <summary className="flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-3">
        <span className="text-lg font-semibold text-[var(--ink)]">Chúng tôi tính như thế nào?</span>
        {status ? (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              status.tone === "ok"
                ? "bg-[var(--brand-soft)] text-[var(--brand-dark)]"
                : "bg-[var(--warning-soft)] text-[var(--warning-ink)]"
            }`}
          >
            {status.label}
          </span>
        ) : null}
      </summary>

      <div className="mt-5 grid gap-6 text-sm leading-6 text-[var(--ink)] lg:grid-cols-2">
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--brand)]">Kịch bản thận trọng</h4>
          <p className="mt-2">
            Nếu sản lượng thấp hơn {formatPercent((1 - settings.lowEstimateFactor) * 100)} (năm nhiều mây, bụi bẩn, che bóng nhẹ):
            tiết kiệm khoảng <strong>{formatVnd(low.monthlySavingsVnd)}/tháng</strong>, hoàn vốn{" "}
            <strong>{formatPaybackYears(low.paybackYears)}</strong>. Chúng tôi khuyên bạn quyết định dựa trên con số này.
          </p>
          {confidence ? (
            <p className="mt-3 text-[var(--muted)]">Độ tin cậy đầu vào: {confidence}.</p>
          ) : null}
        </section>

        <section>
          <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--brand)]">Nguồn dữ liệu</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Sản lượng theo tháng tại {province?.name ?? result.inputSummary.province}:{" "}
              {province?.sourceReference?.startsWith("PVGIS")
                ? "PVGIS 5.3 (Trung tâm Nghiên cứu chung, Ủy ban châu Âu) — dữ liệu vệ tinh/khí tượng 2005–2023, đã trừ ~14% tổn hao hệ thống."
                : "hệ số tỉnh nội bộ (chưa có dữ liệu theo mùa)."}
            </li>
            <li>
              {result.inputSummary.electricityTariffVersion?.startsWith("qd1279")
                ? "Biểu giá điện sinh hoạt 6 bậc theo Quyết định 1279/QĐ-BCT (hiệu lực 10/05/2025)"
                : `Biểu giá điện ${result.inputSummary.electricityTariffVersion ?? "hiện hành"}`}
              {result.inputSummary.vatRate ? `, VAT ${formatPercent(result.inputSummary.vatRate * 100)}` : ""}.
            </li>
            <li>Thông số gói: giá và thiết bị theo danh mục đang bán; xác nhận lại sau khảo sát.</li>
          </ul>
        </section>

        <section>
          <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--brand)]">Giả định chính</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              {DAYTIME_LABEL[result.inputSummary.daytimeUsageLevel]}: {formatPercent(daytimeRatio * 100)} điện dùng từ 6h–18h; mô phỏng từng giờ, 12 tháng, gồm cả ngày nắng và ngày âm u.
            </li>
            <li>
              Pin lưu trữ chỉ dùng {formatPercent(CALCULATION_CONSTANTS.battery.depthOfDischarge * 100)} dung lượng, hiệu suất sạc-xả{" "}
              {formatPercent(settings.batteryRoundTripEfficiency * 100)}; inverter hybrid tự tiêu thụ ~{CALCULATION_CONSTANTS.battery.hybridStandbyLoadWatts} W.
            </li>
            <li>
              Tấm pin suy giảm {formatPercent(finance.degradationFirstYear * 100)} năm đầu, sau đó {formatPercent(finance.degradationPerYear * 100)}/năm;
              giá điện tăng {formatPercent(finance.tariffEscalationRate * 100)}/năm; bảo trì {formatPercent(settings.maintenanceRatePerYear * 100)} giá gói/năm.
            </li>
            <li>
              Thay inverter năm {finance.inverterReplacementYear}
              {selectedResult.financial?.replacementCostsVnd.some((item) => item.item === "battery")
                ? ` và pin lưu trữ năm ${finance.batteryReplacementYear}`
                : ""}{" "}
              đã được trừ vào dòng tiền {settings.systemLifetimeYears} năm.
            </li>
          </ul>
        </section>

        <section>
          <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--brand)]">Điện dư và quy định 2026</h4>
          <p className="mt-2">
            Kết quả <strong>không cộng tiền bán điện dư</strong> vào hoàn vốn.
            {surplusSale && surplusSale.sellableKwhPerMonth >= 1
              ? ` Nếu đăng ký bán, bạn có thể bán khoảng ${Math.round(surplusSale.sellableKwhPerMonth)} kWh/tháng (tối đa ${formatPercent(surplusSale.maxShareOfGeneration * 100)} sản lượng), thêm ~${formatVnd(surplusSale.revenueVndPerMonth)}/tháng ở mức ~${surplusSale.priceVndPerKwh} đ/kWh.`
              : " Phương án này hầu như không có điện dư để bán."}
          </p>
          <p className="mt-2 text-[var(--muted)]">
            {REGULATION_CONSTANTS.surplusSale.legalBasis}. {REGULATION_CONSTANTS.surplusSale.priceNote}
          </p>
        </section>
      </div>

      <p className="mt-5 border-t border-[var(--line)] pt-4 text-xs text-[var(--muted)]">
        Phiên bản thuật toán {result.metadata?.algorithmVersion ?? "—"} · Mỗi kết quả lưu lại toàn bộ dữ liệu và giả định đã dùng để có thể kiểm tra lại.
      </p>
    </details>
  );
}
