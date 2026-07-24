export type AnalyticsEventName =
  | "calculator_started"
  | "calculator_method_selected"
  | "calculator_step_viewed"
  | "calculator_step_completed"
  | "calculator_review_viewed"
  | "calculator_input_changed_after_result"
  | "calculation_blocked"
  | "calculation_completed"
  | "package_selected"
  | "survey_form_opened"
  | "survey_submitted"
  | "zalo_clicked";

type AnalyticsPayload = Record<string, string | number | boolean | null>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackEvent(
  event: AnalyticsEventName,
  payload: AnalyticsPayload = {},
): void {
  if (typeof window === "undefined") return;

  window.dataLayer?.push({ event, ...payload });

  if (process.env.NODE_ENV === "development") {
    console.info(`[analytics] ${event}`, payload);
  }
}
