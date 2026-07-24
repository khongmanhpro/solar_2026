import type {
  CalculationVersionMetadata,
  RequiredDatasetKey,
} from "@/types/data-governance";
import type { CalculationResponse } from "@/types/solar";

interface CalculationTrustPanelProps {
  metadata?: CalculationVersionMetadata;
  tariff?: CalculationResponse["sourceSnapshot"]["tariff"];
}

type MetadataWithAggregateDataVersion = CalculationVersionMetadata & {
  dataVersion?: string;
};

const DATASET_LABELS: Record<RequiredDatasetKey, string> = {
  electricityTariff: "Biểu giá điện",
  packageCatalog: "Danh mục gói",
  solarYield: "Dữ liệu sản lượng",
  calculationAssumptions: "Giả định tính toán",
};

const CONFIDENCE_LABELS: Record<string, string> = {
  insufficient: "Chưa đủ dữ liệu",
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
};

const CONFIDENCE_DESCRIPTIONS: Record<string, string> = {
  insufficient:
    "Thông tin hiện có chưa đủ để đưa ra phương án có thể sử dụng mà không cần khảo sát thêm.",
  low: "Thông tin khách cung cấp còn ít hoặc có trường tự ước lượng; kết quả cần được xác nhận thêm khi khảo sát.",
  medium:
    "Kết quả có cơ sở để tham khảo, nhưng vẫn còn thông tin cần xác nhận khi khảo sát.",
  high: "Các trường đầu vào chính đã được xác nhận ở mức phù hợp với phép tính này.",
};

const DATA_STATUS_LABELS: Record<string, string> = {
  demo: "Dữ liệu demo",
  draft: "Dữ liệu chưa duyệt",
  verified: "Dữ liệu đã xác minh",
  expired: "Dữ liệu hết hiệu lực",
  disabled: "Dữ liệu đã tắt",
};

function getAggregateDataVersion(
  metadata: MetadataWithAggregateDataVersion | undefined,
): string {
  if (!metadata) return "Chưa ghi nhận";
  if (metadata.dataVersion?.trim()) return metadata.dataVersion;

  const versions = Object.values(metadata.dataVersions).filter(Boolean);
  return versions.length > 0 ? versions.join(" · ") : "Chưa ghi nhận";
}

export function CalculationTrustPanel({
  metadata,
  tariff,
}: CalculationTrustPanelProps) {
  const isProductionReady =
    metadata?.dataReadiness.readyForProduction === true;
  const dataStatus = metadata?.dataReadiness.overallStatus ?? "demo";
  const dataStatusLabel =
    DATA_STATUS_LABELS[dataStatus] ?? "Dữ liệu chưa sẵn sàng";
  const confidence = metadata?.confidence.overall ?? "low";
  const confidenceLabel = CONFIDENCE_LABELS[confidence] ?? "Chưa xác định";
  const confidenceDescription =
    CONFIDENCE_DESCRIPTIONS[confidence] ??
    "Chưa có đủ thông tin để giải thích mức độ tin cậy của kết quả.";
  const dataVersion = getAggregateDataVersion(metadata);
  const reasons = Array.from(
    new Set([
      ...(metadata?.confidence.reasons ?? []),
      ...(metadata?.dataReadiness.issues.map((issue) => issue.message) ?? []),
    ]),
  );
  const selectedTariffs =
    tariff?.registry.tariffs.filter((item) =>
      tariff.selectedTariffVersions.includes(item.version),
    ) ?? [];
  const selectedVatRules =
    tariff?.registry.vatRules.filter((item) =>
      tariff.selectedVatRuleVersions.includes(item.version),
    ) ?? [];

  return (
    <aside
      aria-labelledby="calculation-trust-title"
      className={`mb-8 rounded-2xl border p-5 sm:p-6 ${
        isProductionReady
          ? "border-[var(--line-strong)] bg-[var(--brand-soft)]"
          : "border-[var(--danger-line)] bg-[var(--warning-soft)]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
            isProductionReady
              ? "bg-[var(--paper)] text-[var(--success)]"
              : "bg-[var(--paper)] text-[var(--danger)]"
          }`}
        >
          {dataStatusLabel}
        </span>
        <span className="inline-flex rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">
          Độ tin cậy: {confidenceLabel}
        </span>
      </div>

      <h3
        className="mt-4 font-display text-xl font-semibold tracking-tight text-[var(--ink)]"
        id="calculation-trust-title"
      >
        {isProductionReady
          ? "Nguồn dữ liệu của phép tính đã sẵn sàng"
          : "Kết quả này chỉ dùng để thử nghiệm và tham khảo"}
      </h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        {isProductionReady
          ? confidenceDescription
          : "Một hoặc nhiều bộ dữ liệu chưa được phê duyệt để tư vấn chính thức. Không dùng kết quả này để cam kết sản lượng, tiết kiệm, giá bán hoặc thời gian hoàn vốn."}
      </p>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            Phiên bản thuật toán
          </dt>
          <dd className="mt-2 break-all text-sm font-semibold text-[var(--ink)]">
            {metadata?.algorithmVersion ?? "Chưa ghi nhận"}
          </dd>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            Phiên bản dữ liệu
          </dt>
          <dd className="mt-2 break-words text-sm font-semibold text-[var(--ink)]">
            {dataVersion}
          </dd>
        </div>
      </dl>

      <details className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--brand-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-dark)] focus-visible:ring-offset-2">
          Xem nguồn phiên bản và lý do đánh giá
        </summary>

        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {metadata
            ? Object.entries(metadata.dataVersions).map(([key, version]) => (
                <div key={key}>
                  <dt className="text-xs font-semibold text-[var(--muted)]">
                    {DATASET_LABELS[key as RequiredDatasetKey] ?? key}
                  </dt>
                  <dd className="mt-1 break-all text-xs text-[var(--ink)]">
                    {version}
                  </dd>
                </div>
              ))
            : null}
        </dl>

        {selectedTariffs.length > 0 ? (
          <div className="mt-4 border-t border-[var(--line)] pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
              Biểu giá đã dùng
            </p>
            <div className="mt-3 space-y-4">
              {selectedTariffs.map((item) => (
                <article className="rounded-lg border border-[var(--line)] p-3" key={item.version}>
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    {item.version} · {item.tiers.length} bậc
                    {item.version === tariff?.projectionTariffVersion
                      ? " · dùng cho dự phóng"
                      : ""}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Hiệu lực: {item.effectivePeriod.from ?? "chưa có"} → {item.effectivePeriod.to ?? "đang mở"} · {item.approvalStatus === "approved" ? "đã duyệt nội bộ" : "chưa duyệt nội bộ"}
                  </p>
                  <ul className="mt-2 space-y-1 text-xs leading-5">
                    {item.sources
                      .filter((source) => source.url)
                      .map((source) => (
                        <li key={`${item.version}-${source.url}`}>
                          <a
                            className="font-semibold text-[var(--brand-dark)] underline underline-offset-2"
                            href={source.url ?? undefined}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {source.documentNumber ?? source.title}
                          </a>
                        </li>
                      ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {selectedVatRules.length > 0 ? (
          <div className="mt-4 border-t border-[var(--line)] pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
              VAT theo kỳ hóa đơn
            </p>
            <ul className="mt-2 space-y-2 text-xs leading-5 text-[var(--muted)]">
              {selectedVatRules.map((item) => (
                <li key={item.version}>
                  <strong className="text-[var(--ink)]">{item.rateBps / 100}%</strong> · {item.version} · {item.effectivePeriod.from} → {item.effectivePeriod.to ?? "đang mở"}
                  {item.sources.find((source) => source.url)?.url ? (
                    <>
                      {" · "}
                      <a
                        className="font-semibold text-[var(--brand-dark)] underline underline-offset-2"
                        href={item.sources.find((source) => source.url)?.url ?? undefined}
                        rel="noreferrer"
                        target="_blank"
                      >
                        xem nguồn
                      </a>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {reasons.length > 0 ? (
          <ul className="mt-4 space-y-2 border-t border-[var(--line)] pt-4 text-sm leading-6 text-[var(--muted)]">
            {reasons.map((reason) => (
              <li className="flex gap-2" key={reason}>
                <span aria-hidden="true">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 border-t border-[var(--line)] pt-4 text-sm leading-6 text-[var(--muted)]">
            Chưa có ghi chú đánh giá bổ sung cho kết quả này.
          </p>
        )}
      </details>
    </aside>
  );
}
