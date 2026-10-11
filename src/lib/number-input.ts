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
 * Quantity such as kWh or m²: "450,5" -> "450.5"; "1.200" (thousands) ->
 * "1200"; stray characters are dropped. Returns a plain JS decimal string.
 */
export function normalizeDecimalInput(raw: string): string {
  const compact = raw.replace(/\s/g, "").replace(/[^\d.,]/g, "");
  if (/^\d{1,3}(\.\d{3})+$/.test(compact)) return compact.replace(/\./g, "");
  if (/^\d{1,3}(,\d{3})+$/.test(compact) && compact.length > 5) {
    return compact.replace(/,/g, "");
  }
  const unified = compact.replace(/,/g, ".");
  const [whole, ...rest] = unified.split(".");
  return rest.length > 0 ? `${whole}.${rest.join("")}` : whole;
}
