/**
 * @fileoverview Delete account DTO
 * @description DTOs for account deletion with OTP verification
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

/**
 * Request delete account OTP DTO
 * @description Request body to initiate account deletion and send OTP
 */
export class RequestDeleteAccountDto {
  /**
   * Confirmation text to prevent accidental deletion
   * @example 'DELETE MY ACCOUNT'
   */
  @ApiProperty({
    description: 'Type "DELETE MY ACCOUNT" to confirm',
    example: 'DELETE MY ACCOUNT',
  })
  @IsNotEmpty({ message: 'Confirmation text is required' })
  @IsString({ message: 'Confirmation must be a string' })
  confirmation: string;
}

/**
 * Confirm delete account DTO
 * @description Request body to confirm account deletion with OTP
 */
export class ConfirmDeleteAccountDto {
  /**
   * OTP code received via SMS
   * @example '123456'
   */
  @ApiProperty({
    description: '6-digit OTP code for verification',
    example: '123456',
  })
  @IsNotEmpty({ message: 'OTP code is required' })
  @IsString({ message: 'OTP code must be a string' })
  @Matches(/^\d{6}$/, { message: 'OTP code must be 6 digits' })
  otpCode: string;
}
