import { CalculationResults } from "@/components/calculator/CalculationResults";
import { LeadForm } from "@/components/calculator/LeadForm";
import {
  formatCustomerPackageName,
  formatKwh,
  formatKwhRange,
  formatPaybackYears,
  formatVnd,
} from "@/lib/formatters";
import type {
  CalculationResponse,
  NoRecommendationReason,
  RecommendationRangeOption,
  SolarPackage,
} from "@/types/solar";

const NO_RECOMMENDATION_COPY: Record<
  NoRecommendationReason,
  { title: string; body: string }
> = {
  not_economical: {
    title: "Lắp điện mặt trời lúc này chưa có lợi về kinh tế",
    body: "Với mức dùng điện hiện tại, các gói đang bán không hoàn vốn trong 10 năm. Chúng tôi không đề xuất một khoản đầu tư không có lợi cho bạn. Nếu nhu cầu tăng (thêm điều hòa, xe điện, kinh doanh tại nhà) hoặc bạn muốn hệ nhỏ hơn, hãy để lại thông tin để kỹ sư tư vấn riêng.",
  },
  backup_exceeds_battery: {
    title: "Nhu cầu dự phòng vượt dung lượng pin của các gói sẵn có",
    body: "Tải thiết yếu × số giờ dự phòng bạn khai cần nhiều điện hơn pin 16 kWh có thể giữ. Kỹ sư sẽ tư vấn cấu hình pin lớn hơn (ví dụ 32 kWh) hoặc giảm tải dự phòng.",
  },
  backup_needs_battery: {
    title: "Chưa có gói có pin lưu trữ phù hợp",
    body: "Bạn cần điện dự phòng nhưng hiện không có gói hybrid kèm pin phù hợp với điều kiện đã chọn. Kỹ sư sẽ tư vấn cấu hình riêng.",
  },
  roof_too_small: {
    title: "Diện tích mái chưa đủ cho các gói sẵn có",
    body: "Gói nhỏ nhất cần nhiều diện tích hơn mái bạn khai. Kỹ sư có thể khảo sát để tận dụng thêm mái phụ hoặc đề xuất hệ nhỏ hơn.",
  },
  phase_mismatch: {
    title: "Chưa có gói đúng loại điện 1 pha / 3 pha của bạn",
    body: "Hiện chưa có gói phù hợp với loại điện đã chọn. Kỹ sư sẽ tư vấn cấu hình phù hợp.",
  },
  no_active_package: {
    title: "Danh mục gói đang được cập nhật",
    body: "Hiện chưa có gói nào đang mở bán. Vui lòng để lại thông tin để được tư vấn.",
  },
};

const RANGE_OPTION_LABELS: Record<RecommendationRangeOption["bound"], string> = {
  lowerBound: "Nếu mức dùng ở cận thấp",
  expected: "Nếu mức dùng ở giữa khoảng",
  upperBound: "Nếu hóa đơn chủ yếu là tiền điện và VAT",
};

function RangeOptions({
  options,
  packages,
}: {
  options: RecommendationRangeOption[];
  packages: SolarPackage[];
}) {
  const packageById = new Map(packages.map((item) => [item.id, item]));
  const rows = options.flatMap((option) => {
    const solarPackage = packageById.get(option.result.packageId);
    return solarPackage ? [{ option, solarPackage }] : [];
  });
  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="range-options-title" className="mt-8">
      <h3 id="range-options-title" className="text-lg font-semibold text-[var(--ink)]">
        Phương án tham khảo theo khoảng điện năng
      </h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        Đây là gói đứng đầu tại từng mức điện năng có thể xảy ra, chưa phải đề xuất chốt. Nhập kWh in trên hóa đơn hoặc chọn &ldquo;Một hộ, kỳ bình thường&rdquo; để nhận một phương án cụ thể.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ option, solarPackage }) => (
          <li
            className="rounded-xl border border-[var(--line-strong)] bg-[var(--paper)] p-5"
            key={option.result.packageId}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
              {RANGE_OPTION_LABELS[option.bound]} · {formatKwh(option.monthlyConsumptionKwh)}/tháng
            </p>
            <p className="mt-2 text-xl font-semibold leading-snug text-[var(--ink)]">
              {formatCustomerPackageName(solarPackage.name)}
            </p>
            <p className="mt-1 text-2xl font-semibold text-[var(--brand-dark)]">
              {formatVnd(solarPackage.priceVnd)}
            </p>
            <dl className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)] text-sm">
              {[
                ["Công suất", `${solarPackage.capacityKwp} kWp`],
                ["Tiết kiệm/tháng", formatVnd(option.result.monthlySavingsVnd)],
                ["Hoàn vốn", formatPaybackYears(option.result.paybackYears)],
              ].map(([label, value]) => (
                <div className="flex items-start justify-between gap-3 py-2" key={label}>
                  <dt className="text-[var(--muted)]">{label}</dt>
                  <dd className="text-right font-semibold text-[var(--ink)]">{value}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}

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
    // A concrete reason (roof too small, not economical, ...) at the expected
    // consumption is what the customer needs to hear; "the bounds disagree"
    // only applies when a package exists but changes across the kWh range.
    const unstableMoneyRecommendation =
      result.recommendationStability?.evaluated === true &&
      result.recommendationStability.stable === false &&
      !result.noRecommendationReason;
    const consumption = result.normalizedInput?.monthlyConsumptionKwh.value;
    const rangeOptions = result.recommendationStability?.rangeOptions ?? [];
    const reasonCopy =
      !unstableMoneyRecommendation && result.noRecommendationReason
        ? NO_RECOMMENDATION_COPY[result.noRecommendationReason]
        : null;

    return (
      <div id="ket-qua" className="rounded-2xl border border-[var(--line-strong)] bg-[var(--paper)] px-6 py-12 sm:px-10 sm:py-14" tabIndex={-1}>
        <div className="max-w-3xl">
          <span className="inline-flex w-fit rounded-full bg-[var(--warning-soft)] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--warning-ink)]">
            Cần khảo sát thêm
          </span>
          <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
            {unstableMoneyRecommendation
              ? "Cần thêm thông tin trước khi chọn gói"
              : reasonCopy?.title ?? "Chưa có gói phù hợp hoàn toàn"}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
            {unstableMoneyRecommendation
              ? `Từ số tiền bạn nhập, nhà bạn dùng ${consumption ? (consumption.lowerBound < 1 ? `tối đa khoảng ${formatKwh(Math.round(consumption.upperBound))}` : `khoảng ${formatKwhRange(Math.round(consumption.lowerBound), Math.round(consumption.upperBound))}`) : "chưa rõ lượng"} điện mỗi tháng. Khoảng này còn rộng nên gói phù hợp có thể khác nhau — chúng tôi chưa chốt một gói để tránh tư vấn sai. Xem các phương án tham khảo bên dưới, hoặc nhập số kWh trên hóa đơn để có kết quả chính xác.`
              : reasonCopy?.body ?? "Nhu cầu hiện chưa khớp hoàn toàn với các gói đang hoạt động. Kết quả tính toán đã được lưu để tư vấn viên kiểm tra phương án riêng; khả năng lắp đặt chỉ được xác nhận sau khảo sát mái."}
          </p>
        </div>

        {rangeOptions.length > 0 ? (
          <RangeOptions
            options={rangeOptions}
            packages={result.sourceSnapshot?.packages ?? packages}
          />
        ) : null}

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
