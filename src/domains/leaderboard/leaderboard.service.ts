/**
 * @fileoverview Leaderboard service
 * @description Business logic for leaderboard operations (ALL_TIME based on user.total_points)
 */

import { Injectable, Logger } from '@nestjs/common';
import { LeaderboardRepository } from './leaderboard.repository';
import { MailerService } from '../../libs/mailer/mailer.service';
import { QueryLeaderboardDto } from './dto';
import { ILeaderboardEntry, IUserRankResponse } from './interfaces';
import {
  IDailyRewardResult,
  IDailyRewardWinner,
  ITopUserData,
} from '../../libs/scheduler/interfaces/scheduler.interface';
import {
  DAILY_BONUS_POINTS,
  TOP_USERS_COUNT,
} from '../../libs/scheduler/constants/scheduler.constant';

/**
 * Leaderboard service
 * @description Handles leaderboard logic and daily reward distribution via webhook
 */
@Injectable()
export class LeaderboardService {
  /**
   * Logger instance
   */
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    private readonly leaderboardRepository: LeaderboardRepository,
    private readonly mailerService: MailerService,
  ) {}

  /**
   * Get leaderboard with pagination (ALL_TIME)
   * @param {QueryLeaderboardDto} query - Query parameters
   * @returns {Promise<object>} Paginated leaderboard
   */
  async getLeaderboard(query: QueryLeaderboardDto) {
    const result = await this.leaderboardRepository.getLeaderboard(query);

    return {
      data: result.data as ILeaderboardEntry[],
      meta: result.meta,
    };
  }

  /**
   * Get user's current rank (ALL_TIME)
   * @param {string} userId - User ID
   * @returns {Promise<IUserRankResponse>} User rank info
   */
  async getUserRank(userId: string): Promise<IUserRankResponse> {
    return this.leaderboardRepository.getUserRank(userId);
  }

  /**
   * Get top 3 users by total_points (ALL_TIME)
   * @returns {Promise<any[]>} Top 3 users
   */
  async getTopThree() {
    return this.leaderboardRepository.getTopUsers(3);
  }

  /**
   * Distribute daily reward to top 3 users (called via webhook)
   * @returns {Promise<IDailyRewardResult | null>} Reward result
   */
  async distributeDailyReward(): Promise<IDailyRewardResult | null> {
    this.logger.log('🏆 Starting daily leaderboard reward distribution...');

    try {
      const topUsers =
        await this.leaderboardRepository.getTopUsers(TOP_USERS_COUNT);

      if (topUsers.length === 0) {
        this.logger.log('No users with points. Skipping reward distribution.');
        return null;
      }

      const winners: IDailyRewardWinner[] = [];
      let totalBonusDistributed = 0;

      /**
       * Process each top user
       */
      for (let i = 0; i < topUsers.length; i++) {
        const user = topUsers[i] as ITopUserData;
        const rank = (i + 1) as 1 | 2 | 3;
        const bonusPoints = DAILY_BONUS_POINTS[rank];

        /**
         * Add bonus points to user
         */
        const updatedUser = await this.leaderboardRepository.addBonusPoints(
          user.id,
          bonusPoints,
        );

        const winner: IDailyRewardWinner = {
          userId: user.id,
          email: user.email,
          name: user.name,
          rank,
          totalPoints: user.totalPoints,
          bonusPoints,
          newTotalPoints: updatedUser.total_points,
        };

        winners.push(winner);
        totalBonusDistributed += bonusPoints;

        /**
         * Send email notification to winner (awaited for serverless)
         */
        await this.sendRewardEmail(
          user,
          rank,
          bonusPoints,
          updatedUser.total_points,
        );

        this.logger.log(
          `🥇 Rank ${rank}: ${user.name} received ${bonusPoints} bonus points`,
        );
      }

      const now = new Date();
      const result: IDailyRewardResult = {
        date: now.toISOString().split('T')[0],
        timestamp: now.toISOString(),
        winners,
        totalBonusDistributed,
      };

      this.logger.log(
        `✅ Daily reward completed. Total bonus: ${totalBonusDistributed} points to ${winners.length} winners`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Daily reward distribution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send reward email to winner (awaited for serverless compatibility)
   * @param {ITopUserData} user - User data
   * @param {1 | 2 | 3} rank - User rank
   * @param {number} bonusPoints - Bonus points awarded
   * @param {number} newTotalPoints - New total points
   */
  private async sendRewardEmail(
    user: ITopUserData,
    rank: 1 | 2 | 3,
    bonusPoints: number,
    newTotalPoints: number,
  ): Promise<void> {
    try {
      await this.mailerService.sendLeaderboardRewardEmail(user.email, {
        userName: user.name,
        rank,
        todayPoints: user.totalPoints,
        bonusPoints,
        newTotalPoints,
        date: new Date(),
      });
      this.logger.log(`Reward email sent to ${user.email} for rank ${rank}`);
    } catch (err) {
      this.logger.error(
        `Failed to send reward email to ${user.email}: ${err.message}`,
      );
    }
  }
}
