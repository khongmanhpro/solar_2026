/**
 * Above this monthly demand (measured use plus planned appliances) a household
 * is plausibly on 3-phase supply, so an "unknown" phase keeps 3-phase packages
 * in play; below it almost all Vietnamese homes are single-phase. Either way
 * the survey confirms it.
 */
export const UNKNOWN_PHASE_THREE_PHASE_MIN_KWH = 700;
