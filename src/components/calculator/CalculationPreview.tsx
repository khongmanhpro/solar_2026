import { CalculationResults } from "@/components/calculator/CalculationResults";
import { LeadForm } from "@/components/calculator/LeadForm";
import { formatKwhRange } from "@/lib/formatters";
import type { CalculationResponse, SolarPackage } from "@/types/solar";

interface CalculationPreviewProps {
  result: CalculationResponse | null;
  packages: SolarPackage[];
  isSubmitting: boolean;
  isStale?: boolean;
}

export function CalculationPreview({
  result,
  packages,
  isSubmitting,
  isStale = false,
}: CalculationPreviewProps) {
  const recommendation = result?.recommendedPackage ?? null;

  // Keep the last successful result visible while a revised draft is being
  // recalculated. This prevents customers from losing the trusted comparison
  // they were already reading when an update fails or takes longer than usual.
  if (isSubmitting && !result) {
    return (
      <div className="flex min-h-[24rem] flex-col items-center justify-center rounded-2xl border border-[var(--line-strong)] bg-[var(--paper)] px-6 py-14 text-center" role="status">
        <div aria-hidden="true" className="solar-loader" />
        <p className="mt-6 font-display text-2xl font-semibold text-[var(--ink)]">
          Đang dựng phương án
        </p>
        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
          Hệ thống đang đối chiếu sản lượng, mức tự dùng và diện tích mái.
        </p>
      </div>
    );
  }

  if (result && !recommendation) {
    const unstableMoneyRecommendation =
      result.recommendationStability?.evaluated === true &&
      result.recommendationStability.stable === false;
    const consumption = result.normalizedInput?.monthlyConsumptionKwh.value;

    return (
      <div id="ket-qua" className="rounded-2xl border border-[var(--line-strong)] bg-[var(--paper)] px-6 py-12 sm:px-10 sm:py-14" tabIndex={-1}>
        <div className="max-w-3xl">
          <span className="inline-flex w-fit rounded-full bg-[var(--warning-soft)] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--warning-ink)]">
            Cần khảo sát thêm
          </span>
          <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
            {unstableMoneyRecommendation
              ? "Cần thêm thông tin trước khi chọn gói"
              : "Chưa có gói phù hợp hoàn toàn"}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
            {unstableMoneyRecommendation
              ? `Tổng tiền hiện chỉ xác định được khoảng ${consumption ? formatKwhRange(consumption.lowerBound, consumption.upperBound) : "chưa đủ dữ liệu"}. Các biên chưa dẫn tới cùng một gói, nên hệ thống không tự chốt phương án có vẻ chính xác.`
              : "Nhu cầu hiện chưa khớp hoàn toàn với các gói đang hoạt động. Kết quả tính toán đã được lưu để tư vấn viên kiểm tra phương án riêng; khả năng lắp đặt chỉ được xác nhận sau khảo sát mái."}
          </p>
        </div>

        <aside aria-label="Lưu ý về kết quả ước tính" className="mt-8 rounded-xl border border-[var(--line)] bg-[var(--admin-panel)] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--warning-ink)]">Lưu ý bắt buộc</p>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            Kết quả là ước tính dựa trên thông tin khách hàng cung cấp, dữ liệu sản phẩm và các giả định tính toán hiện tại. Sản lượng và chi phí thực tế có thể thay đổi theo thời tiết, hướng mái, độ che bóng, kết cấu mái, biểu giá điện và điều kiện thi công. Báo giá chính thức được xác nhận sau khi khảo sát công trình.
          </p>
          <p className="mt-4 break-all border-t border-[var(--line)] pt-4 text-xs font-semibold text-[var(--muted)]">
            Mã tính toán · {result.calculationId}
          </p>
        </aside>

        {isStale ? (
          <aside
            className="mt-8 rounded-xl border border-[var(--warning-line)] bg-[var(--warning-soft)] p-4 text-sm leading-6 text-[var(--warning-ink)]"
            role="status"
          >
            <strong>Kết quả này đang theo thông tin cũ.</strong> Hãy cập nhật
            phép tính trước khi đăng ký khảo sát hoặc liên hệ theo phương án.
          </aside>
        ) : (
          <LeadForm calculationId={result.calculationId} settings={result.assumptions} />
        )}
      </div>
    );
  }

  if (result && recommendation) {
    const snapshotPackages = result.sourceSnapshot?.packages;
    const packagesForCalculation = snapshotPackages ?? packages;

    return (
      <CalculationResults
        isStale={isStale}
        key={result.calculationId}
        packages={packagesForCalculation}
        result={result}
      />
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--paper)] px-6 py-12 text-center sm:px-10">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand)]">Bản xem trước</p>
        <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight text-[var(--ink)] sm:text-3xl">
          Hoàn thành biểu mẫu để nhận phân tích
        </h2>
        <p className="mt-3 text-base leading-7 text-[var(--muted)]">
          Sau khi bấm “Xác nhận và tính phương án”, bạn sẽ thấy công suất đề xuất, tiết kiệm ước tính, thời gian hoàn vốn và so sánh các gói.
        </p>
      </div>

      <div className="mt-10 grid gap-4 border-t border-[var(--line)] pt-8 sm:grid-cols-3">
        {[
          ["01", "Ước tính sản lượng"],
          ["02", "Kiểm tra nhu cầu và mái"],
          ["03", "Chọn phương án phù hợp"],
        ].map(([step, label]) => (
          <div key={step}>
            <p className="font-display text-lg font-semibold text-[var(--brand)]">{step}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
