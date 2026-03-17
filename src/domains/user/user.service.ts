/**
 * @fileoverview User service for business logic
 * @description Handles all user-related business logic including auth, profile, and account management
 */

import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { user, UserRole } from '@prisma/client';
import { UserRepository } from './user.repository';
import { MailerService } from '../../libs/mailer/mailer.service';
import { CloudinaryService } from '../../libs/cloudinary/cloudinary.service';
import { AppConfigService } from '../../config/config.service';
import {
  RegisterUserDto,
  SendRegisterOtpDto,
  VerifyOtpDto,
  CompleteGoogleProfileDto,
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
import { createPaginatedResult } from '../../commons/helpers/pagination.helper';
import { IPaginatedResult } from '../../commons/intefaces/pagination.interface';
import { ISafeUser, IGoogleUserInfo } from './interfaces/index';

/**
 * Re-export ISafeUser as SafeUser for backward compatibility
 */
export type SafeUser = ISafeUser;

/**
 * User service
 * @description Service layer for user operations
 */
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  /**
   * Bcrypt salt rounds for password hashing
   */
  private readonly SALT_ROUNDS = 12;

  /**
   * Initialize service with dependencies
   * @param {UserRepository} userRepository - User repository
   * @param {MailerService} mailerService - Mailer OTP service
   * @param {CloudinaryService} cloudinaryService - Cloudinary upload service
   * @param {JwtService} jwtService - JWT service
   * @param {AppConfigService} configService - Configuration service
   */
  constructor(
    private readonly userRepository: UserRepository,
    private readonly mailerService: MailerService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly jwtService: JwtService,
    private readonly configService: AppConfigService,
  ) {}

  /**
   * Transform user entity to safe response (without password)
   * @param {user} user - User entity from database
   * @returns {SafeUser} Safe user object without sensitive data
   * @description Returns different fields based on user role:
   * - UMKM: includes UMKM profile fields
   * - WARGA/DLH/ADMIN: excludes UMKM fields
   */
  private toSafeUser(user: user): SafeUser {
    const baseUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatar_url,
      isEmailVerified: user.is_email_verified,
      totalPoints: user.total_points,
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };

    // Only include UMKM fields for UMKM role
    if (user.role === UserRole.UMKM) {
      return {
        ...baseUser,
        umkmName: user.umkm_name,
        umkmDescription: user.umkm_description,
        umkmLogoUrl: user.umkm_logo_url,
        umkmAddress: user.umkm_address,
        umkmCategory: user.umkm_category,
      };
    }

    return baseUser;
  }

  /**
   * Generate JWT token for user
   * @param {user} user - User entity
   * @returns {string} JWT access token
   */
  private generateToken(user: user): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role as string,
    };

    const expiresIn = this.configService.jwtExpiresIn;

    return this.jwtService.sign(payload, {
      secret: this.configService.jwtSecret,
      expiresIn: expiresIn as any,
    });
  }

  /**
   * Build frontend redirect URL with JWT token
   * @param {string} token - JWT access token
   * @param {boolean} needsProfileCompletion - Whether user needs to complete profile
   * @param {string} error - Optional error message
   * @returns {string} Frontend redirect URL with token in query params
   */
  private buildFrontendRedirectUrl(
    token?: string,
    needsProfileCompletion = false,
    error?: string,
  ): string {
    const baseUrl = `${this.configService.frontendUrl}${this.configService.googleCallbackPath}`;
    const params = new URLSearchParams();

    if (error) {
      params.set('error', error);
    } else if (token) {
      params.set('token', token);
      params.set('needsProfileCompletion', String(needsProfileCompletion));
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Create auth response with token and user data
   * @param {user} user - User entity
   * @param {boolean} needsProfileCompletion - Whether user needs to complete profile
   * @returns {AuthResponseDto} Auth response with token and user
   */
  private createAuthResponse(
    user: user,
    needsProfileCompletion = false,
  ): AuthResponseDto {
    return {
      accessToken: this.generateToken(user),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatar_url ?? undefined,
        isEmailVerified: user.is_email_verified,
        needsProfileCompletion,
      },
    };
  }

  /**
   * Hash password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compare password with hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} True if password matches
   */
  private async comparePassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // ==================== GOOGLE OAUTH (Passport) ====================

  /**
   * Handle Google OAuth login/register from Passport callback
   * @param {IGoogleUserInfo} googleUser - User info from Google Passport strategy
   * @returns {Promise<string>} Frontend redirect URL with JWT token
   */
  async handleGoogleLogin(googleUser: IGoogleUserInfo): Promise<string> {
    try {
      /**
       * Check if user exists by Google ID
       */
      let user = await this.userRepository.findByGoogleId(googleUser.googleId);

      if (user) {
        /**
         * User exists - just login (no OTP needed for Google)
         */
        if (!user.is_active) {
          return this.buildFrontendRedirectUrl(
            undefined,
            false,
            'Account is deactivated',
          );
        }

        const token = this.generateToken(user);
        return this.buildFrontendRedirectUrl(token, false);
      }

      /**
       * Check if email already exists (manual registration)
       */
      const existingEmail = await this.userRepository.findByEmail(
        googleUser.email,
      );
      if (existingEmail) {
        return this.buildFrontendRedirectUrl(
          undefined,
          false,
          'Email already registered. Please login with email/password.',
        );
      }

      /**
       * Create new user with Google OAuth
       * User needs to complete profile (select role)
       */
      user = await this.userRepository.create({
        email: googleUser.email,
        name: googleUser.name,
        googleId: googleUser.googleId,
        avatarUrl: googleUser.avatarUrl,
        isEmailVerified: true,
        role: UserRole.WARGA,
      });

      const token = this.generateToken(user);
      return this.buildFrontendRedirectUrl(token, true);
    } catch (error) {
      console.error('Google OAuth error:', error);
      return this.buildFrontendRedirectUrl(
        undefined,
        false,
        'Authentication failed',
      );
    }
  }

  /**
   * Complete Google user profile (set role and UMKM details)
   * @param {string} userId - User ID
   * @param {CompleteGoogleProfileDto} dto - Profile completion data
   * @returns {Promise<AuthResponseDto>} Updated auth response
   */
  async completeGoogleProfile(
    userId: string,
    dto: CompleteGoogleProfileDto,
  ): Promise<AuthResponseDto> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    /**
     * Validate UMKM fields if role is UMKM
     */
    if (dto.role === UserRole.UMKM) {
      if (
        !dto.umkmName ||
        !dto.umkmDescription ||
        !dto.umkmAddress ||
        !dto.umkmCategory
      ) {
        throw new BadRequestException(
          'UMKM name, description, address, and category are required for UMKM role',
        );
      }
    }

    const updatedUser = await this.userRepository.update(userId, {
      role: dto.role,
      umkmName: dto.umkmName,
      umkmDescription: dto.umkmDescription,
      umkmAddress: dto.umkmAddress,
      umkmCategory: dto.umkmCategory,
    });

    return this.createAuthResponse(updatedUser);
  }

  // ==================== MANUAL REGISTRATION (Email OTP) ====================

  /**
   * Resend OTP for registration (for users who registered but haven't verified)
   * @param {SendRegisterOtpDto} dto - Email to resend OTP
   * @returns {Promise<{ message: string; expiresAt: Date }>} Success message
   */
  async resendRegisterOtp(
    dto: SendRegisterOtpDto,
  ): Promise<{ message: string; expiresAt: Date }> {
    /**
     * Check if user exists
     */
    const existingUser = await this.userRepository.findByEmail(dto.email);

    /**
     * If user doesn't exist, they haven't registered yet
     */
    if (!existingUser) {
      throw new NotFoundException('Email not found. Please register first.');
    }

    /**
     * If user is already verified, no need to resend OTP
     */
    if (existingUser.is_email_verified) {
      throw new ConflictException(
        'Email already verified. Please login instead.',
      );
    }

    /**
     * Resend OTP for unverified user
     */
    return this.mailerService.sendOtp(dto.email, 'REGISTER', existingUser.id);
  }

  /**
   * Verify registration OTP code and complete registration
   * @param {VerifyOtpDto} dto - Email and OTP code
   * @returns {Promise<AuthResponseDto>} Auth response with token after verification
   */
  async verifyRegisterOtp(dto: VerifyOtpDto): Promise<AuthResponseDto> {
    /**
     * Verify OTP
     */
    await this.mailerService.verifyOtp(dto.email, dto.code, 'REGISTER');

    /**
     * Find user by email
     */
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    /**
     * Mark email as verified
     */
    const verifiedUser = await this.userRepository.verifyEmail(user.id);

    /**
     * Return auth token
     */
    return this.createAuthResponse(verifiedUser);
  }

  /**
   * Register new user with email/password (sends OTP automatically)
   * @param {RegisterUserDto} dto - Registration data
   * @returns {Promise<{ message: string; email: string; expiresAt: Date }>} OTP sent confirmation
   */
  async register(
    dto: RegisterUserDto,
  ): Promise<{ message: string; email: string; expiresAt: Date }> {
    /**
     * Check if email already exists
     */
    const existingEmail = await this.userRepository.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    /**
     * Validate UMKM fields if role is UMKM
     */
    if (dto.role === UserRole.UMKM) {
      if (
        !dto.umkmName ||
        !dto.umkmDescription ||
        !dto.umkmAddress ||
        !dto.umkmCategory
      ) {
        throw new BadRequestException(
          'UMKM name, description, address, and category are required for UMKM role',
        );
      }
    }

    /**
     * Hash password and create user with unverified email
     */
    const passwordHash = await this.hashPassword(dto.password);

    const user = await this.userRepository.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
      role: dto.role,
      isEmailVerified: false, // Will be verified after OTP
      umkmName: dto.umkmName,
      umkmDescription: dto.umkmDescription,
      umkmAddress: dto.umkmAddress,
      umkmCategory: dto.umkmCategory,
    });

    /**
     * Send OTP for email verification
     */
    const otpResult = await this.mailerService.sendOtp(
      dto.email,
      'REGISTER',
      user.id,
    );

    return {
      message:
        'Registration successful. Please verify your email with the OTP sent.',
      email: dto.email,
      expiresAt: otpResult.expiresAt,
    };
  }

  // ==================== LOGIN ====================

  /**
   * Login with email and password
   * @param {LoginDto} dto - Login credentials
   * @returns {Promise<AuthResponseDto>} Auth response with token
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account is deactivated');
    }

    /**
     * Google OAuth users don't have password
     */
    if (!user.password_hash) {
      throw new UnauthorizedException(
        'This email is registered with Google. Please use Google login.',
      );
    }

    const isPasswordValid = await this.comparePassword(
      dto.password,
      user.password_hash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.createAuthResponse(user);
  }

  // ==================== SESSION & PROFILE ====================

  /**
   * Get current user session
   * @param {string} userId - Current user ID
   * @returns {Promise<SafeUser>} Current user data
   */
  async getSession(userId: string): Promise<SafeUser> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account is deactivated');
    }

    return this.toSafeUser(user);
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {UpdateProfileDto} dto - Profile update data
   * @param {Express.Multer.File} avatarFile - Optional avatar file
   * @returns {Promise<SafeUser>} Updated user
   */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    avatarFile?: Express.Multer.File,
  ): Promise<SafeUser> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    /**
     * Handle password change (only for non-Google users)
     */
    let newPasswordHash: string | undefined;

    if (dto.newPassword) {
      if (!user.password_hash) {
        throw new BadRequestException(
          'Google users cannot change password. Please use Google account settings.',
        );
      }

      if (!dto.currentPassword) {
        throw new BadRequestException(
          'Current password is required to change password',
        );
      }

      const isCurrentPasswordValid = await this.comparePassword(
        dto.currentPassword,
        user.password_hash,
      );

      if (!isCurrentPasswordValid) {
        throw new BadRequestException('Current password is incorrect');
      }

      newPasswordHash = await this.hashPassword(dto.newPassword);
    }

    /**
     * Handle avatar upload
     */
    let avatarUrl: string | undefined;
    if (avatarFile) {
      const uploadResult =
        await this.cloudinaryService.uploadAvatar(avatarFile);
      avatarUrl = uploadResult.url;
    }

    const updatedUser = await this.userRepository.update(userId, {
      name: dto.name,
      passwordHash: newPasswordHash,
      avatarUrl: avatarUrl,
    });

    return this.toSafeUser(updatedUser);
  }

  /**
   * Update UMKM profile (UMKM users only)
   * @param {string} userId - User ID
   * @param {UpdateUmkmProfileDto} dto - UMKM profile update data
   * @param {Express.Multer.File} logoFile - Optional UMKM logo file
   * @returns {Promise<SafeUser>} Updated user
   */
  async updateUmkmProfile(
    userId: string,
    dto: UpdateUmkmProfileDto,
    logoFile?: Express.Multer.File,
  ): Promise<SafeUser> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.UMKM) {
      throw new ForbiddenException('Only UMKM users can update UMKM profile');
    }

    /**
     * Handle logo upload
     */
    let umkmLogoUrl: string | undefined;
    if (logoFile) {
      const uploadResult =
        await this.cloudinaryService.uploadUmkmLogo(logoFile);
      umkmLogoUrl = uploadResult.url;
    }

    const updatedUser = await this.userRepository.update(userId, {
      umkmName: dto.umkmName,
      umkmDescription: dto.umkmDescription,
      umkmLogoUrl: umkmLogoUrl,
      umkmAddress: dto.umkmAddress,
      umkmCategory: dto.umkmCategory,
    });

    return this.toSafeUser(updatedUser);
  }

  // ==================== ACCOUNT DELETION ====================

  /**
   * Request account deletion (sends OTP)
   * @param {string} userId - User ID
   * @param {RequestDeleteAccountDto} dto - Delete confirmation
   * @returns {Promise<{ message: string; stats: object }>} Deletion preview
   */
  async requestDeleteAccount(
    userId: string,
    dto: RequestDeleteAccountDto,
  ): Promise<{ message: string; expiresAt: Date; stats: object }> {
    if (dto.confirmation !== 'DELETE MY ACCOUNT') {
      throw new BadRequestException('Invalid confirmation text');
    }

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    /**
     * Get user stats to show what will be deleted
     */
    const stats = await this.userRepository.getUserStats(userId);

    /**
     * Send OTP for confirmation
     */
    const otpResult = await this.mailerService.sendOtp(
      user.email,
      'DELETE_ACCOUNT',
      userId,
    );

    return {
      message: 'OTP sent to your email. Please confirm deletion.',
      expiresAt: otpResult.expiresAt,
      stats: {
        greenActionsToDelete: stats.greenActionsCount,
        voucherClaimsToDelete: stats.voucherClaimsCount,
        vouchersToDelete: stats.vouchersCount,
      },
    };
  }

  /**
   * Confirm account deletion with OTP
   * @param {string} userId - User ID
   * @param {ConfirmDeleteAccountDto} dto - OTP confirmation
   * @returns {Promise<{ message: string }>} Deletion result
   */
  async confirmDeleteAccount(
    userId: string,
    dto: ConfirmDeleteAccountDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    /**
     * Verify OTP
     */
    await this.mailerService.verifyOtp(
      user.email,
      dto.otpCode,
      'DELETE_ACCOUNT',
    );

    /**
     * Delete user and all related data (cascade)
     */
    await this.userRepository.delete(userId);

    return { message: 'Account deleted successfully' };
  }

  // ==================== ADMIN OPERATIONS ====================

  /**
   * Get all users with pagination (Admin/DLH only)
   * @param {PaginationDto} pagination - Pagination options
   * @returns {Promise<IPaginatedResult<SafeUser>>} Paginated users
   */
  async getAllUsers(
    pagination: PaginationDto,
  ): Promise<IPaginatedResult<SafeUser>> {
    const { users, total } = await this.userRepository.findAll(pagination, {
      is_active: true,
    });

    const safeUsers = users.map((user) => this.toSafeUser(user));

    return createPaginatedResult(safeUsers, total, pagination);
  }

  /**
   * Get user by ID (Admin/DLH only)
   * @param {string} id - User ID
   * @returns {Promise<SafeUser>} User data
   */
  async getUserById(id: string): Promise<SafeUser> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toSafeUser(user);
  }

  /**
   * Delete user by ID (Admin only - no OTP required)
   * @param {string} targetUserId - User ID to delete
   * @returns {Promise<{ message: string; deletedUser: SafeUser }>} Deletion result with deleted user info
   */
  async adminDeleteUser(
    targetUserId: string,
  ): Promise<{ message: string; deletedUser: SafeUser }> {
    const user = await this.userRepository.findById(targetUserId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    /**
     * Delete user and all related data (cascade handled by Prisma)
     * Relations to delete:
     * - green_actions (CASCADE)
     * - voucher_claims (CASCADE)
     * - vouchers (CASCADE - for UMKM users)
     * - otp_codes (CASCADE)
     */
    const deletedUser = await this.userRepository.delete(targetUserId);

    this.logger.log(`Admin deleted user: ${targetUserId}`);

    return {
      message: 'User deleted successfully',
      deletedUser: this.toSafeUser(deletedUser),
    };
  }
}
