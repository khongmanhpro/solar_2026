const viNumberFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 1,
});

const viCurrencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function formatVnd(value: number): string {
  return viCurrencyFormatter.format(value);
}

export function formatCustomerPackageName(name: string): string {
  return name.replace(/\s+—\s+Thử nghiệm$/iu, "");
}

export function formatKwh(value: number): string {
  return `${viNumberFormatter.format(value)} kWh`;
}

export function formatPercent(value: number): string {
  return `${viNumberFormatter.format(value)}%`;
}

export function formatPaybackYears(value: number | null): string {
  if (value === null) {
    return "Chưa xác định";
  }

  return `${viNumberFormatter.format(value)} năm`;
}

export function formatKwhRange(lowValue: number, highValue: number): string {
  const low = Math.min(lowValue, highValue);
  const high = Math.max(lowValue, highValue);

  if (Math.abs(low - high) < Number.EPSILON) {
    return formatKwh(low);
  }

  return `${viNumberFormatter.format(low)}–${viNumberFormatter.format(high)} kWh`;
}

export function formatPaybackRange(
  firstValue: number | null,
  secondValue: number | null,
): string {
  if (firstValue === null || secondValue === null) {
    return "Chưa xác định";
  }

  const low = Math.min(firstValue, secondValue);
  const high = Math.max(firstValue, secondValue);

  if (Math.abs(low - high) < Number.EPSILON) {
    return formatPaybackYears(low);
  }

  return `${viNumberFormatter.format(low)}–${viNumberFormatter.format(high)} năm`;
}

/** Vietnamese decimal formatting for technical figures ("5,84"). */
export function formatDecimal(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits }).format(value);
}

/** Spoken-style VND for headline figures: "110 triệu", "1,39 triệu", "114 nghìn". */
export function formatVndSpoken(value: number): string {
  const amount = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (amount >= 1_000_000_000) {
    return `${sign}${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(amount / 1_000_000_000)} tỷ đồng`;
  }
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    const digits = millions >= 100 ? 0 : millions >= 10 ? 1 : 2;
    return `${sign}${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: digits }).format(millions)} triệu đồng`;
  }
  if (amount >= 1_000) {
    return `${sign}${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(amount / 1_000)} nghìn đồng`;
  }
  return `${sign}${Math.round(amount)} đồng`;
}
