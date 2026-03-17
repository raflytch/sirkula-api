/**
 * @fileoverview Google OAuth Passport Strategy
 * @description Handles Google OAuth 2.0 authentication using Passport
 */

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { AppConfigService } from '../../config/config.service';
import { IGoogleUserInfo } from '../../domains/user/interfaces';

/**
 * Google OAuth Strategy using Passport
 * @description Validates Google OAuth tokens and extracts user info
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: AppConfigService) {
    super({
      clientID: configService.googleClientId,
      clientSecret: configService.googleClientSecret,
      callbackURL: '/api/users/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  /**
   * Validate Google OAuth callback and extract user info
   * @param {string} accessToken - Google access token
   * @param {string} refreshToken - Google refresh token
   * @param {Profile} profile - Google user profile
   * @param {VerifyCallback} done - Passport verify callback
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const { id, name, emails, photos } = profile;

    const user: IGoogleUserInfo = {
      googleId: id,
      email: emails?.[0]?.value || '',
      name: name?.givenName
        ? `${name.givenName} ${name.familyName || ''}`.trim()
        : emails?.[0]?.value?.split('@')[0] || 'User',
      avatarUrl: photos?.[0]?.value,
      emailVerified: emails?.[0]?.verified ?? true,
    };

    done(null, user);
  }
}
