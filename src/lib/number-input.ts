/**
 * Vietnamese users write numbers with "." as thousands separator
 * ("1.500.000") and "," as decimal mark ("450,5"). Browser number inputs
 * misread these (e.g. "1.500.000" becomes 1.5), so customer-facing numeric
 * fields use text inputs normalised here.
 */

/** Money in VND: keep digits only ("1.500.000 đ" -> "1500000"). */
export function normalizeMoneyInput(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

/** Display VND digits with Vietnamese thousands separators. */
export function formatMoneyInput(digits: string): string {
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Quantity such as kWh or m², following the Vietnamese convention
 * ("," = decimal, "." = thousands). Parse the WHOLE typed string, never a
 * value that was already normalised (that would re-read "12.5" + "00" as
 * twelve thousand). Rules:
 * - both "." and "," present: the last one is the decimal mark
 *   ("1.200,5" -> "1200.5", "1,200.5" -> "1200.5");
 * - only ".": groups of three are thousands ("1.200" -> "1200"), otherwise
 *   decimal ("450.5" -> "450.5");
 * - only ",": decimal ("12,500" -> "12.5"), except two or more groups of
 *   three which can only be thousands ("1,200,000" -> "1200000").
 * Stray characters are dropped. Returns a plain JS decimal string.
 */
export function normalizeDecimalInput(raw: string): string {
  const compact = raw.replace(/\s/g, "").replace(/[^\d.,]/g, "");
  const lastDot = compact.lastIndexOf(".");
  const lastComma = compact.lastIndexOf(",");

  let decimalIndex = -1;
  if (lastDot >= 0 && lastComma >= 0) {
    decimalIndex = Math.max(lastDot, lastComma);
  } else if (lastDot >= 0) {
    if (/^\d{1,3}(\.\d{3})+$/.test(compact)) return compact.replace(/\./g, "");
    decimalIndex = compact.indexOf(".");
  } else if (lastComma >= 0) {
    if (/^\d{1,3}(,\d{3}){2,}$/.test(compact)) return compact.replace(/,/g, "");
    decimalIndex = compact.indexOf(",");
  }

  if (decimalIndex < 0) return compact;
  const whole = compact.slice(0, decimalIndex).replace(/[.,]/g, "");
  const fraction = compact.slice(decimalIndex + 1).replace(/[.,]/g, "");
  return `${whole}.${fraction}`;
}

const decimalDisplay = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 });

/** Show a normalised decimal back to the customer the Vietnamese way. */
export function formatDecimalForDisplay(normalized: string): string {
  const value = Number(normalized);
  if (normalized === "" || !Number.isFinite(value)) return "";
  return decimalDisplay.format(value);
}
