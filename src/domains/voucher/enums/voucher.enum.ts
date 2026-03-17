/**
 * @fileoverview Voucher enums
 * @description Enum definitions for voucher module
 */

/**
 * Voucher claim status enum
 * @description Status of a voucher claim by user
 */
export enum VoucherClaimStatus {
  PENDING = 'PENDING',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
}

/**
 * Discount type enum
 * @description Type of discount offered by voucher
 */
export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}
