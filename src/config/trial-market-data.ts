export const TRIAL_PACKAGE_DATA_VERSION_PREFIX = "market-data-trial-";

interface TrialEnvironment {
  NODE_ENV?: string;
  PUBLIC_PREVIEW_MODE_ENABLED?: string;
  TRIAL_MARKET_DATA_ENABLED?: string;
}

function enabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export function isPublicPreviewModeEnabled(
  environment: TrialEnvironment = process.env,
): boolean {
  return enabled(environment.PUBLIC_PREVIEW_MODE_ENABLED);
}

export function isTrialMarketDataEnabled(
  environment: TrialEnvironment = process.env,
): boolean {
  if (!enabled(environment.TRIAL_MARKET_DATA_ENABLED)) return false;

  return (
    environment.NODE_ENV === "development" ||
    isPublicPreviewModeEnabled(environment)
  );
}
