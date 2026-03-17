/**
 * @fileoverview User repository for database operations
 * @description Handles all user-related database queries using Prisma
 */

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { Prisma, user, UserRole } from '@prisma/client';
import { IPaginationOptions } from '../../commons/intefaces/pagination.interface';
import { toPrismaQueryOptions } from '../../commons/helpers/pagination.helper';

/**
 * User creation data interface
 * @description Data required to create a new user
 */
export interface CreateUserData {
  email: string;
  name: string;
  passwordHash?: string;
  role: UserRole;
  googleId?: string;
  isEmailVerified?: boolean;
  avatarUrl?: string;
  umkmName?: string;
  umkmDescription?: string;
  umkmAddress?: string;
  umkmCategory?: string;
}

/**
 * User update data interface
 * @description Data that can be updated for a user
 */
export interface UpdateUserData {
  name?: string;
  passwordHash?: string;
  avatarUrl?: string;
  role?: UserRole;
  isEmailVerified?: boolean;
  umkmName?: string;
  umkmDescription?: string;
  umkmLogoUrl?: string;
  umkmAddress?: string;
  umkmCategory?: string;
  isActive?: boolean;
}

/**
 * User repository
 * @description Repository layer for user database operations
 */
@Injectable()
export class UserRepository {
  /**
   * Initialize repository with database service
   * @param {DatabaseService} db - Prisma database service
   */
  constructor(private readonly db: DatabaseService) {}

  /**
   * Find user by ID
   * @param {string} id - User ID
   * @returns {Promise<user | null>} User or null if not found
   */
  async findById(id: string): Promise<user | null> {
    return this.db.user.findUnique({
      where: { id },
    });
  }

  /**
   * Find user by email
   * @param {string} email - User email address
   * @returns {Promise<user | null>} User or null if not found
   */
  async findByEmail(email: string): Promise<user | null> {
    return this.db.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by Google ID
   * @param {string} googleId - Google ID
   * @returns {Promise<user | null>} User or null if not found
   */
  async findByGoogleId(googleId: string): Promise<user | null> {
    return this.db.user.findUnique({
      where: { google_id: googleId },
    });
  }

  /**
   * Create new user
   * @param {CreateUserData} data - User creation data
   * @returns {Promise<user>} Created user
   */
  async create(data: CreateUserData): Promise<user> {
    return this.db.user.create({
      data: {
        email: data.email,
        name: data.name,
        password_hash: data.passwordHash,
        role: data.role,
        google_id: data.googleId,
        is_email_verified: data.isEmailVerified ?? false,
        avatar_url: data.avatarUrl,
        umkm_name: data.umkmName,
        umkm_description: data.umkmDescription,
        umkm_address: data.umkmAddress,
        umkm_category: data.umkmCategory,
      },
    });
  }

  /**
   * Update user by ID
   * @param {string} id - User ID
   * @param {UpdateUserData} data - Update data
   * @returns {Promise<user>} Updated user
   */
  async update(id: string, data: UpdateUserData): Promise<user> {
    return this.db.user.update({
      where: { id },
      data: {
        name: data.name,
        password_hash: data.passwordHash,
        avatar_url: data.avatarUrl,
        role: data.role,
        is_email_verified: data.isEmailVerified,
        umkm_name: data.umkmName,
        umkm_description: data.umkmDescription,
        umkm_logo_url: data.umkmLogoUrl,
        umkm_address: data.umkmAddress,
        umkm_category: data.umkmCategory,
        is_active: data.isActive,
      },
    });
  }

  /**
   * Find all users with pagination
   * @param {IPaginationOptions} options - Pagination options
   * @param {Prisma.userWhereInput} [where] - Optional filter conditions
   * @returns {Promise<{ users: user[]; total: number }>} Users and total count
   */
  async findAll(
    options: IPaginationOptions,
    where?: Prisma.userWhereInput,
  ): Promise<{ users: user[]; total: number }> {
    const prismaOptions = toPrismaQueryOptions(options);

    const [users, total] = await this.db.$transaction([
      this.db.user.findMany({
        where,
        skip: prismaOptions.skip,
        take: prismaOptions.take,
        orderBy: prismaOptions.orderBy,
      }),
      this.db.user.count({ where }),
    ]);

    return { users, total };
  }

  /**
   * Delete user and handle relations
   * @param {string} id - User ID to delete
   * @returns {Promise<user>} Deleted user
   * @description Handles cascade deletion for:
   * - green_actions (onDelete: Cascade)
   * - voucher_claims (onDelete: Cascade)
   * - vouchers (onDelete: Cascade - for UMKM users)
   * - otp_codes (onDelete: Cascade)
   * All relations are automatically handled by Prisma cascade constraints defined in schema.prisma
   */
  async delete(id: string): Promise<user> {
    /**
     * Relations are handled by Prisma cascade delete defined in schema
     * All related records will be automatically deleted
     */
    return this.db.user.delete({
      where: { id },
    });
  }

  /**
   * Soft delete user (deactivate)
   * @param {string} id - User ID
   * @returns {Promise<user>} Deactivated user
   */
  async softDelete(id: string): Promise<user> {
    return this.db.user.update({
      where: { id },
      data: { is_active: false },
    });
  }

  /**
   * Check if email exists
   * @param {string} email - Email to check
   * @returns {Promise<boolean>} True if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const count = await this.db.user.count({
      where: { email },
    });
    return count > 0;
  }

  /**
   * Verify user's email
   * @param {string} id - User ID
   * @returns {Promise<user>} Updated user
   */
  async verifyEmail(id: string): Promise<user> {
    return this.db.user.update({
      where: { id },
      data: { is_email_verified: true },
    });
  }

  /**
   * Get user statistics for deletion preview
   * @param {string} userId - User ID
   * @returns {Promise<object>} User's related data counts
   */
  async getUserStats(userId: string): Promise<{
    greenActionsCount: number;
    voucherClaimsCount: number;
    vouchersCount: number;
  }> {
    const [greenActionsCount, voucherClaimsCount, vouchersCount] =
      await this.db.$transaction([
        this.db.green_action.count({ where: { user_id: userId } }),
        this.db.voucher_claim.count({ where: { user_id: userId } }),
        this.db.voucher.count({ where: { umkm_id: userId } }),
      ]);

    return {
      greenActionsCount,
      voucherClaimsCount,
      vouchersCount,
    };
  }
}
