/**
 * @fileoverview Register user DTO
 * @description DTO for user registration with email OTP verification
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { UserRole } from '@prisma/client';

/**
 * Re-export UserRole from Prisma for convenience
 */
export { UserRole };

/**
 * Send OTP for registration DTO
 * @description Request body for sending OTP to email address
 */
export class SendRegisterOtpDto {
  /**
   * Email address for OTP verification
   * @example 'user@example.com'
   */
  @ApiProperty({
    description: 'Email address to send OTP to',
    example: 'user@example.com',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;
}

/**
 * Verify OTP DTO
 * @description Request body for verifying OTP code
 */
export class VerifyOtpDto {
  /**
   * Email address that received OTP
   * @example 'user@example.com'
   */
  @ApiProperty({
    description: 'Email address that received OTP',
    example: 'user@example.com',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  /**
   * OTP code received via email
   * @example '123456'
   */
  @ApiProperty({
    description: '6-digit OTP code',
    example: '123456',
  })
  @IsNotEmpty({ message: 'OTP code is required' })
  @IsString({ message: 'OTP code must be a string' })
  @Matches(/^\d{6}$/, { message: 'OTP code must be 6 digits' })
  code: string;
}

/**
 * Verify OTP response DTO
 * @description Response after OTP verification
 */
export class VerifyOtpResponseDto {
  /**
   * Verification result
   */
  @ApiProperty({
    description: 'Whether the OTP was verified successfully',
    example: true,
  })
  verified: boolean;

  /**
   * Message
   */
  @ApiProperty({
    description: 'Verification message',
    example: 'Email verified successfully.',
  })
  message: string;

  /**
   * Token expiration time
   */
  @ApiProperty({
    description: 'Verification expires at',
    example: '2025-11-29T12:00:00.000Z',
  })
  expiresAt: Date;
}

/**
 * Register user DTO
 * @description Request body for user registration (manual with email OTP)
 */
export class RegisterUserDto {
  /**
   * User email address
   * @example 'user@example.com'
   */
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  /**
   * User display name
   * @example 'John Doe'
   */
  @ApiProperty({
    description: 'User display name',
    example: 'John Doe',
  })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name: string;

  /**
   * User password (minimum 8 characters)
   * @example 'SecurePass123!'
   */
  @ApiProperty({
    description: 'Password (minimum 8 characters)',
    example: 'SecurePass123!',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  /**
   * User role (cannot be empty, no default)
   * @example 'WARGA'
   */
  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.WARGA,
  })
  @IsNotEmpty({ message: 'Role is required' })
  @IsEnum(UserRole, { message: 'Role must be WARGA, UMKM, DLH, or ADMIN' })
  role: UserRole;

  /**
   * UMKM name (required if role is UMKM)
   * @example 'Toko Berkah'
   */
  @ApiPropertyOptional({
    description: 'UMKM business name (required for UMKM role)',
    example: 'Toko Berkah',
  })
  @ValidateIf((o) => o.role === UserRole.UMKM)
  @IsNotEmpty({ message: 'UMKM name is required for UMKM role' })
  @IsString({ message: 'UMKM name must be a string' })
  umkmName?: string;

  /**
   * UMKM description (required if role is UMKM)
   * @example 'Toko makanan sehat dan organik'
   */
  @ApiPropertyOptional({
    description: 'UMKM business description (required for UMKM role)',
    example: 'Toko makanan sehat dan organik',
  })
  @ValidateIf((o) => o.role === UserRole.UMKM)
  @IsNotEmpty({ message: 'UMKM description is required for UMKM role' })
  @IsString({ message: 'UMKM description must be a string' })
  umkmDescription?: string;

  /**
   * UMKM address (required if role is UMKM)
   * @example 'Jl. Contoh No. 123, Jakarta'
   */
  @ApiPropertyOptional({
    description: 'UMKM business address (required for UMKM role)',
    example: 'Jl. Contoh No. 123, Jakarta',
  })
  @ValidateIf((o) => o.role === UserRole.UMKM)
  @IsNotEmpty({ message: 'UMKM address is required for UMKM role' })
  @IsString({ message: 'UMKM address must be a string' })
  umkmAddress?: string;

  /**
   * UMKM category (required if role is UMKM)
   * @example 'Makanan & Minuman'
   */
  @ApiPropertyOptional({
    description: 'UMKM business category (required for UMKM role)',
    example: 'Makanan & Minuman',
  })
  @ValidateIf((o) => o.role === UserRole.UMKM)
  @IsNotEmpty({ message: 'UMKM category is required for UMKM role' })
  @IsString({ message: 'UMKM category must be a string' })
  umkmCategory?: string;
}

/**
 * Complete Google Profile DTO
 * @description Request body for completing Google user profile
 */
export class CompleteGoogleProfileDto {
  /**
   * User role
   * @example 'WARGA'
   */
  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.WARGA,
  })
  @IsNotEmpty({ message: 'Role is required' })
  @IsEnum(UserRole, { message: 'Role must be WARGA, UMKM, DLH, or ADMIN' })
  role: UserRole;

  /**
   * UMKM name (required if role is UMKM)
   */
  @ApiPropertyOptional({
    description: 'UMKM business name (required for UMKM role)',
    example: 'Toko Berkah',
  })
  @ValidateIf((o) => o.role === UserRole.UMKM)
  @IsNotEmpty({ message: 'UMKM name is required for UMKM role' })
  @IsString({ message: 'UMKM name must be a string' })
  umkmName?: string;

  /**
   * UMKM description (required if role is UMKM)
   */
  @ApiPropertyOptional({
    description: 'UMKM business description (required for UMKM role)',
    example: 'Toko makanan sehat dan organik',
  })
  @ValidateIf((o) => o.role === UserRole.UMKM)
  @IsNotEmpty({ message: 'UMKM description is required for UMKM role' })
  @IsString({ message: 'UMKM description must be a string' })
  umkmDescription?: string;

  /**
   * UMKM address (required if role is UMKM)
   */
  @ApiPropertyOptional({
    description: 'UMKM business address (required for UMKM role)',
    example: 'Jl. Contoh No. 123, Jakarta',
  })
  @ValidateIf((o) => o.role === UserRole.UMKM)
  @IsNotEmpty({ message: 'UMKM address is required for UMKM role' })
  @IsString({ message: 'UMKM address must be a string' })
  umkmAddress?: string;

  /**
   * UMKM category (required if role is UMKM)
   */
  @ApiPropertyOptional({
    description: 'UMKM business category (required for UMKM role)',
    example: 'Makanan & Minuman',
  })
  @ValidateIf((o) => o.role === UserRole.UMKM)
  @IsNotEmpty({ message: 'UMKM category is required for UMKM role' })
  @IsString({ message: 'UMKM category must be a string' })
  umkmCategory?: string;
}
