/**
 * @fileoverview Voucher service
 * @description Business logic for voucher operations
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { VoucherRepository } from './voucher.repository';
import { CloudinaryService } from '../../libs/cloudinary/cloudinary.service';
import { MailerService } from '../../libs/mailer/mailer.service';
import {
  CreateVoucherDto,
  UpdateVoucherDto,
  QueryVoucherDto,
  QueryMyClaimsDto,
} from './dto';
import { DiscountType, VoucherClaimStatus } from './enums';
import { IVoucherResponse, IVoucherClaimResponse } from './interfaces';
import { randomBytes } from 'crypto';

/**
 * Voucher service
 * @description Handles voucher business logic and operations
 */
@Injectable()
export class VoucherService {
  /**
   * Logger instance for voucher service
   */
  private readonly logger = new Logger(VoucherService.name);

  constructor(
    private readonly voucherRepository: VoucherRepository,
    private readonly cloudinaryService: CloudinaryService,
    private readonly mailerService: MailerService,
  ) {}

  /**
   * Create a new voucher (UMKM only)
   * @param {string} umkmId - UMKM user ID
   * @param {CreateVoucherDto} dto - Voucher creation data
   * @param {Express.Multer.File} file - Optional voucher image
   * @returns {Promise<IVoucherResponse>} Created voucher
   */
  async createVoucher(
    umkmId: string,
    dto: CreateVoucherDto,
    file?: Express.Multer.File,
  ): Promise<IVoucherResponse> {
    const validFrom = new Date(dto.validFrom);
    const validUntil = new Date(dto.validUntil);

    if (validUntil <= validFrom) {
      throw new BadRequestException('Valid until must be after valid from');
    }

    if (validUntil <= new Date()) {
      throw new BadRequestException('Valid until must be in the future');
    }

    let imageUrl: string | undefined;
    if (file) {
      const uploaded = await this.cloudinaryService.uploadImage(file, {
        folder: 'vouchers',
        transformation: {
          width: 800,
          height: 600,
          crop: 'limit',
          quality: 'auto',
        },
      });
      imageUrl = uploaded.url;
    }

    const voucher = await this.voucherRepository.create(umkmId, {
      name: dto.name,
      description: dto.description,
      imageUrl,
      pointsRequired: dto.pointsRequired,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      quotaTotal: dto.quotaTotal,
      validFrom,
      validUntil,
    });

    return this.mapVoucherResponse(voucher);
  }

  /**
   * Get all vouchers (public)
   * @param {QueryVoucherDto} query - Query parameters
   * @returns {Promise<object>} Paginated vouchers
   */
  async getAllVouchers(query: QueryVoucherDto) {
    const queryWithActive = {
      ...query,
      isActive: query.isActive ?? true,
    } as QueryVoucherDto;

    const result = await this.voucherRepository.findAll(queryWithActive);

    return {
      data: result.data.map((v) => this.mapVoucherResponse(v)),
      meta: result.meta,
    };
  }

  /**
   * Get voucher by ID
   * @param {string} id - Voucher ID
   * @returns {Promise<IVoucherResponse>} Voucher details
   */
  async getVoucherById(id: string): Promise<IVoucherResponse> {
    const voucher = await this.voucherRepository.findById(id);
    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }
    return this.mapVoucherResponse(voucher);
  }

  /**
   * Get UMKM's own vouchers
   * @param {string} umkmId - UMKM user ID
   * @param {QueryVoucherDto} query - Query parameters
   * @returns {Promise<object>} Paginated vouchers
   */
  async getMyVouchers(umkmId: string, query: QueryVoucherDto) {
    const result = await this.voucherRepository.findByUmkmId(umkmId, query);

    return {
      data: result.data.map((v) => ({
        ...this.mapVoucherResponse(v),
        totalClaims: v._count?.voucher_claims || 0,
      })),
      meta: result.meta,
    };
  }

  /**
   * Update voucher (UMKM owner only)
   * @param {string} id - Voucher ID
   * @param {string} umkmId - UMKM user ID
   * @param {UpdateVoucherDto} dto - Update data
   * @param {Express.Multer.File} file - Optional new image
   * @returns {Promise<IVoucherResponse>} Updated voucher
   */
  async updateVoucher(
    id: string,
    umkmId: string,
    dto: UpdateVoucherDto,
    file?: Express.Multer.File,
  ): Promise<IVoucherResponse> {
    const voucher = await this.voucherRepository.findById(id);
    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    if (voucher.umkm_id !== umkmId) {
      throw new ForbiddenException('You can only update your own vouchers');
    }

    let imageUrl: string | undefined;
    if (file) {
      if (voucher.image_url) {
        const publicId = this.extractPublicId(voucher.image_url);
        if (publicId) {
          await this.cloudinaryService.deleteFile(publicId);
        }
      }

      const uploaded = await this.cloudinaryService.uploadImage(file, {
        folder: 'vouchers',
        transformation: {
          width: 800,
          height: 600,
          crop: 'limit',
          quality: 'auto',
        },
      });
      imageUrl = uploaded.url;
    }

    const updated = await this.voucherRepository.update(id, {
      name: dto.name,
      description: dto.description,
      imageUrl,
      pointsRequired: dto.pointsRequired,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      quotaTotal: dto.quotaTotal,
      isActive: dto.isActive,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
    });

    return this.mapVoucherResponse(updated);
  }

  /**
   * Delete voucher (UMKM owner only)
   * @param {string} id - Voucher ID
   * @param {string} umkmId - UMKM user ID
   * @returns {Promise<void>}
   */
  async deleteVoucher(id: string, umkmId: string): Promise<void> {
    const voucher = await this.voucherRepository.findById(id);
    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    if (voucher.umkm_id !== umkmId) {
      throw new ForbiddenException('You can only delete your own vouchers');
    }

    if (voucher.image_url) {
      const publicId = this.extractPublicId(voucher.image_url);
      if (publicId) {
        await this.cloudinaryService.deleteFile(publicId);
      }
    }

    await this.voucherRepository.delete(id);
  }

  /**
   * Redeem voucher (WARGA only)
   * @param {string} userId - User ID
   * @param {string} voucherId - Voucher ID
   * @returns {Promise<IVoucherClaimResponse>} Claim details
   */
  async redeemVoucher(
    userId: string,
    voucherId: string,
  ): Promise<IVoucherClaimResponse> {
    const voucher = await this.voucherRepository.findById(voucherId);
    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    if (!voucher.is_active) {
      throw new BadRequestException('Voucher is not active');
    }

    const now = new Date();
    if (now < voucher.valid_from) {
      throw new BadRequestException('Voucher is not yet valid');
    }

    if (now > voucher.valid_until) {
      throw new BadRequestException('Voucher has expired');
    }

    if (voucher.quota_used >= voucher.quota_total) {
      throw new BadRequestException('Voucher quota exhausted');
    }

    const userPoints = await this.voucherRepository.getUserPoints(userId);
    if (userPoints < voucher.points_required) {
      throw new BadRequestException(
        `Insufficient points. Required: ${voucher.points_required}, Available: ${userPoints}`,
      );
    }

    const { claim, remainingPoints, user } =
      await this.voucherRepository.createClaim(userId, voucherId);

    /**
     * Send voucher redemption email to user
     * Awaited with try-catch for serverless compatibility (Vercel)
     */
    if (user.email) {
      try {
        await this.mailerService.sendVoucherRedemptionEmail(user.email, {
          userName: user.name,
          voucherName: voucher.name,
          redemptionCode: this.generateRedemptionCode(claim.id),
          pointsUsed: voucher.points_required,
          remainingPoints,
          discountType: voucher.discount_percentage
            ? 'PERCENTAGE'
            : 'FIXED_AMOUNT',
          discountValue:
            voucher.discount_percentage || voucher.discount_amount || 0,
          umkmName:
            voucher.umkm?.umkm_name || voucher.umkm?.name || 'UMKM Partner',
          validUntil: voucher.valid_until,
        });
        this.logger.log(`Redemption email sent to ${user.email}`);
      } catch (err) {
        this.logger.error(
          `Failed to send redemption email to ${user.email}: ${err.message}`,
        );
      }
    }

    return {
      ...this.mapClaimResponse(claim),
      remainingPoints,
    } as IVoucherClaimResponse & { remainingPoints: number };
  }

  /**
   * Get user's claimed vouchers
   * @param {string} userId - User ID
   * @param {QueryMyClaimsDto} query - Query parameters
   * @returns {Promise<object>} Paginated claims
   */
  async getMyClaims(userId: string, query: QueryMyClaimsDto) {
    const result = await this.voucherRepository.findUserClaims(userId, query);

    return {
      data: result.data.map((c) => this.mapClaimResponse(c)),
      meta: result.meta,
    };
  }

  /**
   * Get user voucher stats
   * @param {string} userId - User ID
   * @returns {Promise<object>} User statistics
   */
  async getUserStats(userId: string) {
    return this.voucherRepository.getUserStats(userId);
  }

  /**
   * Get UMKM voucher claims
   * @param {string} umkmId - UMKM user ID
   * @param {string} voucherId - Optional voucher filter
   * @param {QueryMyClaimsDto} query - Query parameters
   * @returns {Promise<object>} Paginated claims
   */
  async getUmkmClaims(
    umkmId: string,
    voucherId: string | undefined,
    query: QueryMyClaimsDto,
  ) {
    const result = await this.voucherRepository.findUmkmClaims(
      umkmId,
      voucherId,
      query,
    );

    return {
      data: result.data.map((c) => ({
        id: c.id,
        status: c.status,
        claimedAt: c.claimed_at,
        usedAt: c.used_at,
        voucher: {
          id: c.voucher.id,
          name: c.voucher.name,
          imageUrl: c.voucher.image_url,
        },
        user: {
          id: c.user.id,
          name: c.user.name,
          email: c.user.email,
          avatarUrl: c.user.avatar_url,
        },
        redemptionCode: this.generateRedemptionCode(c.id),
      })),
      meta: result.meta,
    };
  }

  /**
   * Get UMKM voucher stats
   * @param {string} umkmId - UMKM user ID
   * @returns {Promise<object>} UMKM statistics
   */
  async getUmkmStats(umkmId: string) {
    return this.voucherRepository.getUmkmStats(umkmId);
  }

  /**
   * Use voucher claim (WARGA only)
   * @param {string} claimId - Claim ID
   * @param {string} userId - User ID
   * @returns {Promise<IVoucherClaimResponse>} Updated claim
   */
  async useVoucher(
    claimId: string,
    userId: string,
  ): Promise<IVoucherClaimResponse> {
    const claim = await this.voucherRepository.findClaimById(claimId);
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    if (claim.user.id !== userId) {
      throw new ForbiddenException(
        'You can only use your own claimed vouchers',
      );
    }

    if (claim.status !== 'PENDING') {
      throw new BadRequestException(
        `Voucher claim is already ${claim.status.toLowerCase()}`,
      );
    }

    // Check if voucher is still valid
    const now = new Date();
    if (now > claim.voucher.valid_until) {
      throw new BadRequestException('Voucher has expired');
    }

    const updated = await this.voucherRepository.markClaimUsed(claimId);

    /**
     * Send notification email to UMKM
     * Awaited with try-catch for serverless compatibility (Vercel)
     */
    if (updated.voucher.umkm?.email) {
      try {
        await this.mailerService.sendVoucherUsedNotificationEmail(
          updated.voucher.umkm.email,
          {
            umkmName:
              updated.voucher.umkm?.umkm_name ||
              updated.voucher.umkm?.name ||
              'UMKM Partner',
            voucherName: updated.voucher.name,
            userName: claim.user.name,
            userEmail: claim.user.email,
            redemptionCode: this.generateRedemptionCode(claimId),
            discountType: updated.voucher.discount_percentage
              ? 'PERCENTAGE'
              : 'FIXED_AMOUNT',
            discountValue:
              updated.voucher.discount_percentage ||
              updated.voucher.discount_amount ||
              0,
            usedAt: new Date(),
          },
        );
        this.logger.log(
          `UMKM notification email sent to ${updated.voucher.umkm.email}`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to send UMKM notification email to ${updated.voucher.umkm.email}: ${err.message}`,
        );
      }
    }

    return this.mapClaimResponse(updated);
  }

  /**
   * Map voucher to response format
   * @param {any} voucher - Raw voucher data
   * @returns {IVoucherResponse} Formatted response
   */
  private mapVoucherResponse(voucher: any): IVoucherResponse {
    const discountType = voucher.discount_percentage
      ? DiscountType.PERCENTAGE
      : DiscountType.FIXED_AMOUNT;
    const discountValue =
      voucher.discount_percentage || voucher.discount_amount || 0;

    return {
      id: voucher.id,
      name: voucher.name,
      description: voucher.description,
      imageUrl: voucher.image_url,
      pointsRequired: voucher.points_required,
      discountType,
      discountValue,
      quotaTotal: voucher.quota_total,
      quotaUsed: voucher.quota_used,
      quotaRemaining: voucher.quota_total - voucher.quota_used,
      isActive: voucher.is_active,
      validFrom: voucher.valid_from,
      validUntil: voucher.valid_until,
      umkm: {
        id: voucher.umkm.id,
        name: voucher.umkm.umkm_name || voucher.umkm.name,
        logoUrl: voucher.umkm.umkm_logo_url,
        address: voucher.umkm.umkm_address,
        category: voucher.umkm.umkm_category,
      },
      createdAt: voucher.created_at,
    };
  }

  /**
   * Map claim to response format
   * @param {any} claim - Raw claim data
   * @returns {IVoucherClaimResponse} Formatted response
   */
  private mapClaimResponse(claim: any): IVoucherClaimResponse {
    return {
      id: claim.id,
      status: claim.status as VoucherClaimStatus,
      claimedAt: claim.claimed_at,
      usedAt: claim.used_at,
      voucher: this.mapVoucherResponse(claim.voucher),
      redemptionCode: this.generateRedemptionCode(claim.id),
    };
  }

  /**
   * Generate redemption code from claim ID
   * @param {string} claimId - Claim ID
   * @returns {string} Redemption code
   */
  private generateRedemptionCode(claimId: string): string {
    const hash = randomBytes(4).toString('hex').toUpperCase();
    const shortId = claimId.slice(-6).toUpperCase();
    return `RDM-${shortId}-${hash}`;
  }

  /**
   * Extract Cloudinary public ID from URL
   * @param {string} url - Cloudinary URL
   * @returns {string | null} Public ID
   */
  private extractPublicId(url: string): string | null {
    const match = url.match(/\/v\d+\/(.+)\.\w+$/);
    return match ? match[1] : null;
  }
}
