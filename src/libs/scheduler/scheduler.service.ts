/**
 * @fileoverview Scheduler service
 * @description Placeholder for scheduled tasks - Daily reward now handled via webhook
 * @deprecated Daily reward distribution moved to LeaderboardController.distributeReward webhook endpoint
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * Scheduler service
 * @description Placeholder service - reward distribution now handled via webhook POST /leaderboard/distribute-reward
 * @deprecated Use POST /leaderboard/distribute-reward with x-sha-key header instead
 */
@Injectable()
export class SchedulerService {
  /**
   * Logger instance
   */
  private readonly logger = new Logger(SchedulerService.name);

  constructor() {
    this.logger.log(
      '📌 SchedulerService initialized. Daily rewards handled via webhook endpoint.',
    );
  }
}
