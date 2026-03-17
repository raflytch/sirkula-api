/**
 * @fileoverview Mailer service for email OTP verification
 * @description Handles sending and verifying OTP codes via Nodemailer (Gmail)
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { AppConfigService } from '../../config/config.service';
import { DatabaseService } from '../../database/database.service';

/**
 * OTP purpose types for different verification flows
 */
export type OtpPurpose = 'REGISTER' | 'DELETE_ACCOUNT' | 'VERIFY_EMAIL';

/**
 * Mailer service for email OTP operations
 * @description Manages OTP generation, sending via Gmail, and verification
 */
@Injectable()
export class MailerService {
  /**
   * Nodemailer transporter instance
   */
  private transporter: nodemailer.Transporter;

  /**
   * OTP expiration time in minutes
   */
  private readonly OTP_EXPIRY_MINUTES = 5;

  /**
   * OTP code length
   */
  private readonly OTP_LENGTH = 6;

  /**
   * Initialize Nodemailer transporter with Gmail credentials
   * @param {AppConfigService} configService - Application configuration service
   * @param {DatabaseService} databaseService - Database service for OTP storage
   */
  constructor(
    private readonly configService: AppConfigService,
    private readonly databaseService: DatabaseService,
  ) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.emailUser,
        pass: this.configService.emailAppPassword,
      },
    });
  }

  /**
   * Generate a random OTP code
   * @returns {string} Generated OTP code
   */
  private generateOtpCode(): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < this.OTP_LENGTH; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  }

  /**
   * Calculate OTP expiration timestamp
   * @returns {Date} Expiration date
   */
  private getExpirationTime(): Date {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + this.OTP_EXPIRY_MINUTES);
    return expiry;
  }

  /**
   * Get email subject based on purpose
   * @param {OtpPurpose} purpose - Purpose of the OTP
   * @returns {string} Email subject
   */
  private getEmailSubject(purpose: OtpPurpose): string {
    switch (purpose) {
      case 'REGISTER':
        return '🌱 Sirkula - Verify Your Email';
      case 'DELETE_ACCOUNT':
        return '⚠️ Sirkula - Account Deletion Confirmation';
      case 'VERIFY_EMAIL':
        return '📧 Sirkula - Email Verification';
      default:
        return '🌱 Sirkula - Verification Code';
    }
  }

  /**
   * Get email HTML template
   * @param {string} otpCode - OTP code
   * @param {OtpPurpose} purpose - Purpose of the OTP
   * @returns {string} HTML email content
   */
  private getEmailHtml(otpCode: string, purpose: OtpPurpose): string {
    const purposeText =
      purpose === 'DELETE_ACCOUNT'
        ? 'confirm your account deletion'
        : 'verify your email address';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sirkula Verification</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🌱 Sirkula</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Sense Every Action, Reward Every Impact</p>
            </div>
            
            <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin: 0 0 20px 0; font-size: 20px;">Verification Code</h2>
              <p style="color: #666; line-height: 1.6; margin: 0 0 30px 0;">
                Use the following code to ${purposeText}:
              </p>
              
              <div style="background: #f8fafc; border: 2px dashed #22c55e; border-radius: 10px; padding: 25px; text-align: center; margin: 0 0 30px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #22c55e;">${otpCode}</span>
              </div>
              
              <p style="color: #999; font-size: 14px; margin: 0 0 10px 0;">
                ⏱️ This code will expire in <strong>${this.OTP_EXPIRY_MINUTES} minutes</strong>.
              </p>
              <p style="color: #999; font-size: 14px; margin: 0;">
                If you didn't request this code, please ignore this email.
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p style="margin: 0;">© 2025 Sirkula. All rights reserved.</p>
              <p style="margin: 5px 0 0 0;">Making every green action count! 🌍</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Send OTP to email address
   * @param {string} email - Email address to send OTP to
   * @param {OtpPurpose} purpose - Purpose of the OTP
   * @param {string} [userId] - Optional user ID for authenticated flows
   * @returns {Promise<{ message: string; expiresAt: Date }>} Success message and expiration
   * @throws {BadRequestException} If sending fails
   */
  async sendOtp(
    email: string,
    purpose: OtpPurpose,
    userId?: string,
  ): Promise<{ message: string; expiresAt: Date }> {
    const otpCode = this.generateOtpCode();
    const expiresAt = this.getExpirationTime();

    /**
     * Send email via Nodemailer FIRST before DB insert
     */
    try {
      await this.transporter.sendMail({
        from: `"Sirkula" <${this.configService.emailUser}>`,
        to: email,
        subject: this.getEmailSubject(purpose),
        html: this.getEmailHtml(otpCode, purpose),
      });

      /**
       * In development, also log OTP to console
       */
      if (this.configService.isDevelopment) {
        console.log(`📧 [DEV] OTP for ${email}: ${otpCode}`);
      }
    } catch (error) {
      console.error('Email error:', error);
      throw new BadRequestException(
        'Failed to send OTP email. Please check email address.',
      );
    }

    /**
     * Invalidate any existing unused OTPs for this email and purpose
     */
    await this.databaseService.otp_code.updateMany({
      where: {
        email,
        purpose,
        is_used: false,
        expires_at: { gt: new Date() },
      },
      data: { is_used: true },
    });

    /**
     * Store OTP in database AFTER successful email send
     */
    await this.databaseService.otp_code.create({
      data: {
        email,
        code: otpCode,
        purpose,
        expires_at: expiresAt,
        user_id: userId,
      },
    });

    return {
      message: 'OTP sent to your email successfully',
      expiresAt,
    };
  }

  /**
   * Verify OTP code
   * @param {string} email - Email address to verify
   * @param {string} code - OTP code to verify
   * @param {OtpPurpose} purpose - Purpose of the OTP
   * @returns {Promise<{ verified: boolean; expiresAt: Date }>} Verification result
   * @throws {BadRequestException} If OTP is invalid or expired
   */
  async verifyOtp(
    email: string,
    code: string,
    purpose: OtpPurpose,
  ): Promise<{ verified: boolean; expiresAt: Date }> {
    const otpRecord = await this.databaseService.otp_code.findFirst({
      where: {
        email,
        code,
        purpose,
        is_used: false,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired OTP code');
    }

    /**
     * Mark OTP as verified and used
     */
    await this.databaseService.otp_code.update({
      where: { id: otpRecord.id },
      data: {
        is_verified: true,
        is_used: true,
      },
    });

    return {
      verified: true,
      expiresAt: otpRecord.expires_at,
    };
  }

  /**
   * Clean up expired OTP codes
   * @returns {Promise<number>} Number of deleted records
   */
  async cleanupExpiredOtps(): Promise<number> {
    const result = await this.databaseService.otp_code.deleteMany({
      where: {
        OR: [{ expires_at: { lt: new Date() } }, { is_used: true }],
      },
    });

    return result.count;
  }

  /**
   * Send voucher redemption success email
   * @param {string} email - User email address
   * @param {object} voucherData - Voucher redemption details
   * @returns {Promise<void>}
   */
  async sendVoucherRedemptionEmail(
    email: string,
    voucherData: {
      userName: string;
      voucherName: string;
      redemptionCode: string;
      pointsUsed: number;
      remainingPoints: number;
      discountType: string;
      discountValue: number;
      umkmName: string;
      validUntil: Date;
    },
  ): Promise<void> {
    const html = this.getVoucherRedemptionHtml(voucherData);

    try {
      await this.transporter.sendMail({
        from: `"Sirkula" <${this.configService.emailUser}>`,
        to: email,
        subject: '🎉 Sirkula - Voucher Redeemed Successfully!',
        html,
      });

      if (this.configService.isDevelopment) {
        console.log(`🎫 [DEV] Voucher redemption email sent to ${email}`);
      }
    } catch (error) {
      console.error('Voucher email error:', error);
    }
  }

  /**
   * Get voucher redemption email HTML template
   * @param {object} data - Voucher redemption data
   * @returns {string} HTML email content
   */
  private getVoucherRedemptionHtml(data: {
    userName: string;
    voucherName: string;
    redemptionCode: string;
    pointsUsed: number;
    remainingPoints: number;
    discountType: string;
    discountValue: number;
    umkmName: string;
    validUntil: Date;
  }): string {
    const discountText =
      data.discountType === 'PERCENTAGE'
        ? `${data.discountValue}% OFF`
        : `Rp ${data.discountValue.toLocaleString('id-ID')}`;

    const validUntilFormatted = data.validUntil.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Voucher Redeemed - Sirkula</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Voucher Redeemed!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Your green actions paid off!</p>
            </div>
            
            <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <p style="color: #666; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                Hi <strong>${data.userName}</strong>! 👋
              </p>
              <p style="color: #666; line-height: 1.6; margin: 0 0 30px 0;">
                Congratulations! You have successfully redeemed a voucher from <strong>${data.umkmName}</strong>.
              </p>
              
              <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #22c55e; border-radius: 15px; padding: 25px; margin: 0 0 30px 0;">
                <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 18px;">🎫 ${data.voucherName}</h3>
                <div style="background: white; border-radius: 10px; padding: 20px; text-align: center;">
                  <p style="color: #666; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Your Redemption Code</p>
                  <div style="background: #f8fafc; border: 2px dashed #22c55e; border-radius: 8px; padding: 15px; margin: 0 0 15px 0;">
                    <span style="font-size: 24px; font-weight: bold; letter-spacing: 3px; color: #22c55e; font-family: monospace;">${data.redemptionCode}</span>
                  </div>
                  <p style="color: #22c55e; font-size: 20px; font-weight: bold; margin: 0;">${discountText}</p>
                </div>
              </div>

              <div style="background: #f8fafc; border-radius: 10px; padding: 20px; margin: 0 0 30px 0;">
                <h4 style="color: #333; margin: 0 0 15px 0; font-size: 14px;">📊 Points Summary</h4>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #666; padding: 8px 0;">Points Used:</td>
                    <td style="color: #ef4444; font-weight: bold; text-align: right;">-${data.pointsUsed} pts</td>
                  </tr>
                  <tr>
                    <td style="color: #666; padding: 8px 0; border-top: 1px solid #e5e7eb;">Remaining Points:</td>
                    <td style="color: #22c55e; font-weight: bold; text-align: right;">${data.remainingPoints} pts</td>
                  </tr>
                </table>
              </div>

              <div style="background: #fef3c7; border-radius: 10px; padding: 15px; margin: 0 0 20px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  ⏰ <strong>Valid Until:</strong> ${validUntilFormatted}
                </p>
              </div>

              <p style="color: #999; font-size: 14px; margin: 0;">
                Show this code to the UMKM partner to claim your discount. Keep making green actions to earn more points! 🌱
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p style="margin: 0;">© 2025 Sirkula. All rights reserved.</p>
              <p style="margin: 5px 0 0 0;">Making every green action count! 🌍</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Send voucher used notification email to UMKM
   * @param {string} email - UMKM email address
   * @param {object} notificationData - Voucher usage details
   * @returns {Promise<void>}
   */
  async sendVoucherUsedNotificationEmail(
    email: string,
    notificationData: {
      umkmName: string;
      voucherName: string;
      userName: string;
      userEmail: string;
      redemptionCode: string;
      discountType: string;
      discountValue: number;
      usedAt: Date;
    },
  ): Promise<void> {
    const html = this.getVoucherUsedNotificationHtml(notificationData);

    try {
      await this.transporter.sendMail({
        from: `"Sirkula" <${this.configService.emailUser}>`,
        to: email,
        subject: '🎫 Sirkula - Voucher Used by Customer!',
        html,
      });

      if (this.configService.isDevelopment) {
        console.log(
          `🔔 [DEV] Voucher used notification email sent to ${email}`,
        );
      }
    } catch (error) {
      console.error('Voucher used notification email error:', error);
    }
  }

  /**
   * Get voucher used notification email HTML template
   * @param {object} data - Voucher usage data
   * @returns {string} HTML email content
   */
  private getVoucherUsedNotificationHtml(data: {
    umkmName: string;
    voucherName: string;
    userName: string;
    userEmail: string;
    redemptionCode: string;
    discountType: string;
    discountValue: number;
    usedAt: Date;
  }): string {
    const discountText =
      data.discountType === 'PERCENTAGE'
        ? `${data.discountValue}% OFF`
        : `Rp ${data.discountValue.toLocaleString('id-ID')}`;

    const usedAtFormatted = data.usedAt.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Voucher Used - Sirkula</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎫 Voucher Used!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">A customer has redeemed your voucher</p>
            </div>
            
            <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <p style="color: #666; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                Hi <strong>${data.umkmName}</strong>! 👋
              </p>
              <p style="color: #666; line-height: 1.6; margin: 0 0 30px 0;">
                Great news! A customer has successfully used one of your vouchers.
              </p>
              
              <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #22c55e; border-radius: 15px; padding: 25px; margin: 0 0 30px 0;">
                <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 18px;">🎫 ${data.voucherName}</h3>
                <div style="background: white; border-radius: 10px; padding: 20px; text-align: center;">
                  <p style="color: #666; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Redemption Code</p>
                  <div style="background: #f8fafc; border: 2px dashed #22c55e; border-radius: 8px; padding: 15px; margin: 0 0 15px 0;">
                    <span style="font-size: 24px; font-weight: bold; letter-spacing: 3px; color: #22c55e; font-family: monospace;">${data.redemptionCode}</span>
                  </div>
                  <p style="color: #22c55e; font-size: 20px; font-weight: bold; margin: 0;">${discountText}</p>
                </div>
              </div>

              <div style="background: #f8fafc; border-radius: 10px; padding: 20px; margin: 0 0 30px 0;">
                <h4 style="color: #333; margin: 0 0 15px 0; font-size: 14px;">👤 Customer Details</h4>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #666; padding: 8px 0;">Name:</td>
                    <td style="color: #333; font-weight: bold; text-align: right;">${data.userName}</td>
                  </tr>
                  <tr>
                    <td style="color: #666; padding: 8px 0;">Email:</td>
                    <td style="color: #333; font-weight: bold; text-align: right;">${data.userEmail}</td>
                  </tr>
                  <tr>
                    <td style="color: #666; padding: 8px 0; border-top: 1px solid #e5e7eb;">Used At:</td>
                    <td style="color: #22c55e; font-weight: bold; text-align: right;">${usedAtFormatted}</td>
                  </tr>
                </table>
              </div>

              <div style="background: #fef3c7; border-radius: 10px; padding: 15px; margin: 0 0 20px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  ✅ <strong>Voucher Status:</strong> Successfully redeemed and marked as used.
                </p>
              </div>

              <p style="color: #999; font-size: 14px; margin: 0;">
                The customer has been notified and provided with the redemption code. Please honor the discount when they present this code.
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p style="margin: 0;">© 2025 Sirkula. All rights reserved.</p>
              <p style="margin: 5px 0 0 0;">Making every green action count! 🌍</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Send leaderboard reward email to winner
   * @param {string} email - Winner email address
   * @param {object} rewardData - Reward details
   * @returns {Promise<void>}
   */
  async sendLeaderboardRewardEmail(
    email: string,
    rewardData: {
      userName: string;
      rank: 1 | 2 | 3;
      todayPoints: number;
      bonusPoints: number;
      newTotalPoints: number;
      date: Date;
    },
  ): Promise<void> {
    const html = this.getLeaderboardRewardHtml(rewardData);

    try {
      await this.transporter.sendMail({
        from: `"Sirkula" <${this.configService.emailUser}>`,
        to: email,
        subject: `🏆 Sirkula - Congratulations! You're #${rewardData.rank} Today!`,
        html,
      });

      if (this.configService.isDevelopment) {
        console.log(`🏆 [DEV] Leaderboard reward email sent to ${email}`);
      }
    } catch (error) {
      console.error('Leaderboard reward email error:', error);
    }
  }

  /**
   * Get leaderboard reward email HTML template
   * @param {object} data - Reward data
   * @returns {string} HTML email content
   */
  private getLeaderboardRewardHtml(data: {
    userName: string;
    rank: 1 | 2 | 3;
    todayPoints: number;
    bonusPoints: number;
    newTotalPoints: number;
    date: Date;
  }): string {
    const rankEmoji = { 1: '🥇', 2: '🥈', 3: '🥉' };
    const rankText = { 1: '1st Place', 2: '2nd Place', 3: '3rd Place' };
    const rankColor = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };

    const dateFormatted = data.date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Leaderboard Reward - Sirkula</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🏆 Daily Champion!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">${dateFormatted}</p>
            </div>
            
            <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <p style="color: #666; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                Hi <strong>${data.userName}</strong>! 👋
              </p>
              <p style="color: #666; line-height: 1.6; margin: 0 0 30px 0;">
                Amazing work! You've made it to the top of today's leaderboard!
              </p>
              
              <div style="background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%); border: 3px solid ${rankColor[data.rank]}; border-radius: 15px; padding: 30px; margin: 0 0 30px 0; text-align: center;">
                <div style="font-size: 60px; margin: 0 0 10px 0;">${rankEmoji[data.rank]}</div>
                <h2 style="color: #333; margin: 0 0 10px 0; font-size: 28px;">${rankText[data.rank]}</h2>
                <p style="color: #666; margin: 0; font-size: 14px;">Daily Leaderboard</p>
              </div>

              <div style="background: #f0fdf4; border-radius: 15px; padding: 25px; margin: 0 0 30px 0;">
                <h3 style="color: #166534; margin: 0 0 20px 0; font-size: 16px; text-align: center;">🎁 Your Reward</h3>
                <div style="background: white; border-radius: 10px; padding: 20px; text-align: center;">
                  <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; font-size: 36px; font-weight: bold; padding: 20px; border-radius: 10px; margin: 0 0 15px 0;">
                    +${data.bonusPoints} pts
                  </div>
                  <p style="color: #666; margin: 0; font-size: 14px;">Bonus Points Added!</p>
                </div>
              </div>

              <div style="background: #f8fafc; border-radius: 10px; padding: 20px; margin: 0 0 30px 0;">
                <h4 style="color: #333; margin: 0 0 15px 0; font-size: 14px;">📊 Points Summary</h4>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #666; padding: 8px 0;">Today's Points:</td>
                    <td style="color: #333; font-weight: bold; text-align: right;">${data.todayPoints} pts</td>
                  </tr>
                  <tr>
                    <td style="color: #666; padding: 8px 0; border-top: 1px solid #e5e7eb;">Bonus Reward:</td>
                    <td style="color: #22c55e; font-weight: bold; text-align: right;">+${data.bonusPoints} pts</td>
                  </tr>
                  <tr>
                    <td style="color: #666; padding: 8px 0; border-top: 2px solid #22c55e;">New Total:</td>
                    <td style="color: #22c55e; font-weight: bold; font-size: 18px; text-align: right;">${data.newTotalPoints} pts</td>
                  </tr>
                </table>
              </div>

              <p style="color: #999; font-size: 14px; margin: 0; text-align: center;">
                Keep up the amazing green actions! 🌱<br>
                Tomorrow is a new chance to be #1!
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p style="margin: 0;">© 2025 Sirkula. All rights reserved.</p>
              <p style="margin: 5px 0 0 0;">Making every green action count! 🌍</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
