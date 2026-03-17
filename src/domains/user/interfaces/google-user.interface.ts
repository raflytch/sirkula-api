/**
 * @fileoverview Google user info interface
 * @description Interface for Google OAuth user information
 */

/**
 * Google user info from OAuth
 */
export interface IGoogleUserInfo {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  emailVerified: boolean;
}
