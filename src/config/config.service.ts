/**
 * @fileoverview Application configuration service
 * @description Wrapper for @nestjs/config providing type-safe access to environment variables
 */

import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

/**
 * Configuration service for accessing environment variables
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly configService: NestConfigService) {}

  /**
   * Get environment variable value with type safety
   * @template T - Type of the value
   * @param {string} key - Environment variable key
   * @param {T} [defaultValue] - Default value if not found
   * @returns {T} Environment variable value
   */
  get<T = string>(key: string, defaultValue?: T): T {
    return this.configService.get<T>(key, defaultValue as T);
  }

  /**
   * Get database connection URL
   * @returns {string} DATABASE_URL environment variable
   */
  get databaseUrl(): string {
    return this.get<string>('DATABASE_URL', '');
  }

  /**
   * Get application port
   * @returns {number} PORT environment variable, defaults to 3000
   */
  get port(): number {
    return this.get<number>('PORT', 3000);
  }

  /**
   * Get current environment
   * @returns {string} NODE_ENV value
   */
  get nodeEnv(): string {
    return this.get<string>('NODE_ENV', 'development');
  }

  /**
   * Check if running in production
   * @returns {boolean} True if NODE_ENV is production
   */
  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  /**
   * Check if running in development
   * @returns {boolean} True if NODE_ENV is development
   */
  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  /**
   * Get JWT secret key
   * @returns {string} JWT_SECRET environment variable
   */
  get jwtSecret(): string {
    return this.get<string>('JWT_SECRET', 'default-secret-key');
  }

  /**
   * Get JWT expiration time
   * @returns {string} JWT_EXPIRES_IN environment variable
   */
  get jwtExpiresIn(): string {
    return this.get<string>('JWT_EXPIRES_IN', '7d');
  }

  /**
   * Get Google OAuth Client ID
   * @returns {string} GOOGLE_CLIENT_ID environment variable
   */
  get googleClientId(): string {
    return this.get<string>('GOOGLE_CLIENT_ID', '');
  }

  /**
   * Get Google OAuth Client Secret
   * @returns {string} GOOGLE_CLIENT_SECRET environment variable
   */
  get googleClientSecret(): string {
    return this.get<string>('GOOGLE_CLIENT_SECRET', '');
  }

  /**
   * Get Cloudinary Cloud Name
   * @returns {string} CLOUDINARY_CLOUD_NAME environment variable
   */
  get cloudinaryCloudName(): string {
    return this.get<string>('CLOUDINARY_CLOUD_NAME', '');
  }

  /**
   * Get Cloudinary API Key
   * @returns {string} CLOUDINARY_API_KEY environment variable
   */
  get cloudinaryApiKey(): string {
    return this.get<string>('CLOUDINARY_API_KEY', '');
  }

  /**
   * Get Cloudinary API Secret
   * @returns {string} CLOUDINARY_API_SECRET environment variable
   */
  get cloudinaryApiSecret(): string {
    return this.get<string>('CLOUDINARY_API_SECRET', '');
  }

  /**
   * Get Email User (Gmail address)
   * @returns {string} EMAIL_USER environment variable
   */
  get emailUser(): string {
    return this.get<string>('EMAIL_USER', '');
  }

  /**
   * Get Email App Password (16-digit Gmail app password)
   * @returns {string} EMAIL_APP_PASSWORD environment variable
   */
  get emailAppPassword(): string {
    return this.get<string>('EMAIL_APP_PASSWORD', '');
  }

  /**
   * Get Frontend URL for OAuth callback redirect
   * @returns {string} FRONTEND_URL environment variable
   */
  get frontendUrl(): string {
    return this.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  /**
   * Get Google OAuth callback path on frontend
   * @returns {string} GOOGLE_CALLBACK_PATH environment variable
   */
  get googleCallbackPath(): string {
    return this.get<string>('GOOGLE_CALLBACK_PATH', '/auth/callback');
  }

  /**
   * Get Google Gen AI API Key
   * @returns {string} GOOGLE_GENAI_API_KEY environment variable
   */
  get googleGenAiApiKey(): string {
    return this.get<string>('GOOGLE_GENAI_API_KEY', '');
  }

  /**
   * Get SHA Webhook Secret Key
   * @returns {string} SHA_WEBHOOK_SECRET environment variable
   */
  get shaWebhookSecret(): string {
    return this.get<string>('SHA_WEBHOOK_SECRET', '');
  }

  /**
   * Get API Documentation Username
   * @returns {string} API_DOCS_USERNAME environment variable
   */
  get apiDocsUsername(): string {
    return this.get<string>('API_DOCS_USERNAME', 'admin');
  }

  /**
   * Get API Documentation Password
   * @returns {string} API_DOCS_PASSWORD environment variable
   */
  get apiDocsPassword(): string {
    return this.get<string>('API_DOCS_PASSWORD', 'password');
  }
}
