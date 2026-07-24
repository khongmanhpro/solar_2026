"use client";

import { useState } from "react";

import { CashFlowChart } from "@/components/calculator/CashFlowChart";
import { CalculationTrustPanel } from "@/components/calculator/CalculationTrustPanel";
import { LeadForm } from "@/components/calculator/LeadForm";
import { PackageComparison } from "@/components/calculator/PackageComparison";
import { trackEvent } from "@/lib/analytics";
import {
  formatKwh,
  formatKwhRange,
  formatPaybackRange,
  formatPercent,
  formatVnd,
} from "@/lib/formatters";
import { generateSolarInsights } from "@/lib/solar-insights";
import type {
  CalculationResponse,
  PackageCalculationResult,
  SolarPackage,
} from "@/types/solar";

interface CalculationResultsProps {
  result: CalculationResponse;
  packages: SolarPackage[];
  isStale?: boolean;
}

interface MetricProps {
  label: string;
  value: string;
  accent?: boolean;
}

function Metric({ label, value, accent = false }: MetricProps) {
  return (
    <div className="bg-[var(--paper)] p-4 sm:p-5">
      <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
        {label}
      </dt>
      <dd
        className={`mt-2 break-words text-2xl font-semibold leading-snug sm:text-3xl ${
          accent ? "text-[var(--brand-dark)]" : "text-[var(--ink)]"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  id,
  title,
}: {
  eyebrow: string;
  id: string;
  title: string;
}) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand)]">
        {eyebrow}
      </p>
      <h3 id={id} className="mt-2 font-display text-2xl font-semibold tracking-tight text-[var(--ink)] sm:text-3xl">
        {title}
      </h3>
    </div>
  );
}

function findPackage(packages: SolarPackage[], packageId: string): SolarPackage | null {
  return packages.find((item) => item.id === packageId) ?? null;
}

function findResult(
  results: PackageCalculationResult[],
  packageId: string,
): PackageCalculationResult | null {
  return results.find((item) => item.packageId === packageId) ?? null;
}

function StaleResultNotice() {
  return (
    <aside
      className="mb-8 rounded-xl border border-[var(--warning-line)] bg-[var(--warning-soft)] p-4 text-sm leading-6 text-[var(--warning-ink)]"
      role="status"
    >
      <strong>Kết quả này đang theo thông tin cũ.</strong> Hãy xác nhận và cập
      nhật phép tính trước khi đăng ký khảo sát hoặc liên hệ theo phương án.
    </aside>
  );
}

function MoneyConversionNotice({ result }: { result: CalculationResponse }) {
  if (result.normalizedInput?.source !== "money") return null;

  const consumption = result.normalizedInput.monthlyConsumptionKwh.value;
  const bill = result.normalizedInput.bill;
  const exact =
    result.normalizedInput.moneyConversions?.every(
      (conversion) => conversion.exact,
    ) === true;

  return (
    <aside className="mb-8 rounded-xl border border-[var(--line-strong)] bg-[var(--admin-panel)] p-5" aria-labelledby="money-conversion-title">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--brand)]">
        Tổng tiền → mức dùng điện
      </p>
      <h3 className="mt-2 text-lg font-semibold text-[var(--ink)]" id="money-conversion-title">
        {exact ? formatKwh(consumption.expected) : formatKwhRange(consumption.lowerBound, consumption.upperBound)}
      </h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        {exact
          ? "Khoảng quy đổi hẹp vì bạn đã xác nhận số hộ, kỳ ghi điện và khoản khác trong hóa đơn."
          : "Đây là khoảng bảo thủ vì thành phần hóa đơn chưa chắc chắn. Công cụ không coi điểm giữa là số điện đã đo và không tự chốt gói từ khoảng này."}
      </p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-[var(--muted)]">Tổng đã thanh toán TB</dt>
          <dd className="mt-1 font-semibold text-[var(--ink)]">
            {bill?.totalPaymentVnd ? formatVnd(bill.totalPaymentVnd.value) : "Chưa xác định"}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Tiền điện trước VAT TB</dt>
          <dd className="mt-1 font-semibold text-[var(--ink)]">
            {bill?.energyChargeBeforeVatEstimateVnd
              ? formatVnd(bill.energyChargeBeforeVatEstimateVnd.value.expected)
              : "Chưa xác định"}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">VAT theo kỳ</dt>
          <dd className="mt-1 font-semibold text-[var(--ink)]">
            {bill?.vatRate ? `${bill.vatRate.value * 100}%` : "Xem chi tiết từng kỳ"}
          </dd>
        </div>
      </dl>
    </aside>
  );
}

export function CalculationResults({
  result,
  packages,
  isStale = false,
}: CalculationResultsProps) {
  const snapshotPackages = result.sourceSnapshot?.packages;
  const packagesForCalculation = snapshotPackages ?? packages;
  const recommendedPackageId = result.recommendedPackage?.packageId ?? "";
  const recommendedPackage = findPackage(
    packagesForCalculation,
    recommendedPackageId,
  );
  const [selectedPackageId, setSelectedPackageId] = useState(recommendedPackageId);
  const selectedResult = findResult(result.comparedPackages, selectedPackageId);
  const selectedPackage = findPackage(
    packagesForCalculation,
    selectedPackageId,
  );

  if (!selectedResult || !selectedPackage || !result.recommendedPackage) {
    return (
      <div id="ket-qua" className="rounded-2xl border border-[var(--danger-line)] bg-[var(--danger-soft)] p-6 text-[var(--danger)]">
        <CalculationTrustPanel
          metadata={result.metadata}
          tariff={result.sourceSnapshot?.tariff}
        />
        <h2 className="font-display text-2xl font-semibold tracking-tight">Thiếu dữ liệu gói sản phẩm</h2>
        <p className="mt-2 text-sm leading-6">
          Kết quả đã được tính nhưng thông tin gói không còn trong danh sách đang hoạt động. Hãy tính lại để nhận dữ liệu mới nhất.
        </p>
        {isStale ? (
          <StaleResultNotice />
        ) : (
          <LeadForm
            calculationId={result.calculationId}
            packageId={result.recommendedPackage?.packageId}
            settings={result.assumptions}
          />
        )}
      </div>
    );
  }

  const isRecommended = selectedPackageId === recommendedPackageId;
  const isProductionReady =
    result.metadata?.dataReadiness.readyForProduction === true;
  const roofAreaUnknown = result.inputSummary.roofAreaM2 === null;
  const usedDirectKwh = result.inputSummary.energyInputMethod === "kwh";
  const insights = generateSolarInsights({
    input: result.inputSummary,
    solarPackage: selectedPackage,
    result: selectedResult,
  });

  function selectPackage(packageId: string) {
    setSelectedPackageId(packageId);
    trackEvent("package_selected", {
      packageId,
      isRecommended: packageId === recommendedPackageId,
    });
    document.getElementById("ket-qua")?.focus({ preventScroll: true });
  }

  return (
    <div id="ket-qua" className="rounded-2xl border border-[var(--line-strong)] bg-[var(--paper)] px-6 py-10 sm:px-10 sm:py-14" tabIndex={-1}>
      <CalculationTrustPanel
        metadata={result.metadata}
        tariff={result.sourceSnapshot?.tariff}
      />

      {isStale ? <StaleResultNotice /> : null}

      <MoneyConversionNotice result={result} />

      {roofAreaUnknown ? (
        <aside className="mb-8 rounded-xl border border-[var(--warning-line)] bg-[var(--warning-soft)] p-4 text-sm leading-6 text-[var(--warning-ink)]" role="note">
          <strong>Chưa có diện tích mái.</strong> Gói bên dưới chỉ được xếp theo nhu cầu điện và không khẳng định mái đủ chỗ hoặc có thể thi công. Cần khảo sát mái trước khi chốt phương án.
        </aside>
      ) : null}

      <section aria-labelledby="recommended-title">
        <div className="flex flex-wrap items-center gap-3">
          <span className="status-dot" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--success)]">
            {isRecommended
              ? isProductionReady
                ? "Gói đề xuất cho bạn"
                : "Phương án demo đang xếp hạng"
              : "Gói bạn đang xem"}
          </p>
          {isRecommended ? (
            <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-dark)]">
              {isProductionReady ? "Phù hợp nhất" : "Kết quả thử nghiệm"}
            </span>
          ) : null}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_13rem] lg:items-start">
          <div>
            <h2 id="recommended-title" className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
              {selectedPackage.name}
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--muted)]">
              {selectedPackage.description}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-5 lg:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Điểm phù hợp</p>
            <p className="mt-2 text-4xl font-semibold text-[var(--brand-dark)]">
              {Math.round(selectedResult.score)}
              <span className="text-lg text-[var(--muted)]">/100</span>
            </p>
          </div>
        </div>

        <dl className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Công suất" value={`${selectedPackage.capacityKwp} kWp`} />
          <Metric
            label="Sản lượng dự kiến"
            value={formatKwhRange(
              selectedResult.lowEstimate.adjustedGenerationKwh,
              selectedResult.highEstimate.adjustedGenerationKwh,
            )}
          />
          <Metric label="Diện tích mái cần" value={`${selectedPackage.requiredRoofAreaM2} m²`} />
          <Metric
            label="Loại hệ thống"
            value={
              selectedPackage.systemType === "hybrid"
                ? `Hybrid${selectedPackage.batteryCapacityKwh > 0 ? ` · pin ${selectedPackage.batteryCapacityKwh} kWh` : ""}`
                : "Hòa lưới"
            }
          />
        </dl>
      </section>

      <section aria-labelledby="savings-title" className="mt-14">
        <SectionHeading eyebrow="Hiệu quả hàng tháng" id="savings-title" title="Hóa đơn thay đổi thế nào?" />
        <dl className="grid gap-px overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-3">
          <Metric
            label={usedDirectKwh ? "Tiền điện quy đổi hiện tại" : "Tiền điện hiện tại"}
            value={formatVnd(result.inputSummary.monthlyBill)}
          />
          <Metric label="Tiền điện sau khi lắp" value={formatVnd(selectedResult.billAfterSolarVnd)} />
          <Metric accent label="Tiết kiệm mỗi tháng" value={formatVnd(selectedResult.monthlySavingsVnd)} />
          <Metric label="Tiết kiệm mỗi năm" value={formatVnd(selectedResult.yearlySavingsVnd)} />
          <Metric label="Tỷ lệ giảm hóa đơn" value={formatPercent(selectedResult.reductionPercent)} />
          <Metric label="Điện mặt trời tự sử dụng" value={formatPercent(selectedResult.selfConsumptionRate * 100)} />
        </dl>
        <p className="mt-3 rounded-lg border-l-2 border-[var(--sun)] bg-[var(--warning-soft)] px-4 py-3 text-sm leading-6 text-[var(--warning-ink)]">
          Điện sinh hoạt hộ gia đình · {usedDirectKwh ? "kWh được nhập trực tiếp" : "kWh được ước tính từ dữ liệu hóa đơn"} · {formatKwh(selectedResult.estimatedMonthlyConsumptionKwh)}/tháng · tiền điện trước và sau khi lắp đều được tính theo biểu giá trong phiên tính, chưa gồm VAT.
        </p>
      </section>

      <section aria-labelledby="long-term-title" className="mt-14">
        <SectionHeading eyebrow="Tầm nhìn 20 năm" id="long-term-title" title="Hoàn vốn và lợi ích dài hạn" />
        <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl bg-[var(--ink)] p-6 text-[var(--paper)]">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--focus)]">Khoảng hoàn vốn dự kiến</p>
            <p className="mt-4 text-4xl font-semibold leading-snug sm:text-5xl">
              {formatPaybackRange(
                selectedResult.lowEstimate.paybackYears,
                selectedResult.highEstimate.paybackYears,
              )}
            </p>
            <p className="mt-4 text-sm leading-6 text-[var(--line)]">
              Khoảng được tính lại từ kịch bản sản lượng thấp và cao, không chỉ nhân hệ số vào thời gian hoàn vốn.
            </p>
          </div>
          <dl className="grid gap-px overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3 lg:grid-cols-1">
            <Metric label="Tiết kiệm sau 5 năm" value={formatVnd(selectedResult.longTermSavings.saving5YearsVnd)} />
            <Metric label="Tiết kiệm sau 10 năm" value={formatVnd(selectedResult.longTermSavings.saving10YearsVnd)} />
            <Metric label="Tiết kiệm sau 20 năm" value={formatVnd(selectedResult.longTermSavings.saving20YearsVnd)} />
          </dl>
        </div>
        <p className="mt-3 text-sm leading-5 text-[var(--muted)]">
          Chưa bao gồm biến động giá điện, suy giảm thiết bị và chi phí phát sinh.
        </p>
      </section>

      <section aria-labelledby="cash-flow-title" className="mt-14">
        <SectionHeading eyebrow="Dòng tiền tích lũy" id="cash-flow-title" title="Khi nào khoản đầu tư chuyển sang dương?" />
        <CashFlowChart breakEvenYear={selectedResult.breakEvenYear} data={selectedResult.cashFlow} />
      </section>

      <section aria-labelledby="comparison-title" className="mt-14">
        <SectionHeading eyebrow={`So sánh ${result.comparedPackages.length} phương án`} id="comparison-title" title="Đặt các gói lên cùng một mặt phẳng" />
        <PackageComparison
          onSelect={selectPackage}
          packages={packagesForCalculation}
          recommendedPackageId={recommendedPackageId}
          results={result.comparedPackages}
          selectedPackageId={selectedPackageId}
        />
      </section>

      <section aria-labelledby="equipment-title" className="mt-14">
        <SectionHeading eyebrow="Cấu hình thiết bị" id="equipment-title" title="Những gì có trong phương án" />
        <div className="grid gap-px overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2">
          {[
            ["Tấm pin", selectedPackage.panelBrand, selectedPackage.panelModel],
            ["Inverter", selectedPackage.inverterBrand, selectedPackage.inverterModel],
          ].map(([label, brand, model]) => (
            <article className="bg-[var(--paper)] p-5" key={label}>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">{label}</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--ink)]">{brand}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Model: {model}</p>
            </article>
          ))}
          <article className="bg-[var(--paper)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">Pin lưu trữ</p>
            <p className="mt-3 text-2xl font-semibold text-[var(--ink)]">
              {selectedPackage.batteryCapacityKwh > 0 ? `${selectedPackage.batteryCapacityKwh} kWh` : "Không bao gồm"}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {selectedPackage.batteryCapacityKwh > 0
                ? "Dùng điện mặt trời dư để cấp điện dự phòng."
                : "Hệ thống ưu tiên sử dụng điện trực tiếp ban ngày."}
            </p>
          </article>
          <article className="bg-[var(--paper)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">Bảo hành thiết bị</p>
            <p className="mt-3 text-2xl font-semibold text-[var(--ink)]">
              Tấm pin {selectedPackage.panelWarrantyYears} năm
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">Inverter {selectedPackage.inverterWarrantyYears} năm</p>
          </article>
          <article className="bg-[var(--paper)] p-5 sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">Vật tư đi kèm</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink)]">{selectedPackage.equipmentSummary}</p>
          </article>
        </div>
      </section>

      <section aria-labelledby="insights-title" className="mt-14">
        <SectionHeading eyebrow="Nhận xét theo dữ liệu" id="insights-title" title="Điều đáng chú ý ở phương án này" />
        <div className="space-y-3">
          {insights.length > 0 ? (
            insights.map((insight) => (
              <p className="flex gap-3 rounded-xl border border-[var(--line)] bg-[var(--admin-panel)] p-4 text-sm leading-7 text-[var(--ink)]" key={insight}>
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--brand)]" />
                {insight}
              </p>
            ))
          ) : (
            <p className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4 text-sm leading-7 text-[var(--muted)]">
              Phương án nằm trong giới hạn mái và nhu cầu đã cung cấp; chưa có lưu ý đặc biệt cần bổ sung.
            </p>
          )}
        </div>
      </section>

      <aside aria-label="Lưu ý về kết quả ước tính" className="mt-14 rounded-xl border border-[var(--line-strong)] bg-[var(--admin-panel)] p-5">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--warning-ink)]">Lưu ý bắt buộc</p>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          Kết quả là ước tính dựa trên thông tin khách hàng cung cấp, dữ liệu sản phẩm và các giả định tính toán hiện tại. Sản lượng và chi phí thực tế có thể thay đổi theo thời tiết, hướng mái, độ che bóng, kết cấu mái, biểu giá điện và điều kiện thi công. Báo giá chính thức được xác nhận sau khi khảo sát công trình.
        </p>
        <p className="mt-4 break-all border-t border-[var(--line)] pt-4 text-xs font-semibold text-[var(--muted)]">
          Mã tính toán · {result.calculationId}
        </p>
      </aside>

      {isStale ? null : (
        <LeadForm
          calculationId={result.calculationId}
          packageId={recommendedPackageId}
          packageName={recommendedPackage?.name}
          settings={result.assumptions}
        />
      )}
    </div>
  );
}
