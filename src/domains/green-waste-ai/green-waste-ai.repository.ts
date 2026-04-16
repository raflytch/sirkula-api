/**
 * @fileoverview Green Action Repository
 * @description Repository layer for green action database operations
 */

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  toPrismaQueryOptions,
  createPaginatedResult,
} from '../../commons/helpers/pagination.helper';
import { IPaginatedResult } from '../../commons/intefaces/pagination.interface';
import { green_action } from '@prisma/client';
import {
  QueryGreenActionDto,
  AdminQueryGreenActionDto,
} from './dto/query-green-action.dto';
import {
  GreenActionCategory,
  GreenActionStatus,
} from './enums/green-action.enum';
import {
  IUserGreenActionStats,
  IImpactAggregation,
  IDistrictImpact,
  IMonthlyTrend,
} from './interfaces/green-action.interface';

/**
 * Green Action Repository
 * @description Handles all database operations for green actions
 */
@Injectable()
export class GreenWasteAiRepository {
  /**
   * Inject database service
   * @param {DatabaseService} db - Prisma database service
   */
  constructor(private readonly db: DatabaseService) {}

  /**
   * Create a new green action
   * @param {object} data - Green action data
   * @returns {Promise<green_action>} Created green action
   */
  async create(data: {
    userId: string;
    category: string;
    description?: string;
    quantity: number;
    actionType?: string;
    mediaUrl: string;
    mediaType: string;
    status?: string;
    aiScore?: number;
    aiFeedback?: string;
    aiLabels?: string;
    points?: number;
    locationName?: string;
    latitude?: number;
    longitude?: number;
    district?: string;
    city?: string;
    isFlagged?: boolean;
    flagReason?: string | null;
    pointsHeld?: boolean;
  }): Promise<green_action> {
    return this.db.green_action.create({
      data: {
        user_id: data.userId,
        category: data.category,
        description: data.description,
        quantity: data.quantity,
        action_type: data.actionType,
        media_url: data.mediaUrl,
        media_type: data.mediaType,
        status: data.status || GreenActionStatus.PENDING,
        ai_score: data.aiScore,
        ai_feedback: data.aiFeedback,
        ai_labels: data.aiLabels,
        points: data.points || 0,
        location_name: data.locationName,
        latitude: data.latitude,
        longitude: data.longitude,
        district: data.district,
        city: data.city,
        is_flagged: data.isFlagged ?? false,
        flag_reason: data.flagReason ?? null,
        points_held: data.pointsHeld ?? false,
      },
    });
  }

  /**
   * Find green action by ID
   * @param {string} id - Green action ID
   * @returns {Promise<green_action | null>} Green action or null
   */
  async findById(id: string): Promise<green_action | null> {
    return this.db.green_action.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
          },
        },
      },
    });
  }

  /**
   * Find green action by ID for specific user
   * @param {string} id - Green action ID
   * @param {string} userId - User ID
   * @returns {Promise<green_action | null>} Green action or null
   */
  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<green_action | null> {
    return this.db.green_action.findFirst({
      where: {
        id,
        user_id: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
          },
        },
      },
    });
  }

  /**
   * Find all green actions for a user with pagination and filters
   * @param {string} userId - User ID
   * @param {QueryGreenActionDto} query - Query parameters
   * @returns {Promise<IPaginatedResult<green_action>>} Paginated green actions
   */
  async findByUserId(
    userId: string,
    query: QueryGreenActionDto,
  ): Promise<IPaginatedResult<green_action>> {
    const where = {
      user_id: userId,
      ...(query.category && { category: query.category }),
      ...(query.status && { status: query.status }),
      ...(query.subCategory && {
        ai_labels: { contains: query.subCategory },
      }),
      ...(query.district && { district: query.district }),
      ...(query.city && { city: query.city }),
    };

    const prismaOptions = toPrismaQueryOptions(query);

    const [data, total] = await Promise.all([
      this.db.green_action.findMany({
        where,
        ...prismaOptions,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar_url: true,
            },
          },
        },
      }),
      this.db.green_action.count({ where }),
    ]);

    return createPaginatedResult(data, total, query);
  }

  /**
   * Find all green actions with pagination and filters (admin)
   * @param {QueryGreenActionDto} query - Query parameters
   * @returns {Promise<IPaginatedResult<green_action>>} Paginated green actions
   */
  async findAll(
    query: QueryGreenActionDto,
  ): Promise<IPaginatedResult<green_action>> {
    const where = {
      ...(query.category && { category: query.category }),
      ...(query.status && { status: query.status }),
      ...(query.subCategory && {
        ai_labels: { contains: query.subCategory },
      }),
      ...(query.district && { district: query.district }),
      ...(query.city && { city: query.city }),
    };

    const prismaOptions = toPrismaQueryOptions(query);

    const [data, total] = await Promise.all([
      this.db.green_action.findMany({
        where,
        ...prismaOptions,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar_url: true,
            },
          },
        },
      }),
      this.db.green_action.count({ where }),
    ]);

    return createPaginatedResult(data, total, query);
  }

  /**
   * Find all green actions for admin without pagination
   * @param {AdminQueryGreenActionDto} query - Query parameters with filters
   * @returns {Promise<green_action[]>} All green actions matching filters
   */
  async findAllForAdmin(
    query: AdminQueryGreenActionDto,
  ): Promise<green_action[]> {
    const where: any = {};

    // Search filter (case insensitive)
    if (query.search) {
      where.OR = [
        {
          location_name: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          user: {
            name: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    // Category filter
    if (query.category) {
      where.category = query.category;
    }

    // Status filter
    if (query.status) {
      where.status = query.status;
    }

    // District filter (case insensitive)
    if (query.district) {
      where.district = {
        contains: query.district,
        mode: 'insensitive',
      };
    }

    // City filter (case insensitive)
    if (query.city) {
      where.city = {
        contains: query.city,
        mode: 'insensitive',
      };
    }

    return this.db.green_action.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  /**
   * Update green action with AI verification results
   * @param {string} id - Green action ID
   * @param {object} data - Update data
   * @returns {Promise<green_action>} Updated green action
   */
  async updateVerification(
    id: string,
    data: {
      status: string;
      aiScore: number;
      aiFeedback: string;
      aiLabels: string;
      points: number;
    },
  ): Promise<green_action> {
    return this.db.green_action.update({
      where: { id },
      data: {
        status: data.status,
        ai_score: data.aiScore,
        ai_feedback: data.aiFeedback,
        ai_labels: data.aiLabels,
        points: data.points,
      },
    });
  }

  /**
   * Delete green action
   * @param {string} id - Green action ID
   * @returns {Promise<green_action>} Deleted green action
   */
  async delete(id: string): Promise<green_action> {
    return this.db.green_action.delete({
      where: { id },
    });
  }

  /**
   * Get user green action statistics
   * @param {string} userId - User ID
   * @returns {Promise<IUserGreenActionStats>} User statistics
   */
  async getUserStats(userId: string): Promise<IUserGreenActionStats> {
    const [totalActions, verifiedActions, pendingActions, categoryStats] =
      await Promise.all([
        this.db.green_action.count({
          where: { user_id: userId },
        }),
        this.db.green_action.count({
          where: {
            user_id: userId,
            status: GreenActionStatus.VERIFIED,
          },
        }),
        this.db.green_action.count({
          where: {
            user_id: userId,
            status: GreenActionStatus.PENDING,
          },
        }),
        this.db.green_action.groupBy({
          by: ['category'],
          where: { user_id: userId },
          _count: { id: true },
          _sum: { points: true },
        }),
      ]);

    /**
     * Calculate total points from verified actions
     */
    const totalPointsResult = await this.db.green_action.aggregate({
      where: {
        user_id: userId,
        status: GreenActionStatus.VERIFIED,
      },
      _sum: { points: true },
    });

    /**
     * Build category statistics object
     */
    const byCategory: IUserGreenActionStats['byCategory'] = {};
    for (const stat of categoryStats) {
      byCategory[stat.category as GreenActionCategory] = {
        count: stat._count.id,
        points: stat._sum.points || 0,
      };
    }

    return {
      totalActions,
      totalPoints: totalPointsResult._sum.points || 0,
      verifiedActions,
      pendingActions,
      byCategory,
    };
  }

  /**
   * Update user total points after green action verification
   * @param {string} userId - User ID
   * @param {number} points - Points to add
   * @returns {Promise<void>}
   */
  async updateUserPoints(userId: string, points: number): Promise<void> {
    await this.db.user.update({
      where: { id: userId },
      data: {
        total_points: {
          increment: points,
        },
      },
    });
  }

  /**
   * Get recent verified actions for leaderboard
   * @param {number} limit - Number of actions to return
   * @returns {Promise<green_action[]>} Recent verified actions
   */
  async getRecentVerifiedActions(limit: number = 10): Promise<green_action[]> {
    return this.db.green_action.findMany({
      where: {
        status: GreenActionStatus.VERIFIED,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar_url: true,
          },
        },
      },
    });
  }

  async getImpactAggregation(): Promise<IImpactAggregation> {
    const [aggregation, districts, cities] = await Promise.all([
      this.db.green_action.aggregate({
        where: { status: GreenActionStatus.VERIFIED },
        _sum: { quantity: true },
        _count: { id: true },
      }),
      this.db.green_action.findMany({
        where: {
          status: GreenActionStatus.VERIFIED,
          district: { not: null },
        },
        distinct: ['district'],
        select: { district: true },
      }),
      this.db.green_action.findMany({
        where: {
          status: GreenActionStatus.VERIFIED,
          city: { not: null },
        },
        distinct: ['city'],
        select: { city: true },
      }),
    ]);

    return {
      totalQuantity: Math.round((aggregation._sum.quantity || 0) * 100) / 100,
      totalActions: aggregation._count.id,
      totalUniqueDistricts: districts.length,
      totalUniqueCities: cities.length,
    };
  }

  async getImpactByDistrict(): Promise<IDistrictImpact[]> {
    const results = await this.db.green_action.groupBy({
      by: ['district', 'city'],
      where: {
        status: GreenActionStatus.VERIFIED,
        district: { not: null },
      },
      _count: { id: true },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
    });

    return results.map((r) => ({
      district: r.district || '',
      city: r.city || '',
      totalActions: r._count.id,
      totalQuantity: Math.round((r._sum.quantity || 0) * 100) / 100,
    }));
  }

  async getDistinctKelurahans(): Promise<{ district: string; city: string }[]> {
    const results = await this.db.green_action.findMany({
      where: {
        status: GreenActionStatus.VERIFIED,
        district: { not: null },
      },
      distinct: ['district', 'city'],
      select: {
        district: true,
        city: true,
      },
      orderBy: { district: 'asc' },
    });

    return results
      .filter((r) => r.district)
      .map((r) => ({
        district: r.district!,
        city: r.city || '',
      }));
  }

  async getKelurahanReport(district: string): Promise<{
    district: string;
    city: string;
    totalActions: number;
    totalQuantity: number;
    verifiedActions: number;
    rejectedActions: number;
    totalPoints: number;
    totalUsers: number;
    byCategory: { category: string; count: number; quantity: number }[];
    recentActions: {
      category: string;
      description: string | null;
      quantity: number;
      actionType: string | null;
      points: number;
      locationName: string | null;
      createdAt: Date;
      userName: string;
    }[];
  }> {
    const whereBase = {
      district: { equals: district, mode: 'insensitive' as const },
      status: GreenActionStatus.VERIFIED,
    };

    const [
      aggregation,
      categoryStats,
      distinctUsers,
      recentActions,
      cityResult,
    ] = await Promise.all([
      this.db.green_action.aggregate({
        where: whereBase,
        _sum: { quantity: true, points: true },
        _count: { id: true },
      }),
      this.db.green_action.groupBy({
        by: ['category'],
        where: whereBase,
        _count: { id: true },
        _sum: { quantity: true },
      }),
      this.db.green_action.findMany({
        where: whereBase,
        distinct: ['user_id'],
        select: { user_id: true },
      }),
      this.db.green_action.findMany({
        where: whereBase,
        take: 20,
        orderBy: { created_at: 'desc' },
        select: {
          category: true,
          description: true,
          quantity: true,
          action_type: true,
          points: true,
          location_name: true,
          created_at: true,
          user: { select: { name: true } },
        },
      }),
      this.db.green_action.findFirst({
        where: { district: { equals: district, mode: 'insensitive' } },
        select: { city: true },
      }),
    ]);

    const rejectedCount = await this.db.green_action.count({
      where: {
        district: { equals: district, mode: 'insensitive' },
        status: GreenActionStatus.REJECTED,
      },
    });

    return {
      district,
      city: cityResult?.city || '',
      totalActions: aggregation._count.id,
      totalQuantity: Math.round((aggregation._sum.quantity || 0) * 100) / 100,
      verifiedActions: aggregation._count.id,
      rejectedActions: rejectedCount,
      totalPoints: aggregation._sum.points || 0,
      totalUsers: distinctUsers.length,
      byCategory: categoryStats.map((s) => ({
        category: s.category,
        count: s._count.id,
        quantity: Math.round((s._sum.quantity || 0) * 100) / 100,
      })),
      recentActions: recentActions.map((a) => ({
        category: a.category,
        description: a.description,
        quantity: a.quantity,
        actionType: a.action_type,
        points: a.points,
        locationName: a.location_name,
        createdAt: a.created_at,
        userName: a.user?.name || 'Anonim',
      })),
    };
  }

  async findAllByDistrict(district: string): Promise<green_action[]> {
    return this.db.green_action.findMany({
      where: {
        district: { equals: district, mode: 'insensitive' },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getMonthlyTrend(months: number = 6): Promise<IMonthlyTrend[]> {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const actions = await this.db.green_action.findMany({
      where: {
        status: GreenActionStatus.VERIFIED,
        created_at: { gte: since },
      },
      select: {
        created_at: true,
        quantity: true,
      },
      orderBy: { created_at: 'asc' },
    });

    const monthMap = new Map<
      string,
      { totalActions: number; totalQuantity: number }
    >();
    for (const action of actions) {
      const key = `${action.created_at.getFullYear()}-${String(action.created_at.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthMap.get(key) || {
        totalActions: 0,
        totalQuantity: 0,
      };
      existing.totalActions += 1;
      existing.totalQuantity += action.quantity;
      monthMap.set(key, existing);
    }

    return Array.from(monthMap.entries()).map(([month, data]) => ({
      month,
      totalActions: data.totalActions,
      totalQuantity: Math.round(data.totalQuantity * 100) / 100,
    }));
  }

  // ═══════════════════════════════════════════════════════════════════
  // Anti-cheat validation helpers
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Sum of quantity for a user + sub-category today (UTC day boundaries).
   */
  async getUserDailyQuantity(
    userId: string,
    subCategory: string,
  ): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const result = await this.db.green_action.aggregate({
      where: {
        user_id: userId,
        action_type: subCategory,
        created_at: { gte: startOfDay },
      },
      _sum: { quantity: true },
    });

    return Math.round((result._sum.quantity ?? 0) * 100) / 100;
  }

  /**
   * Timestamp of user's last action in a specific category.
   */
  async getLastActionTime(
    userId: string,
    category: string,
  ): Promise<Date | null> {
    const last = await this.db.green_action.findFirst({
      where: { user_id: userId, category },
      orderBy: { created_at: 'desc' },
      select: { created_at: true },
    });
    return last?.created_at ?? null;
  }

  /**
   * Total actions submitted by a user today (across all categories).
   */
  async getUserDailyActionCount(userId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return this.db.green_action.count({
      where: {
        user_id: userId,
        created_at: { gte: startOfDay },
      },
    });
  }

  /**
   * Average quantity and count for a user + sub-category (for anomaly detection).
   */
  async getUserSubCategoryStats(
    userId: string,
    subCategory: string,
  ): Promise<{ count: number; avgQuantity: number }> {
    const result = await this.db.green_action.aggregate({
      where: {
        user_id: userId,
        action_type: subCategory,
        status: GreenActionStatus.VERIFIED,
      },
      _avg: { quantity: true },
      _count: { id: true },
    });

    return {
      count: result._count.id,
      avgQuantity: result._avg.quantity ?? 0,
    };
  }

  /**
   * Count of verified actions for a user (for trust promotion).
   */
  async getUserVerifiedCount(userId: string): Promise<number> {
    return this.db.green_action.count({
      where: {
        user_id: userId,
        status: GreenActionStatus.VERIFIED,
        is_flagged: false,
      },
    });
  }

  /**
   * Count of recent consecutive non-flagged, verified actions.
   */
  async getRecentCleanActionCount(
    userId: string,
    limit: number,
  ): Promise<number> {
    const recent = await this.db.green_action.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
      select: { is_flagged: true, status: true },
    });

    let clean = 0;
    for (const action of recent) {
      if (!action.is_flagged && action.status === GreenActionStatus.VERIFIED) {
        clean++;
      } else {
        break; // streak broken
      }
    }
    return clean;
  }

  /**
   * Total flagged actions for a user (for trust demotion).
   */
  async getUserFlagCount(userId: string): Promise<number> {
    return this.db.green_action.count({
      where: { user_id: userId, is_flagged: true },
    });
  }

  /**
   * Update user trust level.
   */
  async updateUserTrustLevel(
    userId: string,
    trustLevel: string,
  ): Promise<void> {
    await this.db.user.update({
      where: { id: userId },
      data: { trust_level: trustLevel },
    });
  }

  /**
   * Get user trust level.
   */
  async getUserTrustLevel(userId: string): Promise<string> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { trust_level: true },
    });
    return user?.trust_level ?? 'NEW';
  }

  // ═══════════════════════════════════════════════════════════════════
  // Admin review for flagged actions
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get all flagged actions pending review.
   */
  async findFlaggedActions(): Promise<green_action[]> {
    return this.db.green_action.findMany({
      where: { is_flagged: true, reviewed_at: null },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
            trust_level: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Approve a flagged action: release held points and mark as reviewed.
   */
  async approveFlaggedAction(
    id: string,
    reviewerId: string,
  ): Promise<green_action> {
    return this.db.green_action.update({
      where: { id },
      data: {
        points_held: false,
        reviewed_by: reviewerId,
        reviewed_at: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
          },
        },
      },
    });
  }

  /**
   * Reject a flagged action: zero out points, set rejected status, mark reviewed.
   */
  async rejectFlaggedAction(
    id: string,
    reviewerId: string,
  ): Promise<green_action> {
    return this.db.green_action.update({
      where: { id },
      data: {
        status: GreenActionStatus.REJECTED,
        points: 0,
        points_held: false,
        reviewed_by: reviewerId,
        reviewed_at: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
          },
        },
      },
    });
  }
}
