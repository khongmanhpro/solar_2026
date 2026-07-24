export const MIN_SUPPORTED_BILLING_PERIOD = "2000-01";
export const BILLING_PERIOD_TIME_ZONE = "Asia/Ho_Chi_Minh";

/** Returns the current calendar month for the market this product serves.
 * Using an explicit time zone avoids rejecting the current month around
 * midnight on the first day when the server runs in UTC. */
export function getCurrentBillingPeriod(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BILLING_PERIOD_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  if (!year || !month) {
    throw new Error("Không thể xác định tháng hiện tại theo múi giờ Việt Nam.");
  }

  return `${year}-${month}`;
}

export function billingPeriodIndex(period: string): number {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);
  if (!match) return Number.NaN;

  return Number(match[1]) * 12 + Number(match[2]);
}

export function isRecentBillingPeriod(
  period: string,
  maximumAgeMonths = 2,
  now = new Date(),
): boolean {
  const ageMonths =
    billingPeriodIndex(getCurrentBillingPeriod(now)) -
    billingPeriodIndex(period);
  return Number.isFinite(ageMonths) && ageMonths >= 0 && ageMonths <= maximumAgeMonths;
}
