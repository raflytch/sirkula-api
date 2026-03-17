/**
 * @fileoverview Login user DTO
 * @description DTOs for email/password login
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * Email login DTO
 * @description Request body for email/password authentication
 */
export class LoginDto {
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
   * User password
   * @example 'SecurePass123!'
   */
  @ApiProperty({
    description: 'User password',
    example: 'SecurePass123!',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  password: string;
}

/**
 * Auth response DTO
 * @description Response containing JWT access token and user data
 */
export class AuthResponseDto {
  /**
   * JWT access token
   */
  accessToken: string;

  /**
   * Authenticated user data
   */
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatarUrl?: string;
    isEmailVerified: boolean;
    /** True if user needs to complete profile (Google OAuth new user) */
    needsProfileCompletion?: boolean;
  };
}
