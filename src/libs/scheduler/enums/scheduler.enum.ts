/**
 * @fileoverview Scheduler enums
 * @description Enum definitions for scheduler module
 */

/**
 * Indonesia timezone constant
 * @description WIB (Waktu Indonesia Barat): UTC+7
 * All regions follow WIB time for leaderboard rewards
 */
export const INDONESIA_TIMEZONE = {
  /** IANA timezone identifier for WIB */
  IANA: 'Asia/Jakarta',
  /** Timezone abbreviation */
  NAME: 'WIB',
  /** UTC offset in hours */
  UTC_OFFSET: 7,
} as const;
