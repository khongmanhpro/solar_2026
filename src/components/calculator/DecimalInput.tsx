"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";

import { formatDecimalForDisplay, normalizeDecimalInput } from "@/lib/number-input";

type DecimalInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  /** Normalised JS decimal string ("1200.5"), as stored in form state. */
  value: string;
  onValueChange: (normalized: string) => void;
  /** Unit for the "Đã hiểu" echo, e.g. "kWh" or "m²". */
  unit: string;
  echoId: string;
  /** Class for the positioning wrapper around the input and its suffix. */
  wrapperClassName?: string;
  /** Unit badge drawn inside the field (absolutely positioned). */
  suffix?: ReactNode;
};

/**
 * Text input for Vietnamese decimals. It keeps exactly what the customer
 * typed and parses the whole string each time, so "12,500" is read once as
 * 12,5 instead of being re-read keystroke by keystroke. When the input has
 * separators it echoes how it was understood, so a misread is visible.
 */
export function DecimalInput({
  value,
  onValueChange,
  unit,
  echoId,
  wrapperClassName = "relative",
  suffix,
  ...inputProps
}: DecimalInputProps) {
  const [raw, setRaw] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);

  // The form may reset the value (method switch, restored draft); adopt it.
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (normalizeDecimalInput(raw) !== value) setRaw(value);
  }

  const understood = formatDecimalForDisplay(value);
  const showEcho = /[.,]/.test(raw) && understood !== "";
  const describedBy = [inputProps["aria-describedby"], showEcho ? echoId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className={wrapperClassName}>
        <input
          {...inputProps}
          aria-describedby={describedBy || undefined}
          inputMode="decimal"
          onChange={(event) => {
            const next = event.target.value;
            const normalized = normalizeDecimalInput(next);
            setRaw(next);
            setSyncedValue(normalized);
            onValueChange(normalized);
          }}
          type="text"
          value={raw}
        />
        {suffix}
      </div>
      {showEcho ? (
        <span className="mt-1 block text-xs text-[var(--muted)]" id={echoId}>
          Đã hiểu: {understood} {unit}
        </span>
      ) : null}
    </>
  );
}
