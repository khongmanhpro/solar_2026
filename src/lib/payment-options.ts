export interface PaymentOption {
  id: "cash" | "card" | "loan";
  upfrontVnd: number;
  monthlyPaymentVnd: number;
  termMonths: number;
  /** Everything paid over the term, upfront included. */
  totalPaidVnd: number;
  /** Extra cost versus paying cash (interest and fees). */
  financingCostVnd: number;
  /** Monthly savings minus instalment during the term. */
  netMonthlyDuringTermVnd: number;
}

export interface CardInstalmentParams {
  months: number;
  /** One-off conversion fee charged by some banks (0-1). */
  conversionFeeRate: number;
}

export interface LoanParams {
  /** Share of the price paid upfront (0-1). */
  downPaymentRate: number;
  annualInterestRate: number;
  years: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}

/** Standard annuity payment; falls back to straight division at 0% interest. */
export function annuityPayment(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const monthlyRate = annualRate / 12;
  if (monthlyRate <= 0) return principal / months;
  return (principal * monthlyRate) / (1 - (1 + monthlyRate) ** -months);
}

export function cashOption(priceVnd: number, monthlySavingsVnd: number): PaymentOption {
  return {
    id: "cash",
    upfrontVnd: priceVnd,
    monthlyPaymentVnd: 0,
    termMonths: 0,
    totalPaidVnd: priceVnd,
    financingCostVnd: 0,
    netMonthlyDuringTermVnd: monthlySavingsVnd,
  };
}

export function cardInstalmentOption(
  priceVnd: number,
  monthlySavingsVnd: number,
  params: CardInstalmentParams,
): PaymentOption {
  const months = Math.round(clamp(params.months, 1, 36));
  const fee = priceVnd * clamp(params.conversionFeeRate, 0, 0.2);
  const monthlyPaymentVnd = (priceVnd + fee) / months;
  return {
    id: "card",
    upfrontVnd: 0,
    monthlyPaymentVnd,
    termMonths: months,
    totalPaidVnd: priceVnd + fee,
    financingCostVnd: fee,
    netMonthlyDuringTermVnd: monthlySavingsVnd - monthlyPaymentVnd,
  };
}

export function loanOption(
  priceVnd: number,
  monthlySavingsVnd: number,
  params: LoanParams,
): PaymentOption {
  const downPayment = priceVnd * clamp(params.downPaymentRate, 0, 1);
  const principal = priceVnd - downPayment;
  const months = Math.round(clamp(params.years, 0.5, 20) * 12);
  const monthlyPaymentVnd = annuityPayment(principal, clamp(params.annualInterestRate, 0, 1), months);
  const totalPaidVnd = downPayment + monthlyPaymentVnd * months;
  return {
    id: "loan",
    upfrontVnd: downPayment,
    monthlyPaymentVnd,
    termMonths: principal > 0 ? months : 0,
    totalPaidVnd,
    financingCostVnd: totalPaidVnd - priceVnd,
    netMonthlyDuringTermVnd: monthlySavingsVnd - monthlyPaymentVnd,
  };
}
