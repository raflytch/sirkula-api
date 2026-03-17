/**
 * @fileoverview Leaderboard repository
 * @description Database operations for leaderboard (based on user.total_points)
 */

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { IPaginatedResult } from '../../commons/intefaces/pagination.interface';
import { createPaginatedResult } from '../../commons/helpers/pagination.helper';
import { QueryLeaderboardDto } from './dto';

/**
 * Leaderboard repository
 * @description Handles database operations for leaderboard (ALL_TIME based on user.total_points)
 */
@Injectable()
export class LeaderboardRepository {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Get leaderboard with pagination (ALL_TIME - based on user.total_points)
   * @param {QueryLeaderboardDto} query - Query parameters
   * @returns {Promise<IPaginatedResult<any>>} Paginated leaderboard
   */
  async getLeaderboard(
    query: QueryLeaderboardDto,
  ): Promise<IPaginatedResult<any>> {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    /**
     * Get all users sorted by total_points (from user table)
     */
    const usersWithPoints = await this.db.user.findMany({
      where: {
        role: 'WARGA',
        is_active: true,
        total_points: { gt: 0 },
      },
      select: {
        id: true,
        name: true,
        avatar_url: true,
        role: true,
        total_points: true,
        _count: {
          select: {
            green_actions: true,
          },
        },
      },
      orderBy: { total_points: 'desc' },
    });

    const total = usersWithPoints.length;
    const paginatedUsers = usersWithPoints.slice(skip, skip + limit);

    const dataWithRank = paginatedUsers.map((user, index) => ({
      rank: skip + index + 1,
      user: {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatar_url,
        role: user.role,
      },
      totalPoints: user.total_points,
      totalActions: user._count.green_actions,
    }));

    return createPaginatedResult(dataWithRank, total, { page, limit });
  }

  /**
   * Get top N users by total_points (ALL_TIME)
   * @param {number} topN - Number of top users
   * @returns {Promise<any[]>} Top users
   */
  async getTopUsers(topN: number = 3): Promise<any[]> {
    const topUsers = await this.db.user.findMany({
      where: {
        role: 'WARGA',
        is_active: true,
        total_points: { gt: 0 },
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar_url: true,
        total_points: true,
        _count: {
          select: {
            green_actions: true,
          },
        },
      },
      orderBy: { total_points: 'desc' },
      take: topN,
    });

    return topUsers.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
      totalPoints: user.total_points,
      totalActions: user._count.green_actions,
    }));
  }

  /**
   * Add bonus points to user
   * @param {string} userId - User ID
   * @param {number} bonusPoints - Bonus points to add
   * @returns {Promise<any>} Updated user
   */
  async addBonusPoints(userId: string, bonusPoints: number): Promise<any> {
    return this.db.user.update({
      where: { id: userId },
      data: {
        total_points: { increment: bonusPoints },
      },
      select: {
        id: true,
        email: true,
        name: true,
        total_points: true,
      },
    });
  }

  /**
   * Get user rank in leaderboard (ALL_TIME)
   * @param {string} userId - User ID
   * @returns {Promise<object>} User rank info
   */
  async getUserRank(userId: string): Promise<{
    rank: number;
    totalPoints: number;
    totalActions: number;
    percentile: number;
  }> {
    const usersWithPoints = await this.db.user.findMany({
      where: {
        role: 'WARGA',
        is_active: true,
        total_points: { gt: 0 },
      },
      select: {
        id: true,
        total_points: true,
        _count: {
          select: {
            green_actions: true,
          },
        },
      },
      orderBy: { total_points: 'desc' },
    });

    const userIndex = usersWithPoints.findIndex((u) => u.id === userId);
    const total = usersWithPoints.length;

    if (userIndex === -1) {
      /**
       * User not in leaderboard (no points)
       */
      return { rank: 0, totalPoints: 0, totalActions: 0, percentile: 0 };
    }

    const rank = userIndex + 1;
    const percentile =
      total > 0 ? Math.round(((total - rank) / total) * 100) : 0;

    return {
      rank,
      totalPoints: usersWithPoints[userIndex].total_points,
      totalActions: usersWithPoints[userIndex]._count.green_actions,
      percentile,
    };
  }
}
