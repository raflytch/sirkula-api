/**
 * @fileoverview User controller for HTTP endpoints
 * @description Handles all user-related HTTP requests - auth, profile, and account management
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { UserService } from './user.service';
import { ISafeUser, IJwtPayload, IGoogleUserInfo } from './interfaces/index';
import {
  RegisterUserDto,
  VerifyOtpDto,
  SendRegisterOtpDto,
} from './dto/register-user.dto';
import { LoginDto, AuthResponseDto } from './dto/login-user.dto';
import {
  UpdateProfileDto,
  UpdateUmkmProfileDto,
} from './dto/update-profile.dto';
import {
  RequestDeleteAccountDto,
  ConfirmDeleteAccountDto,
} from './dto/delete-account.dto';
import { PaginationDto } from '../../commons/dto/pagination.dto';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { RolesGuard } from '../../commons/guards/roles.guard';
import { GoogleAuthGuard } from '../../commons/guards/google-auth.guard';
import { Roles } from '../../commons/decorators/roles.decorator';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { IPaginatedResult } from '../../commons/intefaces/pagination.interface';

/**
 * User controller
 * @description Controller for user authentication and management endpoints
 */
@ApiTags('Users')
@Controller('users')
export class UserController {
  /**
   * Initialize controller with user service
   * @param {UserService} userService - User service for business logic
   */
  constructor(private readonly userService: UserService) {}

  /**
   * Initiate Google OAuth flow
   * @description Redirects to Google OAuth consent screen
   */
  @Get('auth/google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Initiate Google OAuth login',
    description:
      'Redirects user to Google OAuth consent screen. After authorization, user is redirected to frontend with JWT token.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google OAuth',
  })
  async initiateGoogleAuth(): Promise<void> {
    // Passport will handle the redirect to Google
  }

  /**
   * Handle Google OAuth callback
   * @description Called by Google after user authorizes, redirects to frontend with JWT
   * @param {Request} req - Request object containing user from Passport
   * @param {Response} res - Response object for redirect
   */
  @Get('auth/google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiExcludeEndpoint()
  async handleGoogleCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const googleUser = req.user as IGoogleUserInfo;
    const redirectUrl = await this.userService.handleGoogleLogin(googleUser);
    res.redirect(redirectUrl);
  }

  /**
   * Resend OTP for registration
   * @param {SendRegisterOtpDto} dto - Email to resend OTP
   * @returns {Promise<{ message: string; expiresAt: Date }>} Success message
   */
  @Post('auth/resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend OTP for registration',
    description:
      'Resend OTP to email address if the previous one expired or was not received',
  })
  @ApiBody({ type: SendRegisterOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP resent successfully',
  })
  @ApiResponse({ status: 404, description: 'Email not found' })
  @ApiResponse({ status: 409, description: 'Email already verified' })
  async resendRegisterOtp(
    @Body() dto: SendRegisterOtpDto,
  ): Promise<{ message: string; expiresAt: Date }> {
    return this.userService.resendRegisterOtp(dto);
  }

  /**
   * Verify registration OTP code
   * @param {VerifyOtpDto} dto - Email and OTP code
   * @returns {Promise<AuthResponseDto>} JWT token after verification
   */
  @Post('auth/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify registration OTP code',
    description:
      'Verify email using OTP code sent during registration. Returns JWT token after successful verification.',
  })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyRegisterOtp(@Body() dto: VerifyOtpDto): Promise<AuthResponseDto> {
    return this.userService.verifyRegisterOtp(dto);
  }

  /**
   * Register new user
   * @param {RegisterUserDto} dto - Registration data
   * @returns {Promise<{ message: string; email: string; expiresAt: Date }>} OTP sent confirmation
   */
  @Post('auth/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register new user with email/password',
    description:
      'Create new account and send OTP automatically. Use verify-otp endpoint to complete registration.\n\n' +
      '**Important:** UMKM fields (umkmName, umkmDescription, umkmAddress, umkmCategory) are ONLY required when role is "UMKM". ' +
      'For other roles (WARGA, DLH, ADMIN), do NOT send these fields in the request body.',
  })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({
    status: 201,
    description:
      'User registered successfully, OTP sent to email for verification',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        email: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Missing UMKM fields when role is UMKM',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered',
  })
  async register(
    @Body() dto: RegisterUserDto,
  ): Promise<{ message: string; email: string; expiresAt: Date }> {
    return this.userService.register(dto);
  }

  /**
   * Login with email/password
   * @param {LoginDto} dto - Login credentials
   * @returns {Promise<AuthResponseDto>} JWT token and user data
   */
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.userService.login(dto);
  }

  /**
   * Get current user session
   * @param {IJwtPayload} user - Current user from JWT
   * @returns {Promise<ISafeUser>} Current user data
   */
  @Get('session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get current authenticated user session',
    description:
      'Returns user profile data. Response fields vary by role:\n\n' +
      '- **UMKM users**: Includes umkmName, umkmDescription, umkmLogoUrl, umkmAddress, umkmCategory\n' +
      '- **WARGA/DLH/ADMIN users**: UMKM fields are NOT included in response',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user data (fields vary by role)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSession(@CurrentUser() user: IJwtPayload): Promise<ISafeUser> {
    return this.userService.getSession(user.sub);
  }

  /**
   * Update user profile
   * @param {IJwtPayload} user - Current user from JWT
   * @param {UpdateProfileDto} dto - Profile update data
   * @param {Express.Multer.File} avatar - Optional avatar file
   * @returns {Promise<ISafeUser>} Updated user data
   */
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update user profile (name, password, avatar)',
    description: 'Upload avatar as file using multipart/form-data',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Updated display name',
          example: 'John Updated',
        },
        currentPassword: {
          type: 'string',
          description: 'Current password (required when changing password)',
          example: 'CurrentPass123!',
        },
        newPassword: {
          type: 'string',
          description: 'New password (minimum 8 characters)',
          example: 'NewSecurePass123!',
        },
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image file (JPEG, PNG, GIF, WebP, max 5MB)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(
    @CurrentUser() user: IJwtPayload,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ): Promise<ISafeUser> {
    return this.userService.updateProfile(user.sub, dto, avatar);
  }

  /**
   * Update UMKM profile (UMKM users only)
   * @param {IJwtPayload} user - Current user from JWT
   * @param {UpdateUmkmProfileDto} dto - UMKM profile update data
   * @param {Express.Multer.File} logo - Optional UMKM logo file
   * @returns {Promise<ISafeUser>} Updated user data
   */
  @Patch('profile/umkm')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('logo'))
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update UMKM profile (UMKM users only)',
    description: 'Upload UMKM logo as file using multipart/form-data',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        umkmName: {
          type: 'string',
          description: 'UMKM business name',
          example: 'Toko Berkah Updated',
        },
        umkmDescription: {
          type: 'string',
          description: 'UMKM business description',
          example: 'Updated description',
        },
        umkmAddress: {
          type: 'string',
          description: 'UMKM business address',
          example: 'Jl. Updated No. 456, Jakarta',
        },
        umkmCategory: {
          type: 'string',
          description: 'UMKM business category',
          example: 'Fashion',
        },
        logo: {
          type: 'string',
          format: 'binary',
          description: 'UMKM logo image file (JPEG, PNG, GIF, WebP, max 5MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'UMKM profile updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Only UMKM users can update UMKM profile',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateUmkmProfile(
    @CurrentUser() user: IJwtPayload,
    @Body() dto: UpdateUmkmProfileDto,
    @UploadedFile() logo?: Express.Multer.File,
  ): Promise<ISafeUser> {
    return this.userService.updateUmkmProfile(user.sub, dto, logo);
  }

  /**
   * Request account deletion (sends OTP)
   * @param {IJwtPayload} user - Current user from JWT
   * @param {RequestDeleteAccountDto} dto - Delete confirmation
   * @returns {Promise<object>} Deletion preview with stats
   */
  @Post('account/delete/request')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Request account deletion (sends OTP)' })
  @ApiBody({ type: RequestDeleteAccountDto })
  @ApiResponse({
    status: 200,
    description: 'OTP sent for deletion confirmation',
  })
  @ApiResponse({ status: 400, description: 'Invalid confirmation text' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async requestDeleteAccount(
    @CurrentUser() user: IJwtPayload,
    @Body() dto: RequestDeleteAccountDto,
  ): Promise<{ message: string; expiresAt: Date; stats: object }> {
    return this.userService.requestDeleteAccount(user.sub, dto);
  }

  /**
   * Confirm account deletion with OTP
   * @param {IJwtPayload} user - Current user from JWT
   * @param {ConfirmDeleteAccountDto} dto - OTP confirmation
   * @returns {Promise<{ message: string }>} Deletion result
   */
  @Delete('account/delete/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Confirm account deletion with OTP' })
  @ApiBody({ type: ConfirmDeleteAccountDto })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid OTP' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async confirmDeleteAccount(
    @CurrentUser() user: IJwtPayload,
    @Body() dto: ConfirmDeleteAccountDto,
  ): Promise<{ message: string }> {
    return this.userService.confirmDeleteAccount(user.sub, dto);
  }

  /**
   * Get all users (Admin/DLH only)
   * @param {PaginationDto} pagination - Pagination options
   * @returns {Promise<IPaginatedResult<ISafeUser>>} Paginated users
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DLH')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all users (Admin/DLH only)' })
  @ApiResponse({ status: 200, description: 'List of users with pagination' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/DLH only' })
  async getAllUsers(
    @Query() pagination: PaginationDto,
  ): Promise<IPaginatedResult<ISafeUser>> {
    return this.userService.getAllUsers(pagination);
  }

  /**
   * Get user by ID (Admin/DLH only)
   * @param {string} id - User ID
   * @returns {Promise<ISafeUser>} User data
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DLH')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get user by ID (Admin/DLH only)' })
  @ApiResponse({ status: 200, description: 'User data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/DLH only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string): Promise<ISafeUser> {
    return this.userService.getUserById(id);
  }

  /**
   * Delete user by ID (Admin only - no OTP required)
   * @param {string} id - User ID to delete
   * @returns {Promise<{ message: string; deletedUser: ISafeUser }>} Deletion result with deleted user info
   */
  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Delete user by ID (Admin only)',
    description:
      'Permanently delete a user and all related data. No OTP required. Cascade deletes: green_actions, voucher_claims, vouchers (for UMKM), otp_codes',
  })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
    schema: {
      example: {
        message: 'User deleted successfully',
        deletedUser: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          name: 'John Doe',
          role: 'WARGA',
          totalPoints: 100,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async adminDeleteUser(
    @Param('id') id: string,
  ): Promise<{ message: string; deletedUser: ISafeUser }> {
    return this.userService.adminDeleteUser(id);
  }
}
