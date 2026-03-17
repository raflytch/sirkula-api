/**
 * @fileoverview Voucher repository
 * @description Database operations for voucher and voucher claims
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import { IPaginatedResult } from '../../commons/intefaces/pagination.interface';
import { createPaginatedResult } from '../../commons/helpers/pagination.helper';
import { QueryVoucherDto, QueryMyClaimsDto } from './dto';
import { DiscountType } from './enums';

/**
 * Voucher repository
 * @description Handles all database operations for vouchers
 */
@Injectable()
export class VoucherRepository {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Create a new voucher
   * @param {string} umkmId - UMKM user ID
   * @param {object} data - Voucher creation data
   * @returns {Promise<any>} Created voucher
   */
  async create(
    umkmId: string,
    data: {
      name: string;
      description: string;
      imageUrl?: string;
      pointsRequired: number;
      discountType: DiscountType;
      discountValue: number;
      quotaTotal: number;
      validFrom: Date;
      validUntil: Date;
    },
  ) {
    const discountPercentage =
      data.discountType === DiscountType.PERCENTAGE ? data.discountValue : null;
    const discountAmount =
      data.discountType === DiscountType.FIXED_AMOUNT
        ? data.discountValue
        : null;

    return this.db.voucher.create({
      data: {
        umkm_id: umkmId,
        name: data.name,
        description: data.description,
        image_url: data.imageUrl,
        points_required: data.pointsRequired,
        discount_percentage: discountPercentage,
        discount_amount: discountAmount,
        quota_total: data.quotaTotal,
        valid_from: data.validFrom,
        valid_until: data.validUntil,
      },
      include: {
        umkm: {
          select: {
            id: true,
            name: true,
            umkm_name: true,
            umkm_logo_url: true,
            umkm_address: true,
            umkm_category: true,
          },
        },
      },
    });
  }

  /**
   * Find voucher by ID
   * @param {string} id - Voucher ID
   * @returns {Promise<any>} Voucher or null
   */
  async findById(id: string) {
    return this.db.voucher.findUnique({
      where: { id },
      include: {
        umkm: {
          select: {
            id: true,
            name: true,
            email: true,
            umkm_name: true,
            umkm_logo_url: true,
            umkm_address: true,
            umkm_category: true,
          },
        },
      },
    });
  }

  /**
   * Find all vouchers with pagination and filters
   * @param {QueryVoucherDto} query - Query parameters
   * @returns {Promise<IPaginatedResult<any>>} Paginated vouchers
   */
  async findAll(query: QueryVoucherDto): Promise<IPaginatedResult<any>> {
    const {
      page = 1,
      limit = 10,
      isActive,
      umkmId,
      minPoints,
      maxPoints,
      category,
      search,
    } = query;

    /**
     * Build points_required filter with combined gte and lte
     */
    const pointsFilter: { gte?: number; lte?: number } | undefined =
      minPoints !== undefined || maxPoints !== undefined
        ? {
            ...(minPoints !== undefined && { gte: minPoints }),
            ...(maxPoints !== undefined && { lte: maxPoints }),
          }
        : undefined;

    const where: Prisma.voucherWhereInput = {
      ...(isActive !== undefined && { is_active: isActive }),
      ...(umkmId && { umkm_id: umkmId }),
      ...(pointsFilter && { points_required: pointsFilter }),
      ...(category && { umkm: { umkm_category: category } }),
      ...(search && {
        OR: [
          {
            name: {
              contains: search,
              mode: 'insensitive' as Prisma.QueryMode,
            },
          },
          {
            description: {
              contains: search,
              mode: 'insensitive' as Prisma.QueryMode,
            },
          },
        ],
      }),
    };

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.db.voucher.findMany({
        where,
        include: {
          umkm: {
            select: {
              id: true,
              name: true,
              email: true,
              umkm_name: true,
              umkm_logo_url: true,
              umkm_address: true,
              umkm_category: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.db.voucher.count({ where }),
    ]);

    return createPaginatedResult(data, total, { page, limit });
  }

  /**
   * Find vouchers by UMKM ID
   * @param {string} umkmId - UMKM user ID
   * @param {QueryVoucherDto} query - Query parameters
   * @returns {Promise<IPaginatedResult<any>>} Paginated vouchers
   */
  async findByUmkmId(
    umkmId: string,
    query: QueryVoucherDto,
  ): Promise<IPaginatedResult<any>> {
    const {
      page = 1,
      limit = 10,
      isActive,
      minPoints,
      maxPoints,
      search,
    } = query;

    /**
     * Build points_required filter with combined gte and lte
     */
    const pointsFilter: { gte?: number; lte?: number } | undefined =
      minPoints !== undefined || maxPoints !== undefined
        ? {
            ...(minPoints !== undefined && { gte: minPoints }),
            ...(maxPoints !== undefined && { lte: maxPoints }),
          }
        : undefined;

    const where: Prisma.voucherWhereInput = {
      umkm_id: umkmId,
      ...(isActive !== undefined && { is_active: isActive }),
      ...(pointsFilter && { points_required: pointsFilter }),
      ...(search && {
        OR: [
          {
            name: {
              contains: search,
              mode: 'insensitive' as Prisma.QueryMode,
            },
          },
          {
            description: {
              contains: search,
              mode: 'insensitive' as Prisma.QueryMode,
            },
          },
        ],
      }),
    };

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.db.voucher.findMany({
        where,
        include: {
          umkm: {
            select: {
              id: true,
              name: true,
              email: true,
              umkm_name: true,
              umkm_logo_url: true,
              umkm_address: true,
              umkm_category: true,
            },
          },
          _count: { select: { voucher_claims: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.db.voucher.count({ where }),
    ]);

    return createPaginatedResult(data, total, { page, limit });
  }

  /**
   * Update voucher
   * @param {string} id - Voucher ID
   * @param {object} data - Update data
   * @returns {Promise<any>} Updated voucher
   */
  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      imageUrl?: string;
      pointsRequired?: number;
      discountType?: DiscountType;
      discountValue?: number;
      quotaTotal?: number;
      isActive?: boolean;
      validFrom?: Date;
      validUntil?: Date;
    },
  ) {
    const updateData: Prisma.voucherUpdateInput = {};

    if (data.name) updateData.name = data.name;
    if (data.description) updateData.description = data.description;
    if (data.imageUrl) updateData.image_url = data.imageUrl;
    if (data.pointsRequired) updateData.points_required = data.pointsRequired;
    if (data.quotaTotal) updateData.quota_total = data.quotaTotal;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;
    if (data.validFrom) updateData.valid_from = data.validFrom;
    if (data.validUntil) updateData.valid_until = data.validUntil;

    if (data.discountType && data.discountValue) {
      if (data.discountType === DiscountType.PERCENTAGE) {
        updateData.discount_percentage = data.discountValue;
        updateData.discount_amount = null;
      } else {
        updateData.discount_amount = data.discountValue;
        updateData.discount_percentage = null;
      }
    }

    return this.db.voucher.update({
      where: { id },
      data: updateData,
      include: {
        umkm: {
          select: {
            id: true,
            name: true,
            umkm_name: true,
            umkm_logo_url: true,
            umkm_address: true,
            umkm_category: true,
          },
        },
      },
    });
  }

  /**
   * Delete voucher
   * @param {string} id - Voucher ID
   * @returns {Promise<any>} Deleted voucher
   */
  async delete(id: string) {
    return this.db.voucher.delete({ where: { id } });
  }

  /**
   * Create voucher claim
   * @param {string} userId - User ID
   * @param {string} voucherId - Voucher ID
   * @returns {Promise<object>} Created claim with user data
   */
  async createClaim(userId: string, voucherId: string) {
    return this.db.$transaction(async (tx) => {
      const voucher = await tx.voucher.update({
        where: { id: voucherId },
        data: { quota_used: { increment: 1 } },
      });

      const user = await tx.user.update({
        where: { id: userId },
        data: { total_points: { decrement: voucher.points_required } },
        select: {
          id: true,
          name: true,
          email: true,
          total_points: true,
        },
      });

      const claim = await tx.voucher_claim.create({
        data: {
          user_id: userId,
          voucher_id: voucherId,
          status: 'PENDING',
        },
        include: {
          voucher: {
            include: {
              umkm: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  umkm_name: true,
                  umkm_logo_url: true,
                  umkm_address: true,
                  umkm_category: true,
                },
              },
            },
          },
        },
      });

      return {
        claim,
        remainingPoints: user.total_points,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      };
    });
  }

  /**
   * Find claim by ID
   * @param {string} id - Claim ID
   * @returns {Promise<any>} Claim or null
   */
  async findClaimById(id: string) {
    return this.db.voucher_claim.findUnique({
      where: { id },
      include: {
        voucher: {
          include: {
            umkm: {
              select: {
                id: true,
                name: true,
                email: true,
                umkm_name: true,
                umkm_logo_url: true,
                umkm_address: true,
                umkm_category: true,
              },
            },
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  /**
   * Find user claims with pagination
   * @param {string} userId - User ID
   * @param {QueryMyClaimsDto} query - Query parameters
   * @returns {Promise<IPaginatedResult<any>>} Paginated claims
   */
  async findUserClaims(
    userId: string,
    query: QueryMyClaimsDto,
  ): Promise<IPaginatedResult<any>> {
    const { page = 1, limit = 10, status } = query;

    const where: Prisma.voucher_claimWhereInput = {
      user_id: userId,
      ...(status && { status }),
    };

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.db.voucher_claim.findMany({
        where,
        include: {
          voucher: {
            include: {
              umkm: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  umkm_name: true,
                  umkm_logo_url: true,
                  umkm_address: true,
                  umkm_category: true,
                },
              },
            },
          },
        },
        orderBy: { claimed_at: 'desc' },
        skip,
        take: limit,
      }),
      this.db.voucher_claim.count({ where }),
    ]);

    return createPaginatedResult(data, total, { page, limit });
  }

  /**
   * Find UMKM voucher claims
   * @param {string} umkmId - UMKM user ID
   * @param {string} voucherId - Optional voucher ID filter
   * @param {QueryMyClaimsDto} query - Query parameters
   * @returns {Promise<IPaginatedResult<any>>} Paginated claims
   */
  async findUmkmClaims(
    umkmId: string,
    voucherId: string | undefined,
    query: QueryMyClaimsDto,
  ): Promise<IPaginatedResult<any>> {
    const { page = 1, limit = 10, status } = query;

    const where: Prisma.voucher_claimWhereInput = {
      voucher: { umkm_id: umkmId },
      ...(voucherId && { voucher_id: voucherId }),
      ...(status && { status }),
    };

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.db.voucher_claim.findMany({
        where,
        include: {
          voucher: { select: { id: true, name: true, image_url: true } },
          user: {
            select: { id: true, name: true, email: true, avatar_url: true },
          },
        },
        orderBy: { claimed_at: 'desc' },
        skip,
        take: limit,
      }),
      this.db.voucher_claim.count({ where }),
    ]);

    return createPaginatedResult(data, total, { page, limit });
  }

  /**
   * Mark claim as used
   * @param {string} claimId - Claim ID
   * @returns {Promise<any>} Updated claim
   */
  async markClaimUsed(claimId: string) {
    return this.db.voucher_claim.update({
      where: { id: claimId },
      data: { status: 'USED', used_at: new Date() },
      include: {
        voucher: {
          include: {
            umkm: {
              select: {
                id: true,
                name: true,
                email: true,
                umkm_name: true,
                umkm_logo_url: true,
                umkm_address: true,
                umkm_category: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Check if user already claimed voucher
   * @param {string} userId - User ID
   * @param {string} voucherId - Voucher ID
   * @returns {Promise<boolean>} True if already claimed
   */
  async hasUserClaimed(userId: string, voucherId: string): Promise<boolean> {
    const claim = await this.db.voucher_claim.findFirst({
      where: { user_id: userId, voucher_id: voucherId },
    });
    return !!claim;
  }

  /**
   * Get user points
   * @param {string} userId - User ID
   * @returns {Promise<number>} User total points
   */
  async getUserPoints(userId: string): Promise<number> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { total_points: true },
    });
    return user?.total_points || 0;
  }

  /**
   * Get user voucher stats
   * @param {string} userId - User ID
   * @returns {Promise<object>} User voucher statistics
   */
  async getUserStats(userId: string) {
    const [claims, pointsData] = await Promise.all([
      this.db.voucher_claim.groupBy({
        by: ['status'],
        where: { user_id: userId },
        _count: { status: true },
      }),
      this.db.voucher_claim.findMany({
        where: { user_id: userId },
        select: { voucher: { select: { points_required: true } } },
      }),
    ]);

    const totalPointsSpent = pointsData.reduce(
      (sum, c) => sum + c.voucher.points_required,
      0,
    );

    const pendingCount =
      claims.find((c) => c.status === 'PENDING')?._count.status || 0;
    const usedCount =
      claims.find((c) => c.status === 'USED')?._count.status || 0;

    return {
      totalClaimed: claims.reduce((sum, c) => sum + c._count.status, 0),
      totalUsed: usedCount,
      totalPending: pendingCount,
      totalPointsSpent,
    };
  }

  /**
   * Get UMKM voucher stats
   * @param {string} umkmId - UMKM user ID
   * @returns {Promise<object>} UMKM voucher statistics
   */
  async getUmkmStats(umkmId: string) {
    const [vouchers, claims] = await Promise.all([
      this.db.voucher.aggregate({
        where: { umkm_id: umkmId },
        _count: { id: true },
        _sum: { quota_total: true, quota_used: true },
      }),
      this.db.voucher_claim.groupBy({
        by: ['status'],
        where: { voucher: { umkm_id: umkmId } },
        _count: { status: true },
      }),
    ]);

    const pendingCount =
      claims.find((c) => c.status === 'PENDING')?._count.status || 0;
    const usedCount =
      claims.find((c) => c.status === 'USED')?._count.status || 0;
    const expiredCount =
      claims.find((c) => c.status === 'EXPIRED')?._count.status || 0;

    return {
      totalVouchers: vouchers._count.id,
      totalQuota: vouchers._sum.quota_total || 0,
      totalRedeemed: vouchers._sum.quota_used || 0,
      claimsByStatus: {
        pending: pendingCount,
        used: usedCount,
        expired: expiredCount,
      },
    };
  }
}
