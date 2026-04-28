/**
 * @fileoverview Green Action Validator Service
 * @description Multi-layered anti-cheat validation for green actions
 *
 * Layer 1 — Rule-based: max quantity per action/day, category cap, cooldown, global daily cap
 * Layer 2 — Anomaly detection: flag outlier quantities for admin review
 * Layer 3 — Proof: already enforced (media upload + GPS required)
 * Layer 4 — Trust / reputation: limits scale with user trust level
 */

import { Injectable, Logger } from '@nestjs/common';
import { GreenWasteAiRepository } from './green-waste-ai.repository';
import {
  GreenActionCategory,
  ValidationFailureType,
} from './enums/green-action.enum';
import {
  DAILY_QUANTITY_LIMITS,
  COOLDOWN_MINUTES,
  DEFAULT_COOLDOWN_MINUTES,
  ANOMALY_MULTIPLIER,
  ANOMALY_MIN_HISTORY,
  TRUST_LEVEL_CONFIG,
  FLAG_THRESHOLD_FOR_DOWNGRADE,
  MAX_ACTIONS_PER_DAY,
  MAX_ACTIONS_PER_CATEGORY_PER_DAY,
} from './constants/validation.constants';

export interface IValidationResult {
  passed: boolean;
  /** If not passed, hard rejection that should block the submit */
  rejected: boolean;
  /** If passed but flagged, action will be saved with points held */
  flagged: boolean;
  flagReason: string | null;
  failureType: ValidationFailureType | null;
  message: string | null;
}

@Injectable()
export class GreenActionValidatorService {
  private readonly logger = new Logger(GreenActionValidatorService.name);

  constructor(private readonly repository: GreenWasteAiRepository) {}

  /**
   * Run all validation layers against a new green action submission.
   */
  async validate(
    userId: string,
    category: GreenActionCategory,
    subCategory: string,
    quantity: number,
    userTrustLevel: string,
  ): Promise<IValidationResult> {
    const trustConfig =
      TRUST_LEVEL_CONFIG[userTrustLevel as keyof typeof TRUST_LEVEL_CONFIG] ??
      TRUST_LEVEL_CONFIG.NEW;

    // Layer 1a: Per-action quantity cap
    const subLimits = DAILY_QUANTITY_LIMITS[subCategory];
    if (subLimits) {
      const effectiveMax = Math.ceil(
        subLimits.maxPerAction * trustConfig.limitMultiplier,
      );
      if (quantity > effectiveMax) {
        return this.reject(
          ValidationFailureType.QUANTITY_EXCEEDED,
          `Kuantitas melebihi batas maksimum ${effectiveMax} ${subLimits.unit} per aksi (trust: ${userTrustLevel}). Batas: ${effectiveMax} ${subLimits.unit}.`,
        );
      }
    }

    // Layer 1b: Daily quantity cap per sub-category
    if (subLimits) {
      const todayTotal = await this.repository.getUserDailyQuantity(
        userId,
        subCategory,
      );
      const effectiveDailyMax = Math.ceil(
        subLimits.maxPerDay * trustConfig.limitMultiplier,
      );
      if (todayTotal + quantity > effectiveDailyMax) {
        const remaining = Math.max(0, effectiveDailyMax - todayTotal);
        return this.reject(
          ValidationFailureType.DAILY_LIMIT_EXCEEDED,
          `Batas harian untuk ${subCategory} sudah tercapai. Sisa kuota hari ini: ${remaining} ${subLimits.unit}.`,
        );
      }
    }

    // Layer 1c: Daily action cap per category
    const todayCategoryActionCount =
      await this.repository.getUserDailyActionCountByCategory(userId, category);
    if (todayCategoryActionCount >= MAX_ACTIONS_PER_CATEGORY_PER_DAY) {
      return this.reject(
        ValidationFailureType.DAILY_LIMIT_EXCEEDED,
        `Anda sudah mencapai batas ${MAX_ACTIONS_PER_CATEGORY_PER_DAY} aksi untuk kategori ${category} hari ini. Coba lagi besok atau pilih kategori lain.`,
      );
    }

    // Layer 1d: Cooldown between same-category actions
    const cooldownMinutes =
      COOLDOWN_MINUTES[category] ?? DEFAULT_COOLDOWN_MINUTES;
    const lastActionAt = await this.repository.getLastActionTime(
      userId,
      category,
    );
    if (lastActionAt) {
      const elapsedMs = Date.now() - lastActionAt.getTime();
      const elapsedMinutes = elapsedMs / 60_000;
      if (elapsedMinutes < cooldownMinutes) {
        const waitMinutes = Math.ceil(cooldownMinutes - elapsedMinutes);
        return this.reject(
          ValidationFailureType.COOLDOWN_ACTIVE,
          `Harap tunggu ${waitMinutes} menit lagi sebelum submit aksi ${category} berikutnya.`,
        );
      }
    }

    // Layer 1e: Global daily action cap
    const todayActionCount =
      await this.repository.getUserDailyActionCount(userId);
    if (todayActionCount >= MAX_ACTIONS_PER_DAY) {
      return this.reject(
        ValidationFailureType.GLOBAL_DAILY_CAP,
        `Anda sudah mencapai batas ${MAX_ACTIONS_PER_DAY} aksi per hari. Coba lagi besok.`,
      );
    }

    // Layer 2: Anomaly detection (soft flag)
    const anomalyResult = await this.checkAnomaly(
      userId,
      subCategory,
      quantity,
    );
    if (anomalyResult.flagged) {
      this.logger.warn(
        `Anomaly detected for user ${userId}: ${anomalyResult.reason}`,
      );
      return {
        passed: true,
        rejected: false,
        flagged: true,
        flagReason: anomalyResult.reason,
        failureType: ValidationFailureType.ANOMALY_FLAGGED,
        message: null,
      };
    }

    // All layers passed
    return {
      passed: true,
      rejected: false,
      flagged: false,
      flagReason: null,
      failureType: null,
      message: null,
    };
  }

  /**
   * Check whether the submitted quantity is anomalous compared to user history.
   */
  private async checkAnomaly(
    userId: string,
    subCategory: string,
    quantity: number,
  ): Promise<{ flagged: boolean; reason: string | null }> {
    const stats = await this.repository.getUserSubCategoryStats(
      userId,
      subCategory,
    );

    if (stats.count < ANOMALY_MIN_HISTORY) {
      return { flagged: false, reason: null };
    }

    const threshold = stats.avgQuantity * ANOMALY_MULTIPLIER;
    if (quantity > threshold) {
      return {
        flagged: true,
        reason: `Kuantitas ${quantity} jauh di atas rata-rata user (${stats.avgQuantity.toFixed(1)}) untuk ${subCategory}. Threshold: ${threshold.toFixed(1)}.`,
      };
    }

    return { flagged: false, reason: null };
  }

  // ── Trust level management ────────────────────────────────────────

  /**
   * After a successful, non-flagged verification, potentially upgrade the user trust level.
   */
  async maybePromoteTrust(userId: string, currentTrust: string): Promise<void> {
    if (currentTrust === 'TRUSTED') return;

    const config =
      TRUST_LEVEL_CONFIG[currentTrust as keyof typeof TRUST_LEVEL_CONFIG];
    if (!config) return;

    const verifiedCount = await this.repository.getUserVerifiedCount(userId);

    if (currentTrust === 'NEW' && verifiedCount >= config.promoteAfter) {
      await this.repository.updateUserTrustLevel(userId, 'TRUSTED');
      this.logger.log(`User ${userId} promoted from NEW → TRUSTED`);
    }

    if (currentTrust === 'FLAGGED') {
      const recentClean = await this.repository.getRecentCleanActionCount(
        userId,
        config.promoteAfter,
      );
      if (recentClean >= config.promoteAfter) {
        await this.repository.updateUserTrustLevel(userId, 'NEW');
        this.logger.log(`User ${userId} recovered from FLAGGED → NEW`);
      }
    }
  }

  /**
   * After a flag or rejection, potentially downgrade the user trust level.
   */
  async maybeDemoteTrust(userId: string, currentTrust: string): Promise<void> {
    if (currentTrust === 'FLAGGED') return;

    const flagCount = await this.repository.getUserFlagCount(userId);

    if (flagCount >= FLAG_THRESHOLD_FOR_DOWNGRADE) {
      await this.repository.updateUserTrustLevel(userId, 'FLAGGED');
      this.logger.log(`User ${userId} demoted to FLAGGED (${flagCount} flags)`);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private reject(
    failureType: ValidationFailureType,
    message: string,
  ): IValidationResult {
    return {
      passed: false,
      rejected: true,
      flagged: false,
      flagReason: null,
      failureType,
      message,
    };
  }
}
