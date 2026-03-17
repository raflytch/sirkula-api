/**
 * @fileoverview Update user profile DTO
 * @description DTO for updating user profile information
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Update profile DTO
 * @description Request body for updating user profile (name, password)
 * @note Avatar is uploaded as file via multipart/form-data
 */
export class UpdateProfileDto {
  /**
   * Updated user display name
   * @example 'John Updated'
   */
  @ApiPropertyOptional({
    description: 'Updated display name',
    example: 'John Updated',
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name?: string;

  /**
   * Current password (required when changing password)
   * @example 'CurrentPass123!'
   */
  @ApiPropertyOptional({
    description: 'Current password (required when changing password)',
    example: 'CurrentPass123!',
  })
  @IsOptional()
  @IsString({ message: 'Current password must be a string' })
  currentPassword?: string;

  /**
   * New password (minimum 8 characters)
   * @example 'NewSecurePass123!'
   */
  @ApiPropertyOptional({
    description: 'New password (minimum 8 characters)',
    example: 'NewSecurePass123!',
  })
  @IsOptional()
  @IsString({ message: 'New password must be a string' })
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  newPassword?: string;
}

/**
 * Update UMKM profile DTO
 * @description Request body for updating UMKM-specific profile fields
 * @note UMKM logo is uploaded as file via multipart/form-data
 */
export class UpdateUmkmProfileDto {
  /**
   * UMKM business name
   * @example 'Toko Berkah Updated'
   */
  @ApiPropertyOptional({
    description: 'UMKM business name',
    example: 'Toko Berkah Updated',
  })
  @IsOptional()
  @IsString({ message: 'UMKM name must be a string' })
  umkmName?: string;

  /**
   * UMKM business description
   * @example 'Updated description'
   */
  @ApiPropertyOptional({
    description: 'UMKM business description',
    example: 'Updated description',
  })
  @IsOptional()
  @IsString({ message: 'UMKM description must be a string' })
  umkmDescription?: string;

  /**
   * UMKM business address
   * @example 'Jl. Updated No. 456, Jakarta'
   */
  @ApiPropertyOptional({
    description: 'UMKM business address',
    example: 'Jl. Updated No. 456, Jakarta',
  })
  @IsOptional()
  @IsString({ message: 'UMKM address must be a string' })
  umkmAddress?: string;

  /**
   * UMKM business category
   * @example 'Fashion'
   */
  @ApiPropertyOptional({
    description: 'UMKM business category',
    example: 'Fashion',
  })
  @IsOptional()
  @IsString({ message: 'UMKM category must be a string' })
  umkmCategory?: string;
}
