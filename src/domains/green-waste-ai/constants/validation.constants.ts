/**
 * @fileoverview Anti-cheat validation constants
 * @description Rule-based limits, cooldowns, anomaly thresholds, and trust level configs
 */

import { GreenActionCategory } from '../enums/green-action.enum';

/**
 * Maximum quantity allowed per action per day, by sub-category.
 * Any submission exceeding this is rejected outright.
 */
export const DAILY_QUANTITY_LIMITS: Record<
  string,
  { maxPerAction: number; maxPerDay: number; unit: string }
> = {
  // PILAH_SAMPAH
  SAMPAH_ORGANIK: { maxPerAction: 10, maxPerDay: 20, unit: 'kg' },
  SAMPAH_ANORGANIK: { maxPerAction: 10, maxPerDay: 20, unit: 'kg' },
  SAMPAH_B3: { maxPerAction: 5, maxPerDay: 10, unit: 'kg' },

  // TANAM_POHON
  TANAM_POHON_BARU: { maxPerAction: 10, maxPerDay: 20, unit: 'pohon' },
  URBAN_FARMING: { maxPerAction: 15, maxPerDay: 30, unit: 'tanaman' },
  GREEN_CORNER: { maxPerAction: 5, maxPerDay: 10, unit: 'area' },

  // KONSUMSI_HIJAU
  PRODUK_ORGANIK: { maxPerAction: 20, maxPerDay: 30, unit: 'item' },
  REFILL_STATION: { maxPerAction: 10, maxPerDay: 20, unit: 'item' },
  BARANG_REUSABLE: { maxPerAction: 10, maxPerDay: 15, unit: 'item' },

  // AKSI_KOLEKTIF
  KERJA_BAKTI: { maxPerAction: 50, maxPerDay: 50, unit: 'kg' },
  BERSIH_SUNGAI: { maxPerAction: 100, maxPerDay: 100, unit: 'kg' },
};

/**
 * Cooldown in minutes between submissions of the same category.
 */
export const COOLDOWN_MINUTES: Record<string, number> = {
  [GreenActionCategory.PILAH_SAMPAH]: 30,
  [GreenActionCategory.TANAM_POHON]: 60,
  [GreenActionCategory.KONSUMSI_HIJAU]: 15,
  [GreenActionCategory.AKSI_KOLEKTIF]: 120,
};

/**
 * Default cooldown if category not found.
 */
export const DEFAULT_COOLDOWN_MINUTES = 30;

/**
 * Anomaly detection multiplier.
 * If a user submits quantity > (userAverage * ANOMALY_MULTIPLIER), it gets flagged.
 */
export const ANOMALY_MULTIPLIER = 3;

/**
 * Minimum number of past actions needed before anomaly detection kicks in.
 * Before this threshold, we rely on rule-based limits only.
 */
export const ANOMALY_MIN_HISTORY = 5;

/**
 * Trust level definitions and their limit multipliers.
 */
export const TRUST_LEVEL_CONFIG = {
  NEW: {
    /** Fresh user — tighter limits */
    limitMultiplier: 0.5,
    /** Number of verified actions to graduate to TRUSTED */
    promoteAfter: 10,
  },
  TRUSTED: {
    /** Proven user — standard limits */
    limitMultiplier: 1.0,
    /** Not applicable; stays TRUSTED unless flagged */
    promoteAfter: Infinity,
  },
  FLAGGED: {
    /** Suspected cheater — strictest limits */
    limitMultiplier: 0.3,
    /** Number of consecutive clean actions to recover to NEW */
    promoteAfter: 15,
  },
} as const;

/**
 * Number of rejections / flags that trigger a trust-level downgrade.
 */
export const FLAG_THRESHOLD_FOR_DOWNGRADE = 3;

/**
 * Maximum number of actions per day (across all categories) as a global cap.
 */
export const MAX_ACTIONS_PER_DAY = 15;

/**
 * Maximum number of actions per category per day.
 */
export const MAX_ACTIONS_PER_CATEGORY_PER_DAY = 3;
