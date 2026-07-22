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
