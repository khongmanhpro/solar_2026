"use client";

import { useState } from "react";

import { formatVnd } from "@/lib/formatters";
import { normalizeDecimalInput } from "@/lib/number-input";
import {
  cardInstalmentOption,
  cashOption,
  loanOption,
  type PaymentOption,
} from "@/lib/payment-options";

interface PaymentOptionsProps {
  priceVnd: number;
  monthlySavingsVnd: number;
}

const OPTION_COPY: Record<PaymentOption["id"], { title: string; note: string }> = {
  cash: { title: "Trả thẳng", note: "Chi phí thấp nhất; tiết kiệm về túi ngay từ tháng đầu." },
  card: { title: "Trả góp 0% qua thẻ tín dụng", note: "Cần hạn mức thẻ đủ lớn. Một số ngân hàng thu phí chuyển đổi trả góp." },
  loan: { title: "Vay ngân hàng", note: "Lãi suất và kỳ hạn tham khảo; điều kiện thực tế do ngân hàng duyệt." },
};

function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  suffix: string;
}) {
  // Free typing (incl. "10,5"), committed and clamped on blur.
  const [draft, setDraft] = useState(String(value));
  return (
    <label className="block text-xs text-[var(--muted)]" htmlFor={id}>
      {label}
      <span className="mt-1 flex items-center gap-1">
        <input
          className="min-h-11 w-24 rounded-md border border-[var(--line-strong)] bg-[var(--paper)] px-2 py-2 text-base font-semibold text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-dark)]"
          id={id}
          aria-describedby={`${id}-range`}
          inputMode="decimal"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            const normalized = normalizeDecimalInput(draft);
            const next = Number(normalized);
            const clamped =
              Number.isFinite(next) && normalized !== "" ? Math.min(max, Math.max(min, next)) : value;
            onChange(clamped);
            setDraft(String(clamped));
          }}
          type="text"
          value={draft}
        />
        <span className="text-sm text-[var(--ink)]">{suffix}</span>
      </span>
      <span className="sr-only" id={`${id}-range`}>
        Từ {min} đến {max}, bước {step}
      </span>
    </label>
  );
}

/** Cash vs 0% card instalment vs bank loan, each against the monthly saving. */
export function PaymentOptions({ priceVnd, monthlySavingsVnd }: PaymentOptionsProps) {
  const [cardMonths, setCardMonths] = useState(12);
  const [cardFeePercent, setCardFeePercent] = useState(0);
  const [loanRatePercent, setLoanRatePercent] = useState(10);
  const [loanYears, setLoanYears] = useState(5);
  const [downPaymentPercent, setDownPaymentPercent] = useState(30);

  const options = [
    cashOption(priceVnd, monthlySavingsVnd),
    cardInstalmentOption(priceVnd, monthlySavingsVnd, {
      months: cardMonths,
      conversionFeeRate: cardFeePercent / 100,
    }),
    loanOption(priceVnd, monthlySavingsVnd, {
      downPaymentRate: downPaymentPercent / 100,
      annualInterestRate: loanRatePercent / 100,
      years: loanYears,
    }),
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {options.map((option) => {
        const copy = OPTION_COPY[option.id];
        const positive = option.netMonthlyDuringTermVnd >= 0;
        return (
          <article className="flex flex-col rounded-[10px] border border-[var(--line)] bg-[var(--paper)] p-5" key={option.id}>
            <h4 className="text-lg font-semibold text-[var(--ink)]">{copy.title}</h4>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">Trả trước</dt>
                <dd className="font-semibold text-[var(--ink)]">{formatVnd(option.upfrontVnd)}</dd>
              </div>
              {option.termMonths > 0 ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--muted)]">Góp mỗi tháng ({option.termMonths} tháng)</dt>
                  <dd className="font-semibold text-[var(--ink)]">{formatVnd(option.monthlyPaymentVnd)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">Chi phí tài chính</dt>
                <dd className="font-semibold text-[var(--ink)]">{formatVnd(option.financingCostVnd)}</dd>
              </div>
            </dl>
            <p
              className={`mt-4 rounded-[8px] p-3 text-sm leading-6 ${
                positive ? "bg-[var(--savings-soft)] text-[var(--savings)]" : "bg-[var(--warning-soft)] text-[var(--warning-ink)]"
              }`}
            >
              {option.termMonths === 0
                ? `Mỗi tháng bạn giữ lại ~${formatVnd(option.netMonthlyDuringTermVnd)} tiền điện tiết kiệm.`
                : positive
                  ? `Tiền tiết kiệm (~${formatVnd(monthlySavingsVnd)}) đủ trả góp, còn dư ~${formatVnd(option.netMonthlyDuringTermVnd)}/tháng.`
                  : `Trong thời gian góp, bạn bù thêm ~${formatVnd(-option.netMonthlyDuringTermVnd)}/tháng ngoài tiền điện tiết kiệm.`}
            </p>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{copy.note}</p>
            {option.id === "card" ? (
              <div className="mt-auto flex flex-wrap gap-4 pt-4">
                <NumberField id="card-months" label="Số tháng" max={24} min={3} onChange={setCardMonths} step={3} suffix="tháng" value={cardMonths} />
                <NumberField id="card-fee" label="Phí chuyển đổi" max={10} min={0} onChange={setCardFeePercent} step={0.5} suffix="%" value={cardFeePercent} />
              </div>
            ) : null}
            {option.id === "loan" ? (
              <div className="mt-auto flex flex-wrap gap-4 pt-4">
                <NumberField id="loan-down" label="Trả trước" max={90} min={0} onChange={setDownPaymentPercent} step={5} suffix="%" value={downPaymentPercent} />
                <NumberField id="loan-rate" label="Lãi suất" max={30} min={0} onChange={setLoanRatePercent} step={0.5} suffix="%/năm" value={loanRatePercent} />
                <NumberField id="loan-years" label="Kỳ hạn" max={10} min={1} onChange={setLoanYears} step={1} suffix="năm" value={loanYears} />
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
