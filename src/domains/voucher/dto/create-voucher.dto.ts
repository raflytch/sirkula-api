/**
 * @fileoverview Create voucher DTO
 * @description DTOs for voucher creation and management
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DiscountType } from '../enums';

/**
 * Create voucher DTO
 * @description Validation for creating a new voucher (UMKM only)
 */
export class CreateVoucherDto {
  @ApiProperty({
    description: 'Voucher name',
    example: 'Diskon 20% Kopi Lokal',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Voucher description',
    example: 'Dapatkan diskon 20% untuk semua produk kopi lokal',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @ApiProperty({
    description: 'Points required to redeem',
    example: 100,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pointsRequired: number;

  @ApiProperty({
    description: 'Discount type',
    enum: DiscountType,
    example: DiscountType.PERCENTAGE,
  })
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @ApiProperty({
    description: 'Discount value (percentage 1-100 or fixed amount)',
    example: 20,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @ValidateIf((o) => o.discountType === DiscountType.PERCENTAGE)
  @Max(100)
  @Type(() => Number)
  discountValue: number;

  @ApiProperty({
    description: 'Total voucher quota',
    example: 50,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quotaTotal: number;

  @ApiProperty({
    description: 'Voucher valid from date',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsDateString()
  @Transform(({ value }) => new Date(value).toISOString())
  validFrom: string;

  @ApiProperty({
    description: 'Voucher valid until date',
    example: '2025-12-31T23:59:59.000Z',
  })
  @IsDateString()
  @Transform(({ value }) => new Date(value).toISOString())
  validUntil: string;
}

/**
 * Update voucher DTO
 * @description Validation for updating voucher (UMKM only)
 */
export class UpdateVoucherDto {
  @ApiPropertyOptional({
    description: 'Voucher name',
    example: 'Diskon 25% Kopi Lokal',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Voucher description',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Points required to redeem',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pointsRequired?: number;

  @ApiPropertyOptional({
    description: 'Discount type',
    enum: DiscountType,
  })
  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @ApiPropertyOptional({
    description: 'Discount value',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  discountValue?: number;

  @ApiPropertyOptional({
    description: 'Total voucher quota',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quotaTotal?: number;

  @ApiPropertyOptional({
    description: 'Voucher active status',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Voucher valid from date',
  })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({
    description: 'Voucher valid until date',
  })
  @IsOptional()
  @IsDateString()
  validUntil?: string;
}
