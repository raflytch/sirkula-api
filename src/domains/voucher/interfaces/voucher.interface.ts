/**
 * @fileoverview Voucher interfaces
 * @description Type definitions for voucher module
 */

import { DiscountType, VoucherClaimStatus } from '../enums';

/**
 * Voucher response interface
 * @description Standard voucher response with UMKM info
 */
export interface IVoucherResponse {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  pointsRequired: number;
  discountType: DiscountType;
  discountValue: number;
  quotaTotal: number;
  quotaUsed: number;
  quotaRemaining: number;
  isActive: boolean;
  validFrom: Date;
  validUntil: Date;
  umkm: {
    id: string;
    name: string;
    logoUrl: string | null;
    address: string | null;
    category: string | null;
  };
  createdAt: Date;
}

/**
 * Voucher claim response interface
 * @description Response for claimed voucher
 */
export interface IVoucherClaimResponse {
  id: string;
  status: VoucherClaimStatus;
  claimedAt: Date;
  usedAt: Date | null;
  voucher: IVoucherResponse;
  redemptionCode: string;
}

/**
 * Create voucher input interface
 * @description Input data for creating a voucher
 */
export interface ICreateVoucherInput {
  name: string;
  description: string;
  imageUrl?: string;
  pointsRequired: number;
  discountType: DiscountType;
  discountValue: number;
  quotaTotal: number;
  validFrom: Date;
  validUntil: Date;
}

/**
 * Update voucher input interface
 * @description Input data for updating a voucher
 */
export interface IUpdateVoucherInput {
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
}

/**
 * Voucher filter interface
 * @description Filter options for querying vouchers
 */
export interface IVoucherFilter {
  isActive?: boolean;
  umkmId?: string;
  minPoints?: number;
  maxPoints?: number;
  category?: string;
}

/**
 * User voucher stats interface
 * @description Statistics for user's voucher claims
 */
export interface IUserVoucherStats {
  totalClaimed: number;
  totalUsed: number;
  totalPending: number;
  totalPointsSpent: number;
}
