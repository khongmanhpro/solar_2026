"use client";

import { useState } from "react";

import { BackupPlanner } from "@/components/calculator/BackupPlanner";
import { BillTierDecoder } from "@/components/calculator/BillTierDecoder";
import { CashFlowChart } from "@/components/calculator/CashFlowChart";
import { MethodologyPanel } from "@/components/calculator/MethodologyPanel";
import { MonthlyEnergyChart } from "@/components/calculator/MonthlyEnergyChart";
import { PaymentOptions } from "@/components/calculator/PaymentOptions";
import { ShareBar } from "@/components/calculator/ShareBar";
import { CALCULATION_CONSTANTS, RECOMMENDATION_CONSTANTS } from "@/config/defaults";
import { LeadForm } from "@/components/calculator/LeadForm";
import { PackageComparison } from "@/components/calculator/PackageComparison";
import { trackEvent } from "@/lib/analytics";
import {
  formatCustomerPackageName,
  formatDecimal,
  formatKwh,
  formatKwhRange,
  formatPaybackRange,
  formatPaybackYears,
  formatPercent,
  formatVnd,
  formatVndSpoken,
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
          accent ? "text-[var(--savings)]" : "text-[var(--ink)]"
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
      className="mb-8 rounded-[10px] border border-[var(--warning-line)] bg-[var(--warning-soft)] p-4 text-sm leading-6 text-[var(--warning-ink)]"
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
    <aside className="mb-8 rounded-[10px] border border-[var(--line-strong)] bg-[var(--admin-panel)] p-5" aria-labelledby="money-conversion-title">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--brand)]">
        Tổng tiền → mức dùng điện
      </p>
      <h3 className="mt-2 text-lg font-semibold text-[var(--ink)]" id="money-conversion-title">
        {exact
          ? `${bill?.totalPaymentVnd ? `${formatVnd(bill.totalPaymentVnd.value)} → ` : ""}khoảng ${formatKwh(Math.round(consumption.expected))}/tháng`
          : formatKwhRange(Math.round(consumption.lowerBound), Math.round(consumption.upperBound))}
      </h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        {exact
          ? "Quy đổi từ số tiền bạn nhập theo biểu giá bậc thang của EVN và VAT, cho hóa đơn một hộ, kỳ bình thường. Nếu hóa đơn có khoản khác (nợ cũ, nhiều hộ chung công tơ), hãy chọn lại ở bước 1."
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
  const [selectedPackageId, setSelectedPackageId] = useState(recommendedPackageId);
  const selectedResult = findResult(result.comparedPackages, selectedPackageId);
  const selectedPackage = findPackage(
    packagesForCalculation,
    selectedPackageId,
  );

  if (!selectedResult || !selectedPackage || !result.recommendedPackage) {
    return (
      <div id="ket-qua" className="rounded-[10px] border border-[var(--danger-line)] bg-[var(--danger-soft)] p-6 text-[var(--danger)]">
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
  const roofAreaUnknown = result.inputSummary.roofAreaM2 === null;
  const usedDirectKwh = result.inputSummary.energyInputMethod === "kwh";
  const vatRate = result.inputSummary.vatRate ?? 0;
  const plannedKwh = selectedResult.plannedAdditionalKwh ?? 0;
  const horizonYears = selectedResult.cashFlow.at(-1)?.year ?? 20;
  const monthlySavings = selectedResult.monthlyBreakdown?.map((month) => month.savingsVnd);
  const seasonalSavings =
    monthlySavings && monthlySavings.length > 0
      ? { min: Math.min(...monthlySavings), max: Math.max(...monthlySavings) }
      : null;
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
    <div id="ket-qua" className="rounded-[10px] border border-[var(--line-strong)] bg-[var(--paper)] px-5 pb-24 pt-8 sm:px-10 sm:py-14" tabIndex={-1}>
      {isStale ? <StaleResultNotice /> : null}

      <section aria-labelledby="recommended-title">
        <div className="flex flex-wrap items-center gap-3">
          <span className="status-dot" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--success)]">
            {isRecommended ? "Gói đề xuất cho bạn" : "Gói bạn đang xem"}
          </p>
          {isRecommended ? (
            <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-dark)]">
              Phù hợp nhất
            </span>
          ) : null}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_13rem] lg:items-start">
          <div>
            <h2 id="recommended-title" className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
              {formatCustomerPackageName(selectedPackage.name)}
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--muted)]">
              {selectedPackage.description}
            </p>
          </div>
        </div>

        <dl
          aria-label="Tóm tắt phương án"
          className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-[var(--ink)] bg-[var(--admin-rail)] lg:grid-cols-4"
        >
          {[
            ["Chi phí lắp đặt", formatVndSpoken(selectedPackage.priceVnd), "giá tham khảo, đã gồm VAT"],
            ["Mỗi tháng bớt", formatVndSpoken(selectedResult.monthlySavingsVnd), `ước tính · thận trọng: ${formatVndSpoken(selectedResult.lowEstimate.monthlySavingsVnd)}`],
            ["Tiền điện còn trả", formatVndSpoken(selectedResult.billAfterSolarVnd), "ước tính, trung bình mỗi tháng cả năm"],
            [
              "Hoàn vốn sau",
              formatPaybackRange(selectedResult.lowEstimate.paybackYears, selectedResult.highEstimate.paybackYears),
              "đã trừ chi phí bảo trì, thay thiết bị",
            ],
          ].map(([label, value, hint]) => (
            <div className="bg-[var(--ink)] p-4 sm:p-5" key={label}>
              <dt className="text-sm font-semibold text-[var(--line-strong)]">{label}</dt>
              <dd
                className={`mt-1 break-words font-display text-xl font-extrabold leading-snug sm:text-2xl ${
                  label === "Mỗi tháng bớt" ? "text-[var(--sun)]" : "text-[var(--paper)]"
                }`}
              >
                {value}
              </dd>
              <dd className="mt-1 text-xs leading-5 text-[var(--line-strong)]">{hint}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-base leading-7 text-[var(--ink)]">
          Lắp {formatDecimal(selectedPackage.capacityKwp)} kWp tấm pin
          {selectedPackage.batteryCapacityKwh > 0
            ? ` kèm pin lưu trữ ${formatDecimal(selectedPackage.batteryCapacityKwh, 0)} kWh (có điện khi mất điện)`
            : " nối lưới, không có pin (mất điện lưới thì hệ thống cũng tạm ngưng)"}
          , cần khoảng {formatDecimal(selectedPackage.requiredRoofAreaM2, 0)} m² mái.
        </p>
        {selectedResult.economicNote === "backup_cost" ? (
          <p
            className="mt-4 rounded-[10px] border border-[var(--line-strong)] bg-[var(--paper)] p-4 text-base leading-7 text-[var(--ink)]"
            role="note"
          >
            <strong>Nói thẳng về chi phí:</strong> gói này được đề xuất vì bạn cần điện dự phòng khi mất điện.
            Nếu chỉ tính tiền điện tiết kiệm,{" "}
            {selectedResult.paybackYears === null
              ? `hệ thống chưa hoàn vốn trong ${horizonYears} năm sử dụng`
              : `hệ thống cần khoảng ${formatPaybackYears(selectedResult.paybackYears)} để hoàn vốn, lâu hơn mức ${RECOMMENDATION_CONSTANTS.maxViablePaybackYears} năm chúng tôi coi là đáng đầu tư`}
            . Phần pin là chi phí cho sự an tâm, không phải khoản sinh lời.
          </p>
        ) : null}

        {isStale ? null : <div className="mt-6"><ShareBar calculationId={result.calculationId} /></div>}

        <dl className="mt-8 grid gap-px overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Công suất" value={`${formatDecimal(selectedPackage.capacityKwp)} kWp`} />
          <Metric
            label="Sản lượng dự kiến"
            value={formatKwhRange(
              selectedResult.lowEstimate.adjustedGenerationKwh,
              selectedResult.highEstimate.adjustedGenerationKwh,
            )}
          />
          <Metric label="Diện tích mái cần" value={`${formatDecimal(selectedPackage.requiredRoofAreaM2, 1)} m²`} />
          <Metric
            label="Loại hệ thống"
            value={
              selectedPackage.systemType === "hybrid"
                ? `Có pin lưu trữ${selectedPackage.batteryCapacityKwh > 0 ? ` ${formatDecimal(selectedPackage.batteryCapacityKwh, 0)} kWh` : ""}`
                : "Nối lưới, không pin"
            }
          />
        </dl>
      </section>

      <div className="mt-10">
      <MoneyConversionNotice result={result} />

      {roofAreaUnknown ? (
        <aside className="mb-4 rounded-[10px] border border-[var(--warning-line)] bg-[var(--warning-soft)] p-4 text-sm leading-6 text-[var(--warning-ink)]" role="note">
          <strong>Chưa có diện tích mái.</strong> Gói bên dưới chỉ được xếp theo nhu cầu điện và không khẳng định mái đủ chỗ hoặc có thể thi công. Cần khảo sát mái trước khi chốt phương án.
        </aside>
      ) : null}

      </div>

      <section aria-labelledby="savings-title" className="mt-14">
        <SectionHeading eyebrow="Hiệu quả hàng tháng" id="savings-title" title="Hóa đơn thay đổi thế nào?" />
        <dl className="grid gap-px overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-3">
          <Metric
            label={
              plannedKwh > 0
                ? "Tiền điện dự kiến khi thêm thiết bị"
                : usedDirectKwh
                  ? "Tiền điện quy đổi hiện tại"
                  : "Tiền điện hiện tại"
            }
            value={formatVnd(selectedResult.baselineBillVnd ?? result.inputSummary.monthlyBill * (1 + vatRate))}
          />
          <Metric label="Tiền điện sau khi lắp" value={formatVnd(selectedResult.billAfterSolarVnd)} />
          <Metric accent label="Tiết kiệm trung bình mỗi tháng" value={formatVnd(selectedResult.monthlySavingsVnd)} />
          {seasonalSavings ? (
            <Metric
              label="Tiết kiệm theo mùa"
              value={`${formatVnd(seasonalSavings.min)} – ${formatVnd(seasonalSavings.max)}/tháng`}
            />
          ) : null}
          <Metric label="Tiết kiệm mỗi năm" value={formatVnd(selectedResult.yearlySavingsVnd)} />
          <Metric label="Tỷ lệ giảm hóa đơn" value={formatPercent(selectedResult.reductionPercent)} />
          <Metric label="Điện mặt trời tự sử dụng" value={formatPercent(selectedResult.selfConsumptionRate * 100)} />
        </dl>
        <p className="mt-3 rounded-[8px] border-l-2 border-[var(--sun)] bg-[var(--warning-soft)] px-4 py-3 text-sm leading-6 text-[var(--warning-ink)]">
          Điện sinh hoạt hộ gia đình · {usedDirectKwh ? "kWh được nhập trực tiếp" : "kWh được ước tính từ dữ liệu hóa đơn"} · {formatKwh(selectedResult.estimatedMonthlyConsumptionKwh)}/tháng{plannedKwh > 0 ? ` (gồm ~${Math.round(plannedKwh)} kWh dự kiến cho thiết bị mới)` : ""} · tiền điện trước và sau khi lắp đều được tính theo biểu giá trong phiên tính, {vatRate > 0 ? `đã gồm VAT ${formatPercent(vatRate * 100)} để so sánh cùng cơ sở với giá gói đã gồm VAT` : "chưa gồm VAT"}.
        </p>
      </section>

      <section aria-labelledby="tier-title" className="mt-14">
        <SectionHeading eyebrow="Giải mã hóa đơn EVN" id="tier-title" title="Điện mặt trời cắt bậc giá đắt nhất trước" />
        <BillTierDecoder
          gridConsumptionAfterSolarKwh={selectedResult.gridConsumptionAfterSolarKwh}
          input={result.inputSummary}
          monthlyConsumptionKwh={selectedResult.estimatedMonthlyConsumptionKwh}
        />
      </section>

      {selectedResult.monthlyBreakdown ? (
        <section aria-labelledby="monthly-title" className="mt-14">
          <SectionHeading eyebrow="12 tháng trong năm" id="monthly-title" title="Mỗi tháng điện đến từ đâu?" />
          <MonthlyEnergyChart
            hasBattery={selectedPackage.batteryCapacityKwh > 0}
            months={selectedResult.monthlyBreakdown}
            seasonalData={Boolean(result.sourceSnapshot?.provinceFactor?.monthlyYieldKwhPerKwp)}
          />
        </section>
      ) : null}

      <section aria-labelledby="long-term-title" className="mt-14">
        <SectionHeading eyebrow={`Tầm nhìn ${horizonYears} năm`} id="long-term-title" title="Hoàn vốn và lợi ích dài hạn" />
        <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-[10px] bg-[var(--ink)] p-6 text-[var(--paper)]">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--focus)]">Khoảng hoàn vốn dự kiến</p>
            <p className="mt-4 text-4xl font-semibold leading-snug sm:text-5xl">
              {formatPaybackRange(
                selectedResult.lowEstimate.paybackYears,
                selectedResult.highEstimate.paybackYears,
              )}
            </p>
            <p className="mt-4 text-sm leading-6 text-[var(--line)]">
              Khoảng được tính lại từ kịch bản sản lượng thấp và cao, không chỉ nhân hệ số vào thời gian hoàn vốn.
              {selectedResult.financial?.paybackYearsHighTariffGrowth != null
                ? ` Nếu giá điện tăng nhanh hơn (${formatPercent(CALCULATION_CONSTANTS.finance.highTariffEscalationRate * 100)}/năm thay vì ${formatPercent(CALCULATION_CONSTANTS.finance.tariffEscalationRate * 100)}), hoàn vốn còn khoảng ${formatPaybackRange(selectedResult.financial.paybackYearsHighTariffGrowth, selectedResult.financial.paybackYearsHighTariffGrowth)}.`
                : ""}
            </p>
          </div>
          <dl className="grid gap-px overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3 lg:grid-cols-1">
            <Metric label="Tiết kiệm ròng sau 5 năm" value={formatVnd(selectedResult.longTermSavings.saving5YearsVnd)} />
            <Metric label="Tiết kiệm ròng sau 10 năm" value={formatVnd(selectedResult.longTermSavings.saving10YearsVnd)} />
            <Metric label={`Tiết kiệm ròng sau ${Math.min(20, horizonYears)} năm`} value={formatVnd(selectedResult.longTermSavings.saving20YearsVnd)} />
          </dl>
        </div>
        <p className="mt-3 text-sm leading-5 text-[var(--muted)]">
          {selectedResult.financial
            ? `Đã tính giá điện tăng ${formatPercent(CALCULATION_CONSTANTS.finance.tariffEscalationRate * 100)}/năm, suy giảm tấm pin, chi phí bảo trì${selectedResult.financial.replacementCostsVnd.length > 0 ? ` và thay ${selectedResult.financial.replacementCostsVnd.map((item) => `${item.item === "battery" ? "pin lưu trữ" : "inverter"} năm ${item.year} (~${formatVnd(item.costVnd)})`).join(", ")}` : ""}. Điện dư phát lên lưới không được tính tiền.`
            : "Chưa bao gồm biến động giá điện, suy giảm thiết bị và chi phí phát sinh."}
        </p>
      </section>

      <section aria-labelledby="payment-title" className="mt-14">
        <SectionHeading eyebrow="Cách thanh toán" id="payment-title" title="Trả thẳng, trả góp hay vay?" />
        <PaymentOptions monthlySavingsVnd={selectedResult.monthlySavingsVnd} priceVnd={selectedPackage.priceVnd} />
      </section>

      <section aria-labelledby="backup-title" className="mt-14">
        <SectionHeading eyebrow="Pin & mất điện" id="backup-title" title="Khi mất điện lưới, nhà bạn còn điện bao lâu?" />
        <BackupPlanner
          alternatives={result.comparedPackages
            .filter((item) => item.packageId !== selectedPackageId)
            .flatMap((item) => {
              const solarPackage = findPackage(packagesForCalculation, item.packageId);
              return solarPackage ? [{ solarPackage, result: item }] : [];
            })}
          declaredBackup={
            result.inputSummary.backupRequired && result.inputSummary.essentialLoadWatts
              ? { watts: result.inputSummary.essentialLoadWatts, hours: result.inputSummary.backupHours }
              : null
          }
          onSelectPackage={selectPackage}
          selectedPackage={selectedPackage}
          selectedResult={selectedResult}
        />
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
        <div className="grid gap-px overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2">
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
              <p className="flex gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--admin-panel)] p-4 text-sm leading-7 text-[var(--ink)]" key={insight}>
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--brand)]" />
                {insight}
              </p>
            ))
          ) : (
            <p className="rounded-[10px] border border-[var(--line)] bg-[var(--paper)] p-4 text-sm leading-7 text-[var(--muted)]">
              Phương án nằm trong giới hạn mái và nhu cầu đã cung cấp; chưa có lưu ý đặc biệt cần bổ sung.
            </p>
          )}
        </div>
      </section>

      <section aria-label="Cách tính" className="mt-14">
        <MethodologyPanel result={result} selectedResult={selectedResult} />
      </section>

      <aside aria-label="Lưu ý về kết quả ước tính" className="mt-14 rounded-[10px] border border-[var(--line-strong)] bg-[var(--admin-panel)] p-5">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--warning-ink)]">Lưu ý bắt buộc</p>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          Kết quả là ước tính dựa trên thông tin khách hàng cung cấp, dữ liệu sản phẩm và các giả định tính toán hiện tại. Sản lượng và chi phí thực tế có thể thay đổi theo thời tiết, hướng mái, độ che bóng, kết cấu mái, biểu giá điện và điều kiện thi công. Báo giá chính thức được xác nhận sau khi khảo sát công trình.
        </p>
        <p className="mt-4 break-all border-t border-[var(--line)] pt-4 text-xs font-semibold text-[var(--muted)]">
          Mã tính toán · {result.calculationId}
        </p>
      </aside>

      {isStale ? null : (
        <a
          className="fixed inset-x-3 bottom-3 z-30 flex min-h-12 items-center justify-center rounded-[10px] bg-[var(--sun)] px-5 py-3 text-base font-semibold text-[var(--ink)] shadow-[0_10px_30px_var(--shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] lg:hidden print:hidden"
          href="#survey-title"
        >
          Đăng ký khảo sát miễn phí ↓
        </a>
      )}

      {isStale ? null : (
        <LeadForm
          calculationId={result.calculationId}
          packageId={selectedPackageId}
          packageName={formatCustomerPackageName(selectedPackage.name)}
          settings={result.assumptions}
        />
      )}
    </div>
  );
}
